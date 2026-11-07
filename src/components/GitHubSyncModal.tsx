import React, { useState, useEffect } from 'react';
import {
  X,
  Github,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Code2,
  Star,
  GitFork,
  RefreshCw,
  Trash2,
  PlusCircle,
  FileText,
  Info,
  Check,
} from 'lucide-react';
import { UserProfile, GitHubProfileData } from '../types';
import { storage } from '../lib/storage';

interface GitHubSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUserUpdated: (user: UserProfile) => void;
}

export const GitHubSyncModal: React.FC<GitHubSyncModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}) => {
  const [username, setUsername] = useState(currentUser.githubProfile?.username || '');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewProfile, setPreviewProfile] = useState<GitHubProfileData | null>(
    currentUser.githubProfile || null
  );
  const [oauthConfig, setOauthConfig] = useState<{
    configured: boolean;
    url?: string;
    redirectUri?: string;
    devCallbackUrl?: string;
    sharedCallbackUrl?: string;
  } | null>(null);
  const [showOAuthDetails, setShowOAuthDetails] = useState(false);
  const [resumeImportSuccess, setResumeImportSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (currentUser.githubProfile) {
        setPreviewProfile(currentUser.githubProfile);
        setUsername(currentUser.githubProfile.username);
      }
      checkOAuthConfig();
    }
  }, [isOpen, currentUser]);

  // Listen for popup message from OAuth flow according to oauth-integration guidelines
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }
      if (event.data?.type === 'GITHUB_AUTH_SUCCESS' && event.data?.profile) {
        const syncedProfile: GitHubProfileData = event.data.profile;
        setPreviewProfile(syncedProfile);
        saveProfileToUser(syncedProfile);
        setSuccessMsg(`Successfully synced GitHub profile for @${syncedProfile.username} via OAuth!`);
        setOauthLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentUser]);

  const checkOAuthConfig = async () => {
    try {
      const res = await fetch('/api/github/auth-url');
      if (res.ok) {
        const data = await res.json();
        setOauthConfig(data);
      }
    } catch (e) {
      console.warn('Could not check OAuth config', e);
    }
  };

  const handleSyncByUsername = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUsername = username.trim().replace(/^@/, '').replace(/^https?:\/\/github\.com\//, '').split('/')[0];
    if (!cleanUsername) {
      setError('Please enter your GitHub username or profile URL.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/github/sync/${encodeURIComponent(cleanUsername)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch GitHub profile.');
      }

      const profile: GitHubProfileData = data.profile;
      setPreviewProfile(profile);
      saveProfileToUser(profile);
      setSuccessMsg(`Successfully synced @${profile.username} with ${profile.topRepositories.length} repositories!`);
    } catch (err: any) {
      setError(err.message || 'Error syncing with GitHub. Please check the username.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectOAuth = async () => {
    setOauthLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/github/auth-url');
      const data = await res.json();

      if (!data.configured || !data.url) {
        setShowOAuthDetails(true);
        setOauthLoading(false);
        return;
      }

      // Navigate safely to GitHub OAuth URL
      window.location.href = data.url;
    } catch (err: any) {
      setError(`OAuth initiation failed: ${err.message}`);
      setOauthLoading(false);
    }
  };

  const saveProfileToUser = (profile: GitHubProfileData) => {
    const updatedUser: UserProfile = {
      ...currentUser,
      githubProfile: profile,
    };
    storage.setCurrentUser(updatedUser);
    onUserUpdated(updatedUser);
  };

  const handleDisconnect = () => {
    const updatedUser: UserProfile = {
      ...currentUser,
      githubProfile: undefined,
    };
    storage.setCurrentUser(updatedUser);
    onUserUpdated(updatedUser);
    setPreviewProfile(null);
    setUsername('');
    setSuccessMsg('GitHub profile disconnected.');
  };

  const handleImportProjectsToMasterResume = () => {
    if (!previewProfile || !previewProfile.topRepositories.length) return;

    const currentResume = storage.getMasterResumeText();
    const bullets = previewProfile.suggestedResumeBullets || [];

    const projectSection = `\n\nFEATURED OPEN-SOURCE PROJECTS (Synced from GitHub @${previewProfile.username})
${bullets.map(b => `• ${b}`).join('\n')}`;

    if (currentResume.includes(`@${previewProfile.username}`)) {
      setResumeImportSuccess(true);
      setTimeout(() => setResumeImportSuccess(false), 2500);
      return;
    }

    const updatedResume = currentResume + projectSection;
    storage.saveMasterResumeText(updatedResume);
    setResumeImportSuccess(true);
    setTimeout(() => setResumeImportSuccess(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0e121b] border border-[#1e2638] shadow-2xl p-6 relative space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-violet-950/80 border border-violet-800 flex items-center justify-center text-cyan-400">
            <Github className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Sync GitHub Profile & Repositories
            </h2>
            <p className="text-xs text-slate-400">
              Extract languages, repositories, and metric-backed project bullet points for your tech resume.
            </p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-200 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Primary Sync Input Form */}
        <div className="p-5 rounded-xl bg-[#090b10] border border-[#1e2638] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-cyan-400" />
              Direct Username Sync (Instant · No Setup Needed)
            </span>
            <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950 border border-cyan-800 px-2 py-0.5 rounded">
              Zero Auth Required
            </span>
          </div>

          <form onSubmit={handleSyncByUsername} className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-slate-500 font-mono text-xs">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="github-username (e.g. torvalds or your username)"
                  className="w-full pl-7 pr-3 py-2 text-xs bg-[#0e121b] border border-[#1e2638] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !username.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-violet-900/30"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync Profile</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Fetches public repositories, top programming languages, and recent technical project activity.
            </p>
          </form>

          {/* Alternative OAuth Popup Button */}
          <div className="pt-3 border-t border-[#1e2638] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">
              Need private repo sync or authenticated rate limits?
            </span>
            <button
              type="button"
              onClick={handleConnectOAuth}
              disabled={oauthLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#131826] border border-[#1e2638] text-slate-200 hover:text-white hover:border-slate-600 transition-colors flex items-center gap-1.5"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Connect via GitHub OAuth</span>
            </button>
          </div>
        </div>

        {/* OAuth Configuration Details Dropdown if not configured */}
        {showOAuthDetails && (
          <div className="p-4 rounded-xl bg-[#090b10] border border-amber-800/40 text-xs space-y-3">
            <div className="flex items-center gap-2 text-amber-300 font-semibold">
              <Info className="w-4 h-4 text-amber-400" />
              <span>GitHub OAuth App Configuration</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              To use OAuth popup authentication, create an OAuth app in GitHub Developer Settings and add the callback URLs below:
            </p>
            <div className="space-y-1.5 font-mono text-[11px] bg-[#0e121b] p-3 rounded-lg border border-[#1e2638]">
              <div className="text-slate-400">
                <span className="text-slate-500">Dev Callback: </span>
                <span className="text-cyan-400 select-all">
                  {oauthConfig?.devCallbackUrl || 'https://ais-dev-vlzl7zwiz7j56bcx5gjmma-565839048771.asia-southeast1.run.app/auth/callback'}
                </span>
              </div>
              <div className="text-slate-400">
                <span className="text-slate-500">Shared Callback: </span>
                <span className="text-cyan-400 select-all">
                  {oauthConfig?.sharedCallbackUrl || 'https://ais-pre-vlzl7zwiz7j56bcx5gjmma-565839048771.asia-southeast1.run.app/auth/callback'}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Set <code className="text-cyan-300">GITHUB_CLIENT_ID</code> and <code className="text-cyan-300">GITHUB_CLIENT_SECRET</code> in your environment secrets. Or use <strong>Direct Username Sync</strong> above which works right now!
            </p>
          </div>
        )}

        {/* Synced Profile Preview */}
        {previewProfile && (
          <div className="p-5 rounded-xl bg-[#090b10] border border-cyan-800/40 space-y-5">
            {/* User Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e2638]">
              <div className="flex items-center gap-3.5">
                <img
                  src={previewProfile.avatarUrl}
                  alt={previewProfile.username}
                  className="w-14 h-14 rounded-full object-cover border-2 border-cyan-400 shadow-md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {previewProfile.name || previewProfile.username}
                    </h3>
                    <a
                      href={previewProfile.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 hover:underline flex items-center gap-0.5"
                    >
                      @{previewProfile.username} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {previewProfile.bio && (
                    <p className="text-xs text-slate-300 mt-0.5 max-w-md line-clamp-2">
                      {previewProfile.bio}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                    <span>{previewProfile.publicRepos} public repos</span>
                    <span>·</span>
                    <span>{previewProfile.followers} followers</span>
                    {previewProfile.location && (
                      <>
                        <span>·</span>
                        <span>{previewProfile.location}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/40 border border-red-900/40 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Disconnect
                </button>
              </div>
            </div>

            {/* Top Detected Languages */}
            {previewProfile.topLanguages.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Detected Languages & Tech Stack
                </span>
                <div className="flex flex-wrap gap-2">
                  {previewProfile.topLanguages.map((lang) => (
                    <div
                      key={lang.language}
                      className="px-2.5 py-1 rounded-md bg-[#131826] border border-[#1e2638] text-xs text-slate-200 flex items-center gap-1.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span className="font-medium text-white">{lang.language}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {lang.percentage}% ({lang.count} repos)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Repositories */}
            {previewProfile.topRepositories.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Featured Repositories ({previewProfile.topRepositories.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {previewProfile.topRepositories.slice(0, 6).map((repo) => (
                    <a
                      key={repo.id}
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-lg bg-[#0e121b] border border-[#1e2638] hover:border-cyan-500/50 transition-colors group block"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white group-hover:text-cyan-300 truncate max-w-[170px]">
                          {repo.name}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          {repo.stargazersCount > 0 && (
                            <span className="flex items-center gap-0.5 text-amber-300">
                              <Star className="w-3 h-3 fill-amber-300" />
                              {repo.stargazersCount}
                            </span>
                          )}
                          {repo.forksCount > 0 && (
                            <span className="flex items-center gap-0.5">
                              <GitFork className="w-3 h-3" />
                              {repo.forksCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {repo.description || 'No description provided.'}
                      </p>
                      {repo.language && (
                        <div className="mt-2 text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          {repo.language}
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* AI Synthesized Resume Project Bullets */}
            {previewProfile.suggestedResumeBullets && previewProfile.suggestedResumeBullets.length > 0 && (
              <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-violet-300 text-xs font-semibold">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>AI-Synthesized Resume Bullets from GitHub</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleImportProjectsToMasterResume}
                    className="px-2.5 py-1 rounded text-[11px] font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors flex items-center gap-1 shadow-sm"
                  >
                    {resumeImportSuccess ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-300" />
                        <span>Added to Master Resume!</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-3 h-3" />
                        <span>Add to Master Resume</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-1.5 text-xs text-slate-200">
                  {previewProfile.suggestedResumeBullets.map((bullet, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{bullet}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#131826] text-slate-300 hover:text-white border border-[#1e2638] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
