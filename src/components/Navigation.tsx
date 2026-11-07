import React, { useState } from 'react';
import {
  Compass,
  LayoutDashboard,
  FileText,
  Target,
  Mail,
  Briefcase,
  User,
  ShieldCheck,
  Menu,
  X,
  Sparkles,
  Database,
  LogOut,
  ChevronDown,
  LogIn,
  UserPlus,
  Globe2,
  Mic,
  BookOpen,
  DollarSign,
  Code2,
  Send,
  Layers,
} from 'lucide-react';
import { UserProfile } from '../types';

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  currentUser: UserProfile | null;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  onOpenSupabaseModal: () => void;
  onSignOut: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  onNavigate,
  currentUser,
  onOpenAuth,
  onOpenSupabaseModal,
  onSignOut,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);

  // Core Top Links
  const primaryNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, protected: true },
    { id: 'mock-interviews', label: 'AI Interview', icon: Mic, protected: true },
    { id: 'career-mentor', label: 'AI Mentor', icon: Compass, protected: true },
    { id: 'resume-analyzer', label: 'Resume', icon: FileText, protected: true },
    { id: 'jobs', label: 'Find Jobs', icon: Globe2, protected: false },
    { id: 'tracker', label: 'Tracker', icon: Briefcase, protected: true },
  ];

  // Extended AI Suite Dropdown Items
  const aiSuiteItems = [
    { id: 'mock-interviews', label: 'Real Interview AI', icon: Mic, desc: 'Live voice & text simulation with AI hiring manager' },
    { id: 'skill-gap', label: 'Skill Gap Analyzer', icon: Target, desc: 'Identify missing competencies & priorities' },
    { id: 'learning-roadmap', label: 'Learning Roadmap', icon: BookOpen, desc: 'Personalized weekly & daily curriculum' },
    { id: 'job-matcher', label: 'JD Matcher', icon: Target, desc: 'Match resume against job descriptions' },
    { id: 'cover-letter', label: 'Cover Letter Generator', icon: Mail, desc: 'Persuasive custom application letters' },
    { id: 'outreach-assistant', label: 'Outreach Assistant', icon: Send, desc: 'Recruiter InMails & LinkedIn notes' },
    { id: 'portfolio-builder', label: 'Portfolio Website Builder', icon: Code2, desc: 'Compile & export single-file sites' },
    { id: 'salary-insights', label: 'Salary & Career Insights', icon: DollarSign, desc: 'Compensation bands & ladder growth' },
  ];

  const handleNavClick = (pageId: string, isProtected: boolean = false) => {
    if (isProtected && !currentUser) {
      onOpenAuth('signin');
      return;
    }
    onNavigate(pageId);
    setMobileMenuOpen(false);
    setToolsDropdownOpen(false);
  };

  const isAiSuiteActive = aiSuiteItems.some((item) => item.id === currentPage);

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#090b10]/95 backdrop-blur-md border-b border-[#1e2638] h-16 flex items-center justify-between px-4 lg:px-8">
        {/* Zone 1: Wordmark / Brand */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleNavClick('landing')}
            className="flex items-center gap-2.5 text-left group focus-visible:outline-none cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-0.5 shadow-sm">
              <div className="w-full h-full bg-[#090b10] rounded-[7px] flex items-center justify-center">
                <Compass className="w-5 h-5 text-cyan-400 group-hover:rotate-45 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                CareerPilot <span className="text-cyan-400 font-extrabold text-sm">AI</span>
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id, item.protected)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-cyan-400 bg-cyan-950/50 border border-cyan-800/60'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}

          {/* AI Career Suite Dropdown */}
          <div className="relative">
            <button
              onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                isAiSuiteActive || toolsDropdownOpen
                  ? 'text-cyan-400 bg-cyan-950/50 border border-cyan-800/60'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>AI Career Tools</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {toolsDropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-[#0e121b] border border-[#1e2638] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                <div className="px-3 py-1.5 border-b border-[#1e2638] text-[10px] font-mono uppercase text-slate-400 font-bold">
                  AI Career Services
                </div>
                {aiSuiteItems.map((tool) => {
                  const ToolIcon = tool.icon;
                  const isToolActive = currentPage === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => handleNavClick(tool.id, true)}
                      className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                        isToolActive
                          ? 'bg-violet-950/60 text-cyan-300'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-[#131826] border border-[#1e2638] flex items-center justify-center shrink-0 mt-0.5 text-cyan-400">
                        <ToolIcon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block">{tool.label}</span>
                        <span className="text-[10px] text-slate-400 leading-tight block">
                          {tool.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: Actions & Profile */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl border border-[#1e2638] bg-[#0e121b] hover:border-slate-700 transition-colors cursor-pointer"
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-lg object-cover border border-violet-500/40"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-violet-950 border border-violet-700 flex items-center justify-center text-xs font-bold text-cyan-300">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-semibold text-white leading-tight truncate max-w-[120px]">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-cyan-400 font-medium flex items-center gap-1">
                    Verified User
                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono">
                      Cloud
                    </span>
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0e121b] border border-[#1e2638] shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2.5 border-b border-[#1e2638]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-white truncate max-w-[160px]">{currentUser.name}</p>
                      <span className="text-[9px] font-mono px-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
                        VERIFIED
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-300">
                      <span>Allowance:</span>
                      <span className="font-mono text-cyan-400">Unlimited (Free Launch)</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      handleNavClick('profile', true);
                      setUserDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                    Profile & Settings
                  </button>

                  <button
                    onClick={() => {
                      handleNavClick('pricing');
                      setUserDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-cyan-300 hover:text-cyan-200 hover:bg-slate-800/60 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Access & Plans (100% Free)
                  </button>

                  <button
                    onClick={() => {
                      onOpenSupabaseModal();
                      setUserDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    Supabase Config & Schema
                  </button>

                  <div className="border-t border-[#1e2638] my-1" />

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('signin')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-[#0e121b] border border-[#1e2638] hover:border-slate-600 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-colors shadow-sm shadow-violet-900/30 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </button>
            </div>
          )}

          {/* Mobile menu hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-[#0e121b] border border-[#1e2638] text-slate-300 hover:text-white cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bg-[#090b10] border-b border-[#1e2638] p-4 z-40 shadow-2xl flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-150 max-h-[85vh] overflow-y-auto">
          <button
            onClick={() => handleNavClick('landing')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
              currentPage === 'landing' ? 'bg-cyan-950/60 text-cyan-300' : 'text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            <Compass className="w-4 h-4" />
            Landing Page
          </button>

          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id, item.protected)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
                  isActive ? 'bg-cyan-950/60 text-cyan-300' : 'text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}

          <div className="pt-2 border-t border-[#1e2638] text-[10px] font-mono uppercase text-slate-400 font-bold px-3">
            AI Career Suite
          </div>

          {aiSuiteItems.map((tool) => {
            const ToolIcon = tool.icon;
            const isToolActive = currentPage === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => handleNavClick(tool.id, true)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
                  isToolActive ? 'bg-cyan-950/60 text-cyan-300' : 'text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <ToolIcon className="w-4 h-4 text-cyan-400" />
                <span>{tool.label}</span>
              </button>
            );
          })}

          <div className="pt-2 border-t border-[#1e2638] flex flex-col gap-2">
            {currentUser ? (
              <>
                <button
                  onClick={() => {
                    handleNavClick('profile', true);
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800/50"
                >
                  <User className="w-4 h-4" />
                  Profile & Settings
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-red-400 bg-red-950/30 border border-red-900/50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signin');
                  }}
                  className="flex-1 py-2 text-center text-xs font-semibold text-slate-300 bg-[#0e121b] border border-[#1e2638] rounded-lg"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signup');
                  }}
                  className="flex-1 py-2 text-center text-xs font-semibold text-white bg-violet-600 rounded-lg"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
