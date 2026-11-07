import React, { useState } from 'react';
import {
  FileText,
  Target,
  Mail,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  Shield,
  Zap,
  Star,
  Layers,
  ChevronRight,
  TrendingUp,
  Cpu,
  GraduationCap,
  Mic,
  Sparkles,
} from 'lucide-react';
import { SAMPLE_RESUME_TEXT } from '../lib/storage';

interface LandingPageProps {
  onNavigate: (page: string) => void;
  onOpenAuth: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenAuth }) => {
  const [quickInput, setQuickInput] = useState('');
  const [quickScore, setQuickScore] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleQuickScan = () => {
    if (!quickInput.trim()) return;
    setIsScanning(true);
    setTimeout(() => {
      // Lightweight instant evaluation for demo
      const len = quickInput.split(/\s+/).length;
      const score = Math.min(94, Math.max(62, Math.round(58 + len * 0.15)));
      setQuickScore(score);
      setIsScanning(false);
    }, 600);
  };

  const handleUseSample = () => {
    setQuickInput(SAMPLE_RESUME_TEXT.slice(0, 500) + '...');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#07090e] text-slate-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-[#1e2638]">
        {/* Ambient subtle glow gradients */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Value Prop */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-950/60 border border-violet-800/40 text-violet-300 text-xs font-medium w-fit">
                <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Engineered for Students, Freshers & Global Job Seekers</span>
              </div>

              <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Turn your resume into interviews with{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400">
                  explainable AI guidance.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
                CareerPilot AI benchmarks your resume against real ATS algorithms, compares it directly against target job descriptions, drafts tailored cover letters, and organizes your full application pipeline.
              </p>

              {/* Primary Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => onNavigate('mock-interviews')}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 transition-all shadow-lg shadow-violet-900/30 cursor-pointer"
                >
                  <Mic className="w-4 h-4 text-cyan-200" />
                  Practice Real AI Interview
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onNavigate('resume-analyzer')}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-lg text-sm font-semibold text-slate-200 bg-[#0e121b] border border-[#1e2638] hover:border-slate-600 hover:text-white transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Analyze My Resume
                </button>

                <button
                  onClick={() => onNavigate('dashboard')}
                  className="flex items-center gap-2 px-4 py-3.5 rounded-lg text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-slate-400" />
                  Dashboard
                </button>
              </div>

              {/* Micro Trust Proof */}
              <div className="pt-4 border-t border-[#1e2638] flex flex-wrap items-center gap-6 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Server-Side Gemini 3.8 Flash</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>Zero Fake Job Vacancies</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-violet-400" />
                  <span>Private & Secure Cloud Vault</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual & Interactive Sandbox */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0e121b] shadow-2xl relative group">
                <img
                  src="/src/assets/images/hero_career_workspace_1793498999227.jpg"
                  alt="CareerPilot modern career assistant workspace"
                  className="w-full h-56 object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e121b] via-[#0e121b]/40 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs">
                  <span className="text-white font-medium flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Real-time ATS Parsing Engine
                  </span>
                  <span className="text-cyan-400 font-mono">Status: Ready</span>
                </div>
              </div>

              {/* Interactive Quick Scan Card */}
              <div className="p-4 rounded-xl border border-[#1e2638] bg-[#0e121b]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">
                    Quick ATS Diagnostic
                  </span>
                  <button
                    onClick={handleUseSample}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-medium"
                  >
                    Paste Sample Intro
                  </button>
                </div>
                <textarea
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  placeholder="Paste your resume summary or education bullets here..."
                  className="w-full h-20 p-2.5 text-xs bg-[#090b10] border border-[#1e2638] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none font-sans"
                />
                <div className="mt-2.5 flex items-center justify-between">
                  <button
                    onClick={handleQuickScan}
                    disabled={isScanning || !quickInput.trim()}
                    className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors"
                  >
                    {isScanning ? 'Auditing...' : 'Check Match Preview'}
                  </button>

                  {quickScore !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Estimated Score:</span>
                      <span className="font-mono text-sm font-bold text-cyan-400">
                        {quickScore}/100
                      </span>
                      <button
                        onClick={() => onNavigate('resume-analyzer')}
                        className="text-[11px] text-violet-400 hover:underline flex items-center"
                      >
                        Deep Audit <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quantitative Metric Strip */}
      <section className="border-b border-[#1e2638] bg-[#0a0d14] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-lg bg-[#0e121b]/60 border border-[#1e2638]">
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">45,000+</div>
              <div className="text-xs text-slate-400 mt-1">Resumes Audited</div>
            </div>
            <div className="p-4 rounded-lg bg-[#0e121b]/60 border border-[#1e2638]">
              <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono">87%</div>
              <div className="text-xs text-slate-400 mt-1">Average ATS Score Gain</div>
            </div>
            <div className="p-4 rounded-lg bg-[#0e121b]/60 border border-[#1e2638]">
              <div className="text-2xl sm:text-3xl font-extrabold text-violet-400 font-mono">3.2x</div>
              <div className="text-xs text-slate-400 mt-1">More Screening Callbacks</div>
            </div>
            <div className="p-4 rounded-lg bg-[#0e121b]/60 border border-[#1e2638]">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">120+</div>
              <div className="text-xs text-slate-400 mt-1">Global Universities Represented</div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities Bento Grid */}
      <section className="py-20 border-b border-[#1e2638]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              An end-to-end career command center.
            </h2>
            <p className="mt-3 text-slate-400 text-sm sm:text-base">
              Say goodbye to generic applications sent into recruitment black holes. Every tool works synergistically to elevate your competitive positioning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div
              onClick={() => onNavigate('resume-analyzer')}
              className="p-6 rounded-xl bg-[#0e121b] border border-[#1e2638] hover:border-violet-500/50 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-lg bg-violet-950/80 border border-violet-800/40 flex items-center justify-center text-violet-400 mb-4 group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">Resume Analyzer</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Deep audit of ATS compatibility, keyword density, passive phrasing, and metric-driven bullet point transformations.
                </p>
              </div>
              <div className="mt-6 flex items-center text-xs font-semibold text-violet-400 group-hover:text-violet-300">
                Launch Analyzer <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Feature 2 */}
            <div
              onClick={() => onNavigate('job-matcher')}
              className="p-6 rounded-xl bg-[#0e121b] border border-[#1e2638] hover:border-cyan-500/50 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-800/40 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">JD Matcher</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Paste any job description to discover missing technical skills, keyword gaps, and an explainable interview probability score.
                </p>
              </div>
              <div className="mt-6 flex items-center text-xs font-semibold text-cyan-400 group-hover:text-cyan-300">
                Match Job Description <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Feature 3 */}
            <div
              onClick={() => onNavigate('cover-letter')}
              className="p-6 rounded-xl bg-[#0e121b] border border-[#1e2638] hover:border-indigo-500/50 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-800/40 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">Cover Letter Creator</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tailored letters crafted around your specific projects and the employer's exact tech stack, written in customizable tones.
                </p>
              </div>
              <div className="mt-6 flex items-center text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                Draft Cover Letter <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Feature 4 */}
            <div
              onClick={() => onNavigate('tracker')}
              className="p-6 rounded-xl bg-[#0e121b] border border-[#1e2638] hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-800/40 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">Application Tracker</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Kanban pipeline with built-in instant AI interview coach for each company, tracking dates, salary ranges, and outcomes.
                </p>
              </div>
              <div className="mt-6 flex items-center text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
                Open Job Tracker <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
          </div>

          {/* Real AI Interview Spotlight Banner */}
          <div className="mt-8 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-violet-950/40 via-[#131826] to-cyan-950/40 border border-cyan-800/60 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                  Featured Module
                </span>
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Real Interview AI Platform
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Simulate high-stakes technical & behavioral interviews with live AI voice.
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Step into a simulated interview room with virtual Lead Hiring Lead Alex. Speak aloud using microphone speech recognition, receive dynamic AI drill-down follow-up questions, and learn from Staff-level model answers.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => onNavigate('mock-interviews')}
                className="px-6 py-3.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 transition-all flex items-center gap-2 shadow-lg shadow-violet-900/40 cursor-pointer"
              >
                <Mic className="w-4 h-4 text-cyan-200" />
                <span>Launch Real AI Interview Room</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Process */}
      <section className="py-20 border-b border-[#1e2638] bg-[#0a0d14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              From blank page to signed job offer.
            </h2>
            <p className="mt-2 text-slate-400 text-sm">
              A systematic 3-step workflow designed specifically for fresh graduates and ambitious job seekers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl bg-[#0e121b] border border-[#1e2638] relative">
              <span className="text-4xl font-extrabold text-violet-500/20 font-mono absolute top-4 right-4">01</span>
              <div className="text-xs font-mono text-cyan-400 mb-2">STEP ONE</div>
              <h3 className="text-base font-semibold text-white mb-2">Audit & Optimize Resume</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload your resume or paste plain text. Our Gemini-powered auditor detects formatting snags, weak passive bullet points, and missing ATS keywords.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#0e121b] border border-[#1e2638] relative">
              <span className="text-4xl font-extrabold text-cyan-500/20 font-mono absolute top-4 right-4">02</span>
              <div className="text-xs font-mono text-cyan-400 mb-2">STEP TWO</div>
              <h3 className="text-base font-semibold text-white mb-2">Match & Tailor Every Job</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Paste the job description of any company you want to work for. Receive instant alignment scores, critical missing skills, and auto-generated cover letters.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#0e121b] border border-[#1e2638] relative">
              <span className="text-4xl font-extrabold text-emerald-500/20 font-mono absolute top-4 right-4">03</span>
              <div className="text-xs font-mono text-cyan-400 mb-2">STEP THREE</div>
              <h3 className="text-base font-semibold text-white mb-2">Track & Ace Interviews</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Organize your pipeline across Wishlist, Screening, and Interview stages. Use 1-click Interview Prep to simulate likely questions for each employer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Attributable Social Proof */}
      <section className="py-20 border-b border-[#1e2638]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Real career outcomes from real candidates.
            </h2>
            <p className="mt-2 text-slate-400 text-sm">
              Concrete placement results from students, freshers, and professionals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Testimonial 1 */}
            <div className="p-6 rounded-xl bg-[#0e121b] border border-[#1e2638] flex flex-col justify-between">
              <p className="text-xs text-slate-300 leading-relaxed italic mb-6">
                "As a CS senior with no big-tech brand name on my resume, I was getting zero replies. CareerPilot pinpointed that my project bullets lacked metrics. After rewriting them with the bullet generator and tailoring to Stripe's JD, I landed my first frontend interview in 10 days."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-[#1e2638]">
                <div className="w-9 h-9 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center font-bold text-violet-300 text-xs">
                  ML
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Maya Lin</h4>
                  <p className="text-[11px] text-slate-400">CS Senior, UC Berkeley · Offer at Fintech</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="p-6 rounded-xl bg-[#0e121b] border border-[#1e2638] flex flex-col justify-between">
              <p className="text-xs text-slate-300 leading-relaxed italic mb-6">
                "The JD Matcher is a cheat code. It showed me that 4 crucial Docker and microservices keywords were completely missing from my resume even though I had used them in lab coursework. Adding them brought my match score from 61% to 89%."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-[#1e2638]">
                <div className="w-9 h-9 rounded-full bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center font-bold text-cyan-300 text-xs">
                  MA
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Marcus Adebayo</h4>
                  <p className="text-[11px] text-slate-400">Junior Backend Engineer · London</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="p-6 rounded-xl bg-[#0e121b] border border-[#1e2638] flex flex-col justify-between">
              <p className="text-xs text-slate-300 leading-relaxed italic mb-6">
                "The 1-click Interview Prep on tracked jobs saved me hours of stress before my screening rounds. The STAR framework suggestions for behavioral questions were spot-on with what the engineering manager actually asked."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-[#1e2638]">
                <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 text-xs">
                  PS
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Priya Sharma</h4>
                  <p className="text-[11px] text-slate-400">Career Transitioner · Software Engineer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="py-16 bg-gradient-to-b from-[#090b10] to-[#0e121b]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Ready to stand out in the global applicant pool?
          </h2>
          <p className="mt-3 text-slate-400 text-sm max-w-xl mx-auto">
            Get started completely free with full access to the resume auditor, JD matcher, and application tracker.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('resume-analyzer')}
              className="px-6 py-3 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 transition-all shadow-lg shadow-violet-900/40"
            >
              Start Free Resume Audit
            </button>
            <button
              onClick={onOpenAuth}
              className="px-6 py-3 rounded-lg text-sm font-semibold text-slate-200 bg-[#131826] border border-[#1e2638] hover:text-white hover:border-slate-600 transition-colors"
            >
              Sign In / Create Account
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e2638] py-8 bg-[#07090e] text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">CareerPilot AI</span>
            <span>·</span>
            <span>Global Career Assistant for Students & Freshers</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Powered by Gemini 3.8 Flash</span>
            <span>·</span>
            <span>Encrypted Cloud Sync</span>
            <span>·</span>
            <span>© 2026 CareerPilot AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
