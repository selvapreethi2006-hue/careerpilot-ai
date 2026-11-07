import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ChevronRight,
  Send,
  History,
  Clock,
  Layers,
  HelpCircle,
  BarChart3,
  ThumbsUp,
  Lightbulb,
  UserCheck,
  Play,
  Square,
  Timer,
  Download,
  RefreshCw,
  Compass,
  MessageSquare,
  Share2,
  ArrowRight,
  Radio,
} from 'lucide-react';
import {
  UserProfile,
  MockInterviewSession,
  MockInterviewQuestion,
  InterviewDifficulty,
  InterviewCategory,
} from '../types';
import { storage } from '../lib/storage';
import { logFeatureUsageToCloud } from '../lib/supabase';

interface MockInterviewPlatformProps {
  currentUser: UserProfile;
  initialRole?: string;
  onNavigateToRoadmap?: () => void;
}

const ROLE_PRESETS = [
  'AI / Machine Learning Engineer',
  'Full Stack Developer',
  'Frontend React Engineer',
  'Python Backend Engineer',
  'Data Scientist',
  'DevOps / Cloud Engineer',
];

export const MockInterviewPlatform: React.FC<MockInterviewPlatformProps> = ({
  currentUser,
  initialRole = '',
  onNavigateToRoadmap,
}) => {
  const [targetRole, setTargetRole] = useState<string>(
    initialRole || currentUser.targetRole || 'Full Stack Developer'
  );
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('intermediate');
  const [category, setCategory] = useState<InterviewCategory>('technical');

  const [activeSession, setActiveSession] = useState<MockInterviewSession | null>(() => {
    const saved = storage.getMockInterviewSessions(currentUser.id);
    return saved[0] || null;
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isGeneratingFollowUp, setIsGeneratingFollowUp] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Follow-up question state
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);
  const [followUpIntent, setFollowUpIntent] = useState<string | null>(null);

  // Timer state for candidate response pacing
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);

  // Web Speech API: Voice Recording
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Web Speech API: Text-to-Speech (Interviewer Speaking)
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Timer interval
  useEffect(() => {
    let interval: any = null;
    if (isTimerActive) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerActive]);

  useEffect(() => {
    // Check speech recognition capability
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setUserAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleVoiceRecording = () => {
    if (!speechSupported || !recognitionRef.current) {
      setError('Voice input is not supported in this browser. Please type your response.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setIsTimerActive(false);
    } else {
      setError(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setIsTimerActive(true);
      } catch (e) {
        console.warn('Could not start speech recognition', e);
        setIsListening(false);
      }
    }
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleStartNewSession = async () => {
    setIsGenerating(true);
    setError(null);
    setCurrentQuestionIndex(0);
    setUserAnswer('');
    setFollowUpQuestion(null);
    setFollowUpIntent(null);
    setTimerSeconds(0);
    setIsTimerActive(false);

    try {
      const response = await fetch('/api/gemini/mock-interview/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole,
          difficulty,
          category,
          resumeText: storage.getMasterResumeText(currentUser.id),
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      const newSession: MockInterviewSession = {
        id: data.id || `session-${Date.now()}`,
        timestamp: new Date().toISOString(),
        targetRole,
        difficulty,
        category,
        questions: data.questions || [],
      };

      setActiveSession(newSession);
      storage.saveMockInterviewSession(newSession, currentUser.id);

      // Auto-read first question for realistic AI voice experience
      if (newSession.questions[0]?.question) {
        setTimeout(() => {
          speakText(newSession.questions[0].question);
        }, 400);
      }
    } catch (err: any) {
      console.error('Session generation failed:', err);
      setError('Could not generate interview questions. Please verify connection and retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEvaluateAnswer = async () => {
    if (!activeSession || !activeSession.questions[currentQuestionIndex]) return;
    const currentQ = activeSession.questions[currentQuestionIndex];

    if (!userAnswer.trim()) {
      setError('Please type or speak your answer before requesting evaluation.');
      return;
    }

    setIsEvaluating(true);
    setIsTimerActive(false);
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    setError(null);

    try {
      const response = await fetch('/api/gemini/mock-interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          userAnswer,
          targetRole: activeSession.targetRole,
          category: currentQ.category,
          difficulty: currentQ.difficulty,
          keyPointsToCover: currentQ.keyPointsToCover,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      // Update question with evaluation
      const updatedQuestions = [...activeSession.questions];
      updatedQuestions[currentQuestionIndex] = {
        ...currentQ,
        userAnswer,
        timeSpentSeconds: timerSeconds,
        followUpQuestion: followUpQuestion || undefined,
        evaluation: data.evaluation,
      };

      // Calculate aggregate session metrics
      const evaluatedQuestions = updatedQuestions.filter((q) => q.evaluation);
      const avgScore =
        evaluatedQuestions.length > 0
          ? Math.round(
              (evaluatedQuestions.reduce((acc, q) => acc + (q.evaluation?.scoreOutOf10 || 0), 0) /
                evaluatedQuestions.length) *
                10
            )
          : undefined;

      let hiringVerdict: 'Strong Hire' | 'Hire' | 'Leaning Hire' | 'Needs Practice' = 'Hire';
      if (avgScore !== undefined) {
        if (avgScore >= 85) hiringVerdict = 'Strong Hire';
        else if (avgScore >= 70) hiringVerdict = 'Hire';
        else if (avgScore >= 55) hiringVerdict = 'Leaning Hire';
        else hiringVerdict = 'Needs Practice';
      }

      const updatedSession: MockInterviewSession = {
        ...activeSession,
        questions: updatedQuestions,
        overallScore: avgScore,
        hiringVerdict,
        overallFeedback:
          avgScore && avgScore >= 75
            ? 'Strong technical articulation with solid domain awareness and systematic problem solving.'
            : 'Good foundational attempts; continue practicing trade-offs, quantitative metrics, and edge cases.',
        completedAt:
          evaluatedQuestions.length === updatedQuestions.length
            ? new Date().toISOString()
            : undefined,
      };

      setActiveSession(updatedSession);
      storage.saveMockInterviewSession(updatedSession, currentUser.id);

      // Log usage to local storage & Supabase cloud table public.feature_usage
      storage.addUsageLog(
        'mock_interview',
        `Answered Q${currentQuestionIndex + 1} for ${activeSession.targetRole} (${data.evaluation?.scoreOutOf10 || 7}/10)`,
        {
          role: activeSession.targetRole,
          score: data.evaluation?.scoreOutOf10,
          questionIndex: currentQuestionIndex + 1,
        },
        currentUser.id
      );

      logFeatureUsageToCloud(currentUser.id, 'mock_interview', {
        role: activeSession.targetRole,
        category: activeSession.category,
        difficulty: activeSession.difficulty,
        questionScore: data.evaluation?.scoreOutOf10,
        overallScore: avgScore,
        verdict: hiringVerdict,
      });
    } catch (err: any) {
      console.error('Evaluation failed:', err);
      setError('Could not evaluate response. Please retry.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleAskFollowUp = async () => {
    if (!activeSession || !activeSession.questions[currentQuestionIndex]) return;
    const currentQ = activeSession.questions[currentQuestionIndex];

    if (!userAnswer.trim()) {
      setError('Answer the main question first before requesting a dynamic follow-up.');
      return;
    }

    setIsGeneratingFollowUp(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/mock-interview/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          userAnswer,
          targetRole: activeSession.targetRole,
          category: currentQ.category,
          difficulty: currentQ.difficulty,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      setFollowUpQuestion(data.followUpQuestion);
      setFollowUpIntent(data.intent);

      // Speak the follow-up aloud
      if (data.followUpQuestion) {
        speakText(data.followUpQuestion);
      }
    } catch (err) {
      console.error('Follow-up request failed:', err);
      setError('Could not generate AI follow-up question. Please proceed to the next question.');
    } finally {
      setIsGeneratingFollowUp(false);
    }
  };

  const handleDownloadReport = () => {
    if (!activeSession) return;
    const reportContent = `
============================================================
CAREERPILOT AI — TECHNICAL & BEHAVIORAL INTERVIEW REPORT
Candidate: ${currentUser.name} (${currentUser.email})
Target Role: ${activeSession.targetRole}
Difficulty: ${activeSession.difficulty.toUpperCase()} | Round: ${activeSession.category.toUpperCase()}
Date: ${new Date(activeSession.timestamp).toLocaleString()}
Overall Score: ${activeSession.overallScore ? `${activeSession.overallScore}/100` : 'In Progress'}
Hiring Verdict: ${activeSession.hiringVerdict || 'In Progress'}
============================================================

QUESTIONS & DETAILED EVALUATIONS:

${activeSession.questions
  .map(
    (q, idx) => `
------------------------------------------------------------
QUESTION ${idx + 1}: ${q.question}
------------------------------------------------------------
[Interviewer Intent]: ${q.intent}
[Candidate Answer]: ${q.userAnswer || 'Not answered yet'}

${
  q.evaluation
    ? `
Scores:
- Overall Quality: ${q.evaluation.scoreOutOf10}/10
- Communication: ${q.evaluation.communicationScore}/10
- Technical Depth: ${q.evaluation.technicalAccuracyScore}/10

Demonstrated Strengths:
${q.evaluation.strengths.map((s) => `  * ${s}`).join('\n')}

Improvement Opportunities:
${q.evaluation.weaknesses.map((w) => `  * ${w}`).join('\n')}

Staff-Level Benchmark Answer:
${q.evaluation.modelAnswer}

Actionable Strategy Tip:
${q.evaluation.improvementTip}
`
    : '[Pending evaluation]'
}
`
  )
  .join('\n')}

============================================================
Generated by CareerPilot AI • Real Interview AI Platform
============================================================
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Interview_Scorecard_${activeSession.targetRole.replace(/\s+/g, '_')}_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const currentQ = activeSession?.questions[currentQuestionIndex];
  const savedSessions = storage.getMockInterviewSessions(currentUser.id);
  const isSessionComplete =
    activeSession?.questions.every((q) => q.evaluation !== undefined) &&
    activeSession.questions.length > 0;

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0e121b] via-[#131826] to-[#0e121b] border border-[#1e2638] shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-36 -bottom-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-violet-600/30 to-cyan-500/20 border border-violet-500/40 flex items-center justify-center text-cyan-400 shadow-md">
            <Mic className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Real Interview AI Room
              </h1>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                Live Speech & Gemini 3.8
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Experience an authentic interview simulation with continuous voice recognition, real-time AI follow-up drills, and Staff-level benchmark feedback.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          {activeSession && (
            <button
              onClick={handleDownloadReport}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-[#090b10] border border-[#1e2638] hover:border-slate-600 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Report</span>
            </button>
          )}

          {savedSessions.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#090b10] border border-[#1e2638] px-3 py-2 rounded-xl">
              <History className="w-4 h-4 text-violet-400" />
              <span>{savedSessions.length} Completed</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interviewer Studio & Setup (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Virtual AI Interviewer Persona Card */}
          <div className="p-5 rounded-2xl bg-[#0e121b] border border-[#1e2638] space-y-4 shadow-lg relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-700 to-cyan-500 p-0.5 shadow-md">
                  <div className="w-full h-full bg-[#090b10] rounded-[14px] flex items-center justify-center">
                    <UserCheck className="w-7 h-7 text-cyan-400" />
                  </div>
                </div>
                {/* Status Dot */}
                <span
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0e121b] flex items-center justify-center ${
                    isSpeaking
                      ? 'bg-cyan-500 animate-ping'
                      : isListening
                      ? 'bg-red-500 animate-pulse'
                      : isEvaluating
                      ? 'bg-violet-500 animate-spin'
                      : 'bg-emerald-500'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white">Alex Sterling</h3>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-violet-950/80 border border-violet-800 text-violet-300">
                    Lead Bar Raiser
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Virtual Principal Technical Hiring Lead
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                    <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                    {isSpeaking
                      ? 'Speaking question...'
                      : isListening
                      ? 'Listening to candidate...'
                      : isEvaluating
                      ? 'Evaluating your response...'
                      : 'Ready for question'}
                  </span>
                </div>
              </div>
            </div>

            {/* Audio Wave Visualizer Simulation */}
            <div className="h-8 rounded-xl bg-[#090b10] border border-[#1e2638] flex items-center justify-center gap-1 px-3">
              {[40, 75, 55, 90, 60, 30, 80, 45, 95, 70, 50, 85, 35, 65, 40].map((h, i) => (
                <div
                  key={i}
                  style={{
                    height: isSpeaking || isListening ? `${h}%` : '20%',
                    transition: 'height 0.15s ease',
                  }}
                  className={`w-1 rounded-full ${
                    isSpeaking
                      ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50'
                      : isListening
                      ? 'bg-red-400 shadow-sm shadow-red-400/50'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Configuration Card */}
          <div className="p-6 rounded-2xl bg-[#0e121b] border border-[#1e2638] space-y-4 shadow-lg">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Interview Parameters
            </h2>

            {/* Target Role Input */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Target Role
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. AI Engineer, React Developer, Backend Engineer"
                className="w-full bg-[#090b10] border border-[#1e2638] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
              />

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {ROLE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTargetRole(preset)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                      targetRole === preset
                        ? 'bg-cyan-950 border-cyan-700 text-cyan-300'
                        : 'bg-[#090b10] border-[#1e2638] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Interview Category */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Interview Round Focus
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InterviewCategory)}
                className="w-full bg-[#090b10] border border-[#1e2638] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value="technical">Round 1: Deep Technical & Architecture</option>
                <option value="system-design">Round 2: System Design & Scalability</option>
                <option value="behavioral">Round 3: Behavioral & Leadership (STAR Method)</option>
                <option value="role-specific">Round 4: Role-Specific Scenario Problem Solving</option>
                <option value="hr">Round 5: HR, Cultural & Work Style Alignment</option>
              </select>
            </div>

            {/* Difficulty Level */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Seniority Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['beginner', 'intermediate', 'advanced'] as InterviewDifficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-2 text-xs font-medium rounded-lg capitalize border transition-all ${
                      difficulty === d
                        ? 'bg-violet-950/80 border-cyan-500 text-cyan-300'
                        : 'bg-[#090b10] border-[#1e2638] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {d === 'beginner' ? 'Fresher' : d === 'intermediate' ? 'Mid-Level' : 'Senior / Lead'}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartNewSession}
              disabled={isGenerating}
              className="w-full py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 disabled:opacity-50 transition-all shadow-md shadow-violet-900/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <span>Synthesizing Real AI Interview...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>Start Live AI Interview Session</span>
                </>
              )}
            </button>
          </div>

          {/* Previous Session History */}
          {savedSessions.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#0e121b] border border-[#1e2638] space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wide">
                <History className="w-3.5 h-3.5 text-cyan-400" />
                Previous Interview Records
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {savedSessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setActiveSession(s);
                      setCurrentQuestionIndex(0);
                      setUserAnswer(s.questions[0]?.userAnswer || '');
                      setFollowUpQuestion(null);
                    }}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      activeSession?.id === s.id
                        ? 'bg-violet-950/40 border-violet-700 text-white'
                        : 'bg-[#090b10] border-[#1e2638] text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold truncate max-w-[150px]">{s.targetRole}</span>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">
                        {s.overallScore !== undefined ? `${s.overallScore}% Score` : 'In Progress'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span className="capitalize">{s.category}</span>
                      <span>{new Date(s.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Interview Room & Evaluation (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {activeSession && currentQ ? (
            <div className="p-6 rounded-2xl bg-[#0e121b] border border-[#1e2638] space-y-6 shadow-xl animate-in fade-in duration-200">
              {/* Question Navigation Ribbon */}
              <div className="flex items-center justify-between border-b border-[#1e2638] pb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Question {currentQuestionIndex + 1} of {activeSession.questions.length}
                  </span>
                  <span className="text-[11px] font-mono capitalize text-cyan-400">
                    [{currentQ.difficulty} · {currentQ.category}]
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {activeSession.questions.map((q, idx) => (
                    <button
                      key={q.id || idx}
                      onClick={() => {
                        setCurrentQuestionIndex(idx);
                        setUserAnswer(q.userAnswer || '');
                        setFollowUpQuestion(q.followUpQuestion || null);
                        setTimerSeconds(q.timeSpentSeconds || 0);
                        setIsTimerActive(false);
                      }}
                      className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-colors cursor-pointer ${
                        idx === currentQuestionIndex
                          ? 'bg-cyan-500 text-black font-extrabold shadow-md shadow-cyan-500/30'
                          : q.evaluation
                          ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                          : 'bg-[#090b10] border border-[#1e2638] text-slate-400 hover:text-white'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Card with Read Out Loud audio */}
              <div className="p-5 rounded-xl bg-[#090b10] border border-[#1e2638] space-y-3 relative group">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                    {currentQ.question}
                  </h3>
                  <button
                    onClick={() => speakText(currentQ.question)}
                    title={isSpeaking ? 'Stop speaking' : 'Read question out loud'}
                    className={`p-2 rounded-lg border transition-colors shrink-0 cursor-pointer ${
                      isSpeaking
                        ? 'bg-cyan-950 border-cyan-700 text-cyan-300 animate-pulse'
                        : 'bg-[#131826] border-[#1e2638] text-slate-400 hover:text-white'
                    }`}
                  >
                    {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                {currentQ.intent && (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
                    <HelpCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>
                      <strong className="text-slate-300">Interviewer Intent:</strong>{' '}
                      {currentQ.intent}
                    </span>
                  </p>
                )}
              </div>

              {/* Dynamic Follow-Up Question Drill-Down */}
              {followUpQuestion && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-violet-950/40 via-[#131826] to-cyan-950/40 border border-cyan-800/60 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 uppercase font-mono">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Interviewer Drill-Down Follow-Up
                    </span>
                    <button
                      onClick={() => speakText(followUpQuestion)}
                      className="p-1 rounded bg-[#090b10] text-cyan-400 hover:text-cyan-300"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                    "{followUpQuestion}"
                  </p>
                  {followUpIntent && (
                    <p className="text-[11px] text-slate-400 font-mono">
                      Target probe: {followUpIntent}
                    </p>
                  )}
                </div>
              )}

              {/* Answer Input Area with Voice Controls & Timer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      Your Response
                    </label>

                    {/* Timer Widget */}
                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-[#090b10] px-2 py-0.5 rounded border border-[#1e2638]">
                      <Timer className="w-3 h-3 text-cyan-400" />
                      <span>{formatTimer(timerSeconds)}</span>
                      <button
                        onClick={() => setIsTimerActive(!isTimerActive)}
                        className="ml-1 text-slate-400 hover:text-cyan-400"
                      >
                        {isTimerActive ? <Square className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                      </button>
                    </div>

                    {isListening && (
                      <span className="text-[10px] text-red-400 flex items-center gap-1 font-mono animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Live Recording...
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {speechSupported && (
                      <button
                        type="button"
                        onClick={toggleVoiceRecording}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          isListening
                            ? 'bg-red-950/80 border-red-700 text-red-300 shadow-md shadow-red-900/40'
                            : 'bg-[#131826] border-[#1e2638] text-cyan-400 hover:text-cyan-300'
                        }`}
                      >
                        {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                        <span>{isListening ? 'Stop Recording' : 'Voice Dictate'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  rows={5}
                  placeholder="Type or speak your structured answer here... (Tip: Structure with STAR for behavioral questions: Situation, Task, Action, Result. For technical, describe architecture, scalability trade-offs, and edge cases)."
                  className="w-full bg-[#090b10] border border-[#1e2638] focus:border-cyan-500 rounded-xl p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none leading-relaxed"
                />

                {error && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {error}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 font-mono">
                    {userAnswer.trim().split(/\s+/).filter(Boolean).length} words spoken/typed
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Ask Follow-up Question CTA */}
                    {userAnswer.trim().length > 30 && !followUpQuestion && (
                      <button
                        onClick={handleAskFollowUp}
                        disabled={isGeneratingFollowUp}
                        className="py-2.5 px-4 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/70 border border-cyan-800 hover:bg-cyan-900/50 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {isGeneratingFollowUp ? (
                          <>
                            <div className="w-3 h-3 rounded-full border-2 border-cyan-400/20 border-t-cyan-400 animate-spin" />
                            <span>Drilling deeper...</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Ask AI Follow-Up</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Submit Evaluation */}
                    <button
                      onClick={handleEvaluateAnswer}
                      disabled={isEvaluating || !userAnswer.trim()}
                      className="py-2.5 px-6 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 disabled:opacity-50 transition-all flex items-center gap-2 shadow-md shadow-violet-900/30 cursor-pointer"
                    >
                      {isEvaluating ? (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                          <span>Evaluating Answer...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit & Score Answer</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Evaluation Feedback Report */}
              {currentQ.evaluation && (
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#090b10] via-[#111624] to-[#090b10] border border-cyan-900/40 space-y-5 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1e2638] pb-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-cyan-400">
                        AI Evaluator Assessment
                      </span>
                      <h4 className="text-base font-bold text-white mt-0.5">
                        Performance Breakdown
                      </h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-violet-950/60 border border-violet-800 text-center min-w-[75px]">
                        <span className="text-[9px] text-slate-400 block uppercase">Overall</span>
                        <span className="font-mono text-base font-bold text-cyan-300">
                          {currentQ.evaluation.scoreOutOf10}/10
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#090b10] border border-[#1e2638] text-center min-w-[75px]">
                        <span className="text-[9px] text-slate-400 block uppercase">Comm</span>
                        <span className="font-mono text-base font-bold text-emerald-400">
                          {currentQ.evaluation.communicationScore}/10
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#090b10] border border-[#1e2638] text-center min-w-[75px]">
                        <span className="text-[9px] text-slate-400 block uppercase">Technical</span>
                        <span className="font-mono text-base font-bold text-amber-400">
                          {currentQ.evaluation.technicalAccuracyScore}/10
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 space-y-2">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                        <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                        Demonstrated Strengths
                      </span>
                      <ul className="space-y-1 text-xs text-slate-300">
                        {currentQ.evaluation.strengths.map((str, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-400">•</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/40 space-y-2">
                      <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        Improvement Opportunities
                      </span>
                      <ul className="space-y-1 text-xs text-slate-300">
                        {currentQ.evaluation.weaknesses.map((w, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-amber-400">•</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Staff-Level Benchmark Model Answer */}
                  <div className="p-4 rounded-xl bg-[#090b10] border border-[#1e2638] space-y-2">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wide">
                      <Award className="w-4 h-4 text-cyan-400" />
                      Staff-Level Benchmark Model Answer
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-950/80 p-3.5 rounded-lg border border-slate-900">
                      {currentQ.evaluation.modelAnswer}
                    </p>
                  </div>

                  {/* Actionable Strategy Tip */}
                  <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 flex items-center gap-2.5 text-xs text-cyan-200">
                    <Lightbulb className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>
                      <strong>Actionable Strategy:</strong> {currentQ.evaluation.improvementTip}
                    </span>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-500">
                      Evaluated with Gemini 3.8 Flash
                    </span>

                    {currentQuestionIndex < activeSession.questions.length - 1 ? (
                      <button
                        onClick={() => {
                          const nextIdx = currentQuestionIndex + 1;
                          setCurrentQuestionIndex(nextIdx);
                          setUserAnswer(activeSession.questions[nextIdx]?.userAnswer || '');
                          setFollowUpQuestion(activeSession.questions[nextIdx]?.followUpQuestion || null);
                          setTimerSeconds(0);
                          setIsTimerActive(false);
                          if (activeSession.questions[nextIdx]?.question) {
                            speakText(activeSession.questions[nextIdx].question);
                          }
                        }}
                        className="py-2 px-5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Next Question</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>All 5 Questions Evaluated!</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* End of Session Hiring Recommendation Card */}
              {isSessionComplete && (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#131826] to-cyan-950/40 border border-emerald-800/60 space-y-4 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-400">
                        <Award className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-emerald-400">
                          Interview Completed
                        </span>
                        <h4 className="text-lg font-extrabold text-white">
                          Final Hiring Recommendation
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase border ${
                          activeSession.hiringVerdict === 'Strong Hire'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            : activeSession.hiringVerdict === 'Hire'
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                            : 'bg-amber-950 text-amber-300 border-amber-700'
                        }`}
                      >
                        {activeSession.hiringVerdict}
                      </span>
                      <span className="font-mono text-xl font-black text-white">
                        {activeSession.overallScore}%
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {activeSession.overallFeedback}
                  </p>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleDownloadReport}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#090b10] border border-[#1e2638] hover:border-slate-600 transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Download Scorecard PDF/Text</span>
                    </button>

                    {onNavigateToRoadmap && (
                      <button
                        onClick={onNavigateToRoadmap}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 transition-all flex items-center gap-1.5"
                      >
                        <span>Bridge Skills on Roadmap</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Empty State */
            <div className="p-12 rounded-2xl bg-[#0e121b] border border-[#1e2638] text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/30 to-cyan-500/20 border border-violet-500/40 flex items-center justify-center text-cyan-400 mx-auto">
                <Mic className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Ready for Your Real AI Interview?</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed mt-1">
                  Configure your target role and seniority level on the left, then click{' '}
                  <strong className="text-slate-200">"Start Live AI Interview Session"</strong> to begin answering with real voice dictation or text.
                </p>
              </div>

              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={handleStartNewSession}
                  disabled={isGenerating}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-900/40"
                >
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>Launch Practice Room</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
