import React, { useState } from 'react';
import {
  User,
  Mail,
  Building,
  GraduationCap,
  Sparkles,
  Database,
  Download,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  FileText,
  Save,
  Key,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { UserProfile } from '../types';
import { storage } from '../lib/storage';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  analyzeKeyType,
} from '../lib/supabase';

interface UserProfileProps {
  currentUser: UserProfile;
  onUserUpdated: (user: UserProfile) => void;
  onOpenSupabaseModal: () => void;
  onNavigate: (page: string) => void;
}

export const UserProfileComponent: React.FC<UserProfileProps> = ({
  currentUser,
  onUserUpdated,
  onOpenSupabaseModal,
  onNavigate,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [headline, setHeadline] = useState(currentUser.headline);
  const [university, setUniversity] = useState(currentUser.universityOrCompany);
  const [targetRole, setTargetRole] = useState(currentUser.targetRole);
  const [bio, setBio] = useState(currentUser.bio);
  const [masterResume, setMasterResume] = useState(storage.getMasterResumeText());

  // Supabase quick fields
  const [supabaseUrl, setSupabaseUrl] = useState(getStoredSupabaseConfig().url);
  const [supabaseKey, setSupabaseKey] = useState(getStoredSupabaseConfig().anonKey);
  const [supabaseStatus, setSupabaseStatus] = useState<string | null>(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...currentUser,
      name,
      headline,
      universityOrCompany: university,
      targetRole,
      bio,
    };
    storage.setCurrentUser(updated);
    storage.saveMasterResumeText(masterResume);
    onUserUpdated(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseStatus(null);
    const res = await testSupabaseConnection(supabaseUrl, supabaseKey);
    setIsTestingSupabase(false);
    setSupabaseStatus(res.message);
  };

  const handleExportData = () => {
    const fullBackup = {
      user: currentUser,
      applications: storage.getApplications(),
      resumes: storage.getSavedResumes(),
      matches: storage.getSavedMatches(),
      coverLetters: storage.getSavedCoverLetters(),
      masterResume: storage.getMasterResumeText(),
      exportedAt: new Date().toISOString(),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `CareerPilot_Backup_${currentUser.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleResetData = () => {
    storage.clearUserData(currentUser.id);
    window.location.reload();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e2638] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <User className="w-7 h-7 text-cyan-400" />
            User Profile & Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your personal background, master resume repository, and Supabase cloud sync credentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0e121b] border border-[#1e2638] text-slate-300 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export My Data (JSON)
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Profile changes and master resume saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-8">
        {/* Core Profile Card */}
        <div className="p-6 rounded-xl bg-[#0e121b] border border-[#1e2638] space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-[#1e2638]">
            <div className="flex items-center gap-4">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-16 h-16 rounded-xl object-cover border-2 border-violet-500/40"
              />
              <div>
                <h3 className="text-base font-bold text-white">{currentUser.name}</h3>
                <p className="text-xs text-slate-400">{currentUser.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300">
                    100% FREE PUBLIC ACCESS
                  </span>
                  <span className="text-xs text-slate-500">·</span>
                  <span className="text-xs text-slate-400 capitalize">{currentUser.role}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('pricing')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800/80 shadow-md transition-all flex items-center gap-1.5 hover:bg-emerald-900/60"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full Access Unlocked (Zero Billing)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[#090b10] border border-[#1e2638] rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Professional Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full px-3 py-2 bg-[#090b10] border border-[#1e2638] rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">University or Current Organization</label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full px-3 py-2 bg-[#090b10] border border-[#1e2638] rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Target Role or Title</label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-3 py-2 bg-[#090b10] border border-[#1e2638] rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-300 mb-1">Bio & Career Objective</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="w-full p-2.5 bg-[#090b10] border border-[#1e2638] rounded-lg text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Master Resume Repository Card */}
        <div className="p-6 rounded-xl bg-[#0e121b] border border-[#1e2638] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-400" />
                Master Resume Text Repository
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Saved once here, your master resume will automatically pre-populate the ATS analyzer, JD matcher, and cover letter creator.
              </p>
            </div>
            <span className="font-mono text-xs text-cyan-400">
              {masterResume.trim().split(/\s+/).filter(Boolean).length} words
            </span>
          </div>

          <textarea
            value={masterResume}
            onChange={(e) => setMasterResume(e.target.value)}
            rows={10}
            className="w-full p-3 text-xs bg-[#090b10] border border-[#1e2638] rounded-lg text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-cyan-500 resize-y"
          />
        </div>

        {/* Supabase Cloud Sync Manager */}
        <div className="p-6 rounded-xl bg-[#0e121b] border border-[#1e2638] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Supabase Cloud Sync & Storage
                  {getStoredSupabaseConfig().isConnected && (
                    <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-mono">
                      Connected
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  Connect your personal Supabase project for persistent cloud auth and encrypted resume storage.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenSupabaseModal}
              className="text-xs text-cyan-400 hover:underline font-medium flex items-center gap-1"
            >
              <span>View SQL Migration & Guide</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="p-3 rounded-lg bg-[#090b10] border border-[#1e2638] text-[11px] text-slate-300 space-y-1">
            <p className="font-semibold text-slate-200">Where to find your Supabase credentials:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
              <li>Open your project at <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">supabase.com/dashboard</a>.</li>
              <li>Go to <strong className="text-slate-300">Project Settings</strong> (gear icon) &gt; <strong className="text-slate-300">API</strong>.</li>
              <li>Copy the <strong className="text-slate-300">Project URL</strong> and either the new <strong className="text-slate-300">sb_publishable</strong> key or legacy <strong className="text-slate-300">anon public</strong> key.</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">1. Supabase Project URL</label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project-ref.supabase.co"
                className="w-full px-3 py-2 bg-[#090b10] border border-[#1e2638] rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Found under Project Settings &gt; API &gt; Project URL
              </span>
            </div>
            <div>
              <label className="block text-slate-300 mb-1 font-medium">
                2. Supabase Publishable / Anon Public Key
              </label>
              <input
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="sb_publishable_... or eyJh..."
                className="w-full px-3 py-2 bg-[#090b10] border border-[#1e2638] rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
              />
              {/* Dynamic key format / security badge */}
              {supabaseKey.trim().length > 0 && (() => {
                const analysis = analyzeKeyType(supabaseKey);
                if (analysis.isSecret) {
                  return (
                    <span className="text-[11px] text-red-400 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Security Alert: Secret/service_role key detected! Never enter secret keys in client apps.
                    </span>
                  );
                }
                if (analysis.keyType === 'publishable_key') {
                  return (
                    <span className="text-[10px] text-emerald-400 font-mono mt-1 block">
                      ✓ Valid Supabase Publishable Key format (sb_publishable_...)
                    </span>
                  );
                }
                if (analysis.keyType === 'legacy_jwt') {
                  return (
                    <span className="text-[10px] text-cyan-400 font-mono mt-1 block">
                      ✓ Valid Legacy JWT Anon Key format (eyJ...)
                    </span>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#1e2638]/60">
            <button
              type="button"
              onClick={handleTestSupabase}
              disabled={
                isTestingSupabase ||
                !supabaseUrl ||
                !supabaseKey ||
                analyzeKeyType(supabaseKey).isSecret
              }
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-colors flex items-center gap-1.5 self-start"
            >
              <Key className="w-3.5 h-3.5" />
              {isTestingSupabase ? 'Testing Connection...' : 'Test & Activate Cloud Connection'}
            </button>

            {supabaseStatus && (
              <span className="text-xs text-slate-300 font-mono text-right max-w-md">
                {supabaseStatus}
              </span>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-[#1e2638]">
          <button
            type="button"
            onClick={handleResetData}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear Local Cache
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-900/40"
          >
            <Save className="w-4 h-4" />
            Save Profile & Master Resume
          </button>
        </div>
      </form>
    </div>
  );
};
