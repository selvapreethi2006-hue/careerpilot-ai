import React, { useState, useEffect } from 'react';
import {
  FileText,
  Target,
  Mail,
  Briefcase,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Clock,
  Calendar,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Zap,
  BookOpen,
  Globe2,
  Mic,
  DollarSign,
  Compass,
  Code2,
  Send,
  Layers,
  Activity,
  Flame,
  BarChart3,
  Database,
  RefreshCw,
} from 'lucide-react';
import {
  UserProfile,
  JobApplication,
  ResumeAnalysisResult,
  RemotiveJob,
  SkillGapResult,
  MockInterviewSession,
  LearningRoadmapResult,
  EngagementSummary,
  FeatureUsageLog,
} from '../types';
import { storage } from '../lib/storage';
import { fetchCloudFeatureUsage, fetchRecentUsageLogs } from '../lib/supabase';

interface UserDashboardProps {
  currentUser: UserProfile;
  onNavigate: (page: string) => void;
  onSelectApplicationForPrep: (app: JobApplication) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  currentUser,
  onNavigate,
  onSelectApplicationForPrep,
}) => {
  const applications = storage.getApplications(currentUser.id);
  const savedResumes = storage.getSavedResumes(currentUser.id);
  const savedMatches = storage.getSavedMatches(currentUser.id);
  const savedSkillGaps = storage.getSkillGapAnalyses(currentUser.id);
  const savedInterviews = storage.getMockInterviewSessions(currentUser.id);
  const savedRoadmaps = storage.getLearningRoadmaps(currentUser.id);

  const [recommendedJobs, setRecommendedJobs] = useState<RemotiveJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState<boolean>(true);

  // Feature usage & engagement state (backed by Supabase table public.feature_usage)
  const [engagement, setEngagement] = useState<EngagementSummary>(() =>
    storage.getEngagementSummary(currentUser.id)
  );
  const [recentLogs, setRecentLogs] = useState<FeatureUsageLog[]>(() =>
    storage.getUsageLogs(currentUser.id).slice(0, 5)
  );
  const [isSyncingUsage, setIsSyncingUsage] = useState<boolean>(false);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);

  const loadUsageLogs = async () => {
    setIsSyncingUsage(true);
    try {
      // Specifically fetch the last 5 recent usage logs from the Supabase feature_usage table
      const cloudRecent = await fetchRecentUsageLogs(currentUser.id, 5);
      const allCloudLogs = await fetchCloudFeatureUsage(currentUser.id, 100);
      const summary = storage.getEngagementSummary(currentUser.id, allCloudLogs);
      setEngagement(summary);

      if (cloudRecent.length > 0) {
        setRecentLogs(cloudRecent);
        setIsCloudSynced(true);
      } else if (summary.recentLogs.length > 0) {
        setRecentLogs(summary.recentLogs.slice(0, 5));
      }
    } catch (e) {
      console.warn('Failed to fetch cloud usage logs', e);
      const fallback = storage.getUsageLogs(currentUser.id).slice(0, 5);
      setRecentLogs(fallback);
    } finally {
      setIsSyncingUsage(false);
    }
  };

  useEffect(() => {
    loadUsageLogs();
  }, [currentUser.id]);

  // Fetch live synchronized jobs for dashboard preview
  useEffect(() => {
    fetch('/api/jobs/remotive?search=' + encodeURIComponent(currentUser.targetRole || 'Developer'))
      .then((r) => r.json())
      .then((data) => {
        if (data.jobs && Array.isArray(data.jobs)) {
          setRecommendedJobs(data.jobs.slice(0, 3));
        }
      })
      .catch((e) => console.warn('Could not load recommended jobs for dashboard', e))
      .finally(() => setJobsLoading(false));
  }, [currentUser.targetRole]);

  const activeApps = applications.filter((a) => a.status !== 'rejected');
  const interviews = applications.filter((a) => a.status === 'interviewing');
  const latestResume = savedResumes[0];
  const latestMatch = savedMatches[0];
  const latestSkillGap = savedSkillGaps[0];
  const latestRoadmap = savedRoadmaps[0];
  const latestInterview = savedInterviews[0];

  const atsScore = latestResume?.atsScore || 0;
  const matchScore = latestMatch?.overallMatchScore || 0;
  const skillGapScore = latestSkillGap?.skillMatchPercentage || 0;
  const interviewScore = latestInterview?.overallScore || 0;

  // Calculate Roadmap Progress
  const totalTasks =
    latestRoadmap?.weeklyModules.reduce((acc, m) => acc + m.dailyTasks.length, 0) || 0;
  const completedTasks =
    latestRoadmap?.weeklyModules.reduce(
      (acc, m) => acc + m.dailyTasks.filter((t) => t.completed).length,
      0
    ) || 0;
  const roadmapPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Composite Readiness Index
  let readinessScore = 20;
  if (atsScore > 0) readinessScore += Math.round(atsScore * 0.35);
  if (activeApps.length > 0) readinessScore += Math.min(20, activeApps.length * 5);
  if (interviewScore > 0) readinessScore += Math.round(interviewScore * 0.15);
  if (roadmapPct > 0) readinessScore += Math.round(roadmapPct * 0.15);
  readinessScore = Math.min(98, Math.max(20, readinessScore));

  const upcomingInterviews = applications.filter(
    (a) => a.status === 'interviewing' || a.interviewDate
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Welcome Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0e121b] via-[#131826] to-[#0e121b] border border-[#1e2638] shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-36 -bottom-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <img
            src={
              currentUser.avatarUrl ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                currentUser.name
              )}`
            }
            alt={currentUser.name}
            className="w-14 h-14 rounded-xl object-cover border-2 border-violet-500/50 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Welcome back, {currentUser.name}
              </h1>
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300">
                100% Free Public Edition
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Target Role: <strong className="text-slate-200">{currentUser.targetRole || 'Software Professional'}</strong> · {currentUser.universityOrCompany || 'Global Candidate'}
            </p>
          </div>
        </div>

        {/* Fast Action CTA */}
        <div className="flex items-center gap-2 relative z-10">
          <button
            onClick={() => onNavigate('career-mentor')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 flex items-center gap-2 transition-all shadow-md shadow-violet-900/30"
          >
            <Compass className="w-4 h-4 text-cyan-300" />
            <span>Ask Career Mentor AI</span>
          </button>
        </div>
      </div>

      {/* Metrics & Readiness Index Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Composite Readiness Card */}
        <div className="p-5 rounded-2xl bg-[#0e121b] border border-[#1e2638] flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
              Readiness Index
            </span>
            <div className="text-2xl font-extrabold text-white font-mono mt-1">
              {readinessScore}
              <span className="text-xs text-cyan-400 font-normal"> / 100</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {readinessScore >= 80 ? 'Highly Competitive' : 'Moderate Alignment'}
            </p>
          </div>
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800 stroke-current"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-cyan-400 stroke-current"
                strokeDasharray={`${readinessScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-mono text-xs font-bold text-white">
              {readinessScore}%
            </span>
          </div>
        </div>

        {/* ATS Resume Score Card */}
        <div
          onClick={() => onNavigate('resume-analyzer')}
          className="p-5 rounded-2xl bg-[#0e121b] border border-[#1e2638] hover:border-slate-700 cursor-pointer transition-all shadow-lg flex items-center justify-between group"
        >
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
              Resume ATS Score
            </span>
            <div className="text-2xl font-extrabold text-white font-mono mt-1">
              {atsScore > 0 ? (
                <>
                  {atsScore}
                  <span className="text-xs text-emerald-400 font-normal"> / 100</span>
                </>
              ) : (
                <span className="text-sm font-sans font-medium text-slate-500">Not Audited</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 group-hover:text-cyan-400 transition-colors">
              <span>{savedResumes.length} saved audits</span>
              <ChevronRight className="w-3 h-3" />
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-violet-950/60 border border-violet-800/60 flex items-center justify-center text-cyan-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Learning Roadmap Progress Card */}
        <div
          onClick={() => onNavigate('learning-roadmap')}
          className="p-5 rounded-2xl bg-[#0e121b] border border-[#1e2638] hover:border-slate-700 cursor-pointer transition-all shadow-lg flex items-center justify-between group"
        >
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
              Curriculum Progress
            </span>
            <div className="text-2xl font-extrabold text-white font-mono mt-1">
              {latestRoadmap ? (
                <>
                  {roadmapPct}%
                  <span className="text-xs text-cyan-400 font-normal"> done</span>
                </>
              ) : (
                <span className="text-sm font-sans font-medium text-slate-500">Not Started</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 group-hover:text-cyan-400 transition-colors">
              <span>{completedTasks} tasks completed</span>
              <ChevronRight className="w-3 h-3" />
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-violet-950/60 border border-violet-800/60 flex items-center justify-center text-cyan-400">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Mock Interview Score Card */}
        <div
          onClick={() => onNavigate('mock-interviews')}
          className="p-5 rounded-2xl bg-[#0e121b] border border-[#1e2638] hover:border-slate-700 cursor-pointer transition-all shadow-lg flex items-center justify-between group"
        >
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
              Interview Evaluation
            </span>
            <div className="text-2xl font-extrabold text-white font-mono mt-1">
              {interviewScore > 0 ? (
                <>
                  {interviewScore}%
                  <span className="text-xs text-cyan-400 font-normal"> avg</span>
                </>
              ) : (
                <span className="text-sm font-sans font-medium text-slate-500">No Sessions</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 group-hover:text-cyan-400 transition-colors">
              <span>{savedInterviews.length} sessions logged</span>
              <ChevronRight className="w-3 h-3" />
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-violet-950/60 border border-violet-800/60 flex items-center justify-center text-cyan-400">
            <Mic className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Career Platform Suite Launchpad (All 12 Modules) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Unified AI Career Suite
            </h2>
            <p className="text-xs text-slate-400">
              Access every intelligent career development service tailored to your profile.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Career Mentor AI */}
          <div
            onClick={() => onNavigate('career-mentor')}
            className="p-5 rounded-2xl bg-[#0e121b] border border-[#1e2638] hover:border-cyan-500/60 cursor-pointer transition-all shadow-md group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-800 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                Career Mentor AI
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                24/7 personal career guidance in English, தமிழ் (Tamil), and Tanglish.
              </p>
            </div>
            <span className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1 mt-4">
              <span>Start Dialogue</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* 2. Resume Analyzer */}
          <div
            onClick={() => onNavigate('resume-analyzer')}
            className="p-5 rounded-2xl bg-[#0e121b] border border-[#1e2638] hover:border-cyan-500/60 cursor-pointer transition-all shadow-md group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-violet-950/70 border border-violet-800 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                Resume Analyzer
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Upload PDF/DOCX resumes for ATS scoring, bullet improvements, and grammar checks.
              </p>
            </div>
            <span className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1 mt-4">
              <span>Audit Resume</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* 3. Skill Gap Analyzer */}
          <div
            onClick={() => onNavigate('skill-gap')}
            className="p-5 rounded-2xl bg-[#0e121b] border border-[#1e2638] hover:border-cyan-500/60 cursor-pointer transition-all shadow-md group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-violet-950/70 border border-violet-800 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                Skill Gap Analyzer
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Benchmark qualifications against target roles to identify missing competencies.
              </p>
            </div>
            <span className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1 mt-4">
              <span>Detect Gaps</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* 4. Learning Roadmap */}
          <div
            onClick={() => onNavigate('learning-roadmap')}
            className="p-5 rounded-2xl bg-[#0e121b] border border-[#1e2638] hover:border-cyan-500/60 cursor-pointer transition-all shadow-md group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-violet-950/70 border border-violet-800 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                Learning Roadmap
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Personalized weekly schedule with verified documentation links and daily tasks.
              </p>
            </div>
            <span className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1 mt-4">
              <span>View Curriculum</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* 5. Mock Interview Platform */}
          <div
            onClick={() => onNavigate('mock-interviews')}
            className="p-5 rounded-2xl bg-[#0e121b] border border-[#1e2638] hover:border-cyan-500/60 cursor-pointer transition-all shadow-md group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-800 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                <Mic className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                Mock Interviews
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Practice technical & behavioral questions with browser voice input and model answers.
              </p>
            </div>
            <span className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1 mt-4">
              <span>Practice Now</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* 6. Job Matcher */}
          <div
            onClick={() => onNavigate('job-matcher')}
            className="p-5 rounded-2xl bg-[#0e121b] border border-[#1e2638] hover:border-cyan-500/60 cursor-pointer transition-all shadow-md group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-violet-950/70 border border-violet-800 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                JD Matcher
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Paste any job description to compute fit percentage and keyword alignment.
              </p>
            </div>
            <span className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1 mt-4">
              <span>Match Job</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* 7. Smart Application Assistant */}
          <div
            onClick={() => onNavigate('outreach-assistant')}
            className="p-5 rounded-2xl bg-[#0e121b] border border-[#1e2638] hover:border-cyan-500/60 cursor-pointer transition-all shadow-md group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-violet-950/70 border border-violet-800 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                <Send className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                Outreach Assistant
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Generate high-converting recruiter InMails and LinkedIn connection drafts.
              </p>
            </div>
            <span className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1 mt-4">
              <span>Draft Message</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* 8. AI Portfolio Builder */}
          <div
            onClick={() => onNavigate('portfolio-builder')}
            className="p-5 rounded-2xl bg-[#0e121b] border border-[#1e2638] hover:border-cyan-500/60 cursor-pointer transition-all shadow-md group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-800 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                Portfolio Builder
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Compile modern, responsive single-file websites ready to deploy for free.
              </p>
            </div>
            <span className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1 mt-4">
              <span>Build Portfolio</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* 9. AI Salary Insights */}
          <div
            onClick={() => onNavigate('salary-insights')}
            className="p-5 rounded-2xl bg-[#0e121b] border border-[#1e2638] hover:border-cyan-500/60 cursor-pointer transition-all shadow-md group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-800 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                Salary Insights
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Benchmark compensation ranges for India and global tech metros.
              </p>
            </div>
            <span className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1 mt-4">
              <span>Explore Bands</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* 10. Cover Letter Generator */}
          <div
            onClick={() => onNavigate('cover-letter')}
            className="p-5 rounded-2xl bg-[#0e121b] border border-[#1e2638] hover:border-cyan-500/60 cursor-pointer transition-all shadow-md group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-violet-950/70 border border-violet-800 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                Cover Letter
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Tailor persuasive letters addressing specific company values and requirements.
              </p>
            </div>
            <span className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1 mt-4">
              <span>Write Letter</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* 11. Find Remote Jobs */}
          <div
            onClick={() => onNavigate('jobs')}
            className="p-5 rounded-2xl bg-[#0e121b] border border-[#1e2638] hover:border-cyan-500/60 cursor-pointer transition-all shadow-md group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-800 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                <Globe2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                Remote Jobs
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Real vacancies synchronized from Remotive with fresher filters and daily auto-updates.
              </p>
            </div>
            <span className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1 mt-4">
              <span>Find Openings</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* 12. Application Tracker */}
          <div
            onClick={() => onNavigate('tracker')}
            className="p-5 rounded-2xl bg-[#0e121b] border border-[#1e2638] hover:border-cyan-500/60 cursor-pointer transition-all shadow-md group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-violet-950/70 border border-violet-800 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                Job Tracker
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Kanban pipeline for managing active applications, stages, and interview dates.
              </p>
            </div>
            <span className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1 mt-4">
              <span>Open Pipeline</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Feature Usage & Engagement Activity (Supabase public.feature_usage_logs) */}
      <div className="space-y-4 p-6 rounded-2xl bg-[#0e121b] border border-[#1e2638] shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/20 to-cyan-500/20 border border-violet-500/40 flex items-center justify-center text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Core Feature Usage & Engagement
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-violet-950/70 border border-violet-700/60 text-violet-300">
                  Supabase RLS Table
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Audit trail and engagement telemetry tracked under your verified user ID.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Engagement Tier Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-violet-950/80 to-indigo-950/80 border border-violet-800 text-xs font-semibold text-violet-200">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>{engagement.engagementTier}</span>
            </div>

            {/* Cloud Sync Status */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#131826] border border-[#1e2638] text-[11px] text-slate-300">
              <Database className="w-3 h-3 text-cyan-400" />
              <span className="font-mono text-[10px] text-slate-400">
                {isCloudSynced ? 'Synced' : 'Active'}
              </span>
              <button
                onClick={loadUsageLogs}
                disabled={isSyncingUsage}
                title="Refresh Supabase Usage Logs"
                className="p-1 text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingUsage ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* 4 Feature Usage Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* 1. Resume Analyses */}
          <div
            onClick={() => onNavigate('resume-analyzer')}
            className="p-4 rounded-xl bg-[#131826]/70 border border-[#1e2638] hover:border-cyan-500/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Resumes Analyzed</span>
              <FileText className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">
                {engagement.resumeAnalysesCount}
              </span>
              <span className="text-[11px] text-cyan-400 font-semibold group-hover:underline flex items-center gap-0.5">
                Analyze <ChevronRight className="w-2.5 h-2.5" />
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {engagement.resumeAnalysesCount === 0
                ? 'No PDFs scanned yet'
                : `${engagement.resumeAnalysesCount} deep ATS audits run`}
            </p>
          </div>

          {/* 2. Job Applications */}
          <div
            onClick={() => onNavigate('tracker')}
            className="p-4 rounded-xl bg-[#131826]/70 border border-[#1e2638] hover:border-indigo-500/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Jobs Tracked</span>
              <Briefcase className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">
                {engagement.jobApplicationsCount}
              </span>
              <span className="text-[11px] text-indigo-400 font-semibold group-hover:underline flex items-center gap-0.5">
                Pipeline <ChevronRight className="w-2.5 h-2.5" />
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {engagement.jobApplicationsCount === 0
                ? 'No pipeline entries yet'
                : `${engagement.jobApplicationsCount} applications recorded`}
            </p>
          </div>

          {/* 3. Skill Gap Analyses */}
          <div
            onClick={() => onNavigate('skill-gap')}
            className="p-4 rounded-xl bg-[#131826]/70 border border-[#1e2638] hover:border-violet-500/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Skill Gap Audits</span>
              <Target className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">
                {engagement.skillGapsCount}
              </span>
              <span className="text-[11px] text-violet-400 font-semibold group-hover:underline flex items-center gap-0.5">
                Evaluate <ChevronRight className="w-2.5 h-2.5" />
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {engagement.skillGapsCount === 0
                ? 'No audits recorded'
                : `${engagement.skillGapsCount} career role comparisons`}
            </p>
          </div>

          {/* 4. Mock Interviews */}
          <div
            onClick={() => onNavigate('mock-interviews')}
            className="p-4 rounded-xl bg-[#131826]/70 border border-[#1e2638] hover:border-amber-500/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Mock Interviews</span>
              <Mic className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">
                {engagement.mockInterviewsCount}
              </span>
              <span className="text-[11px] text-amber-400 font-semibold group-hover:underline flex items-center gap-0.5">
                Practice <ChevronRight className="w-2.5 h-2.5" />
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {engagement.mockInterviewsCount === 0
                ? 'No simulations completed'
                : `${engagement.mockInterviewsCount} live interview rounds`}
            </p>
          </div>
        </div>

        {/* Activity Velocity Chart & Recent Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
          {/* Left: 7-Day Velocity Chart */}
          <div className="lg:col-span-7 p-4 rounded-xl bg-[#131826]/50 border border-[#1e2638] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                  7-Day Feature Activity Velocity
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Total Actions: <strong className="text-cyan-300 font-bold">{engagement.totalActions}</strong>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-4">
                Daily frequency of resume checks, job additions, and AI evaluations.
              </p>
            </div>

            {/* Bars */}
            <div className="flex items-end justify-between gap-2 pt-2 px-1 h-36 border-b border-[#1e2638]">
              {engagement.weeklyActivity.map((day, idx) => {
                const maxCount = Math.max(1, ...engagement.weeklyActivity.map((d) => d.count));
                const heightPercent = day.count > 0 ? Math.max(18, Math.round((day.count / maxCount) * 100)) : 6;
                const isToday = idx === engagement.weeklyActivity.length - 1;

                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end">
                    <span
                      className={`text-[10px] font-mono transition-opacity ${
                        day.count > 0 ? 'text-cyan-300 font-bold opacity-100' : 'text-slate-600 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {day.count}
                    </span>
                    <div className="w-full max-w-[28px] h-24 flex items-end">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          day.count > 0
                            ? 'bg-gradient-to-t from-violet-600 to-cyan-400 shadow-md shadow-cyan-500/20'
                            : 'bg-slate-800/60 group-hover:bg-slate-700/60'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-mono uppercase pb-1 ${
                        isToday ? 'text-cyan-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {day.dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 text-[11px] text-slate-500">
              <span className="font-mono">
                Table: <span className="text-slate-400">public.feature_usage_logs</span>
              </span>
              <span className="font-mono">
                User: <span className="text-slate-400">{currentUser.id.slice(0, 8)}...</span>
              </span>
            </div>
          </div>

          {/* Right: Recent Activity Log Feed (Last 5 Supabase feature_usage events) */}
          <div className="lg:col-span-5 p-4 rounded-xl bg-[#131826]/50 border border-[#1e2638] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Recent Activity Stream (Last 5 Events)
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                  feature_usage
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Live chronological snapshot of your 5 most recent actions.
              </p>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[195px] pr-1">
              {recentLogs && recentLogs.length > 0 ? (
                recentLogs.slice(0, 5).map((log) => {
                  const logDate = new Date(log.createdAt);
                  const formattedTime = !isNaN(logDate.getTime())
                    ? logDate.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Recent';

                  const detailText =
                    log.actionDescription ||
                    (log.metadata?.action_description as string) ||
                    (log.metadata?.role && log.metadata?.company
                      ? `${log.metadata.role} at ${log.metadata.company}`
                      : log.metadata?.company
                      ? `Application for ${log.metadata.company}`
                      : log.metadata?.score
                      ? `ATS Score: ${log.metadata.score}/100`
                      : log.metadata?.targetRole
                      ? `Target: ${log.metadata.targetRole}`
                      : 'Completed action');

                  return (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-[#0e121b] border border-[#1e2638] hover:border-slate-700 transition-colors flex items-start gap-2.5 text-xs"
                    >
                      <div className="mt-0.5 p-1 rounded-md bg-violet-950/60 border border-violet-800 text-cyan-400 shrink-0">
                        {log.featureName === 'resume_analysis' && <FileText className="w-3.5 h-3.5" />}
                        {log.featureName === 'job_application' && <Briefcase className="w-3.5 h-3.5" />}
                        {log.featureName === 'skill_gap_analysis' && <Target className="w-3.5 h-3.5" />}
                        {log.featureName === 'mock_interview' && <Mic className="w-3.5 h-3.5" />}
                        {log.featureName === 'cover_letter' && <Mail className="w-3.5 h-3.5" />}
                        {!['resume_analysis', 'job_application', 'skill_gap_analysis', 'mock_interview', 'cover_letter'].includes(
                          log.featureName
                        ) && <Activity className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-white capitalize text-[11px] truncate">
                            {log.featureName.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">
                            {formattedTime}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {detailText}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-lg bg-[#0e121b] border border-dashed border-[#1e2638] text-center space-y-1">
                  <Activity className="w-5 h-5 text-slate-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-300">No Feature Activity Yet</p>
                  <p className="text-[11px] text-slate-500">
                    Run a Resume ATS Analysis or track an application to log your first event in Supabase.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <span className="text-[10px] text-slate-500 font-mono">
                Persistent across devices via Supabase
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Recommended Jobs & Application Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recommended Jobs (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-cyan-400" />
              Synchronized Remote Openings
            </h3>
            <button
              onClick={() => onNavigate('jobs')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {jobsLoading ? (
              <div className="p-8 rounded-2xl bg-[#0e121b] border border-[#1e2638] text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-violet-500/20 border-t-cyan-400 animate-spin" />
                <span>Checking latest job synchronizations...</span>
              </div>
            ) : recommendedJobs.length > 0 ? (
              recommendedJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 rounded-xl bg-[#0e121b] border border-[#1e2638] hover:border-slate-700 transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-white hover:text-cyan-400 transition-colors line-clamp-1">
                        {job.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {job.companyName} · {job.candidateRequiredLocation}
                      </p>
                    </div>
                    {job.salary && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800 shrink-0">
                        {job.salary}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-slate-500 font-mono">
                      {new Date(job.publicationDate).toLocaleDateString()}
                    </span>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                    >
                      <span>Apply on Remotive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 rounded-xl bg-[#0e121b] border border-[#1e2638] text-center text-xs text-slate-400">
                <span>No active jobs found for current filter. Browse the complete catalog in Remote Jobs.</span>
              </div>
            )}
          </div>
        </div>

        {/* Active Application Pipeline (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-cyan-400" />
              Active Job Applications ({activeApps.length})
            </h3>
            <button
              onClick={() => onNavigate('tracker')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
            >
              <span>Manage Pipeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {activeApps.length > 0 ? (
              activeApps.slice(0, 3).map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-xl bg-[#0e121b] border border-[#1e2638] flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white block">{app.companyName}</span>
                    <span className="text-[11px] text-slate-400">{app.jobTitle}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono capitalize bg-violet-950/70 border border-violet-800 text-cyan-300">
                      {app.status}
                    </span>
                    <button
                      onClick={() => onSelectApplicationForPrep(app)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors"
                    >
                      Prep Interview
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 rounded-2xl bg-[#0e121b] border border-[#1e2638] text-center space-y-2">
                <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-white">No Active Applications Tracked</p>
                <p className="text-[11px] text-slate-400">
                  Track jobs from the Remote Jobs finder or add custom applications to monitor follow-ups.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
