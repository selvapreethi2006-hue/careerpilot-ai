// Supabase Client Integration Service
// Provides config management, dual key format validation, connection testing, and client instance

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { UserProfile, UserRole, FeatureUsageType, FeatureUsageLog } from '../types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  keyType?: 'legacy_jwt' | 'publishable_key';
  lastChecked?: string;
  detectedProjectRef?: string;
}

const SUPABASE_CONFIG_KEY = 'cp_supabase_config_v2';

// Detect whether a key is a legacy JWT anon key, new sb_publishable key, or dangerous secret key
export function analyzeKeyType(key: string): {
  isValidType: boolean;
  isSecret: boolean;
  keyType: 'legacy_jwt' | 'publishable_key' | 'secret_forbidden' | 'unknown';
  warning?: string;
} {
  const trimmed = key.trim();

  // 1. Detect dangerous secret / service_role keys to protect users from exposing admin rights
  if (
    trimmed.startsWith('sb_secret_') ||
    trimmed.startsWith('sbs_') ||
    trimmed.toLowerCase().includes('service_role')
  ) {
    return {
      isValidType: false,
      isSecret: true,
      keyType: 'secret_forbidden',
      warning:
        'Security Violation: You entered a secret / service_role key. Never enter secret keys in client applications! Please use only your public Publishable Key or Anon Key.',
    };
  }

  // Check decoded JWT payload for service_role if it is a JWT
  if (trimmed.startsWith('eyJ')) {
    try {
      const parts = trimmed.split('.');
      if (parts.length >= 2) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.role === 'service_role') {
          return {
            isValidType: false,
            isSecret: true,
            keyType: 'secret_forbidden',
            warning:
              'Security Violation: This JWT has the "service_role" admin role. Please use the public "anon" key from Supabase Dashboard > Project Settings > API.',
          };
        }
      }
    } catch {
      // not parsable, proceed to standard validation
    }

    return {
      isValidType: true,
      isSecret: false,
      keyType: 'legacy_jwt',
    };
  }

  // 2. Modern Supabase publishable keys (sb_publishable_... or sbp_...)
  if (trimmed.startsWith('sb_publishable_') || trimmed.startsWith('sbp_')) {
    return {
      isValidType: true,
      isSecret: false,
      keyType: 'publishable_key',
    };
  }

  // 3. Fallback for other standard publishable formats
  if (trimmed.length > 20) {
    return {
      isValidType: true,
      isSecret: false,
      keyType: 'publishable_key',
    };
  }

  return {
    isValidType: false,
    isSecret: false,
    keyType: 'unknown',
    warning: 'Invalid key length. Supabase publishable keys are typically 40+ characters long.',
  };
}

// Read config from localStorage or fallback to Vite environment variables
export function getStoredSupabaseConfig(): SupabaseConfig {
  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.url === 'string') return parsed;
    }
  } catch (e) {
    console.warn('Failed reading Supabase config from storage', e);
  }

  // Fallback to environment variables if provided
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey =
    (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
    '';

  const hasEnvCredentials = !!(envUrl && envKey);
  let projectRef = '';
  try {
    if (envUrl) {
      const parsed = new URL(envUrl);
      projectRef = parsed.hostname.split('.')[0] || '';
    }
  } catch {}

  return {
    url: envUrl,
    anonKey: envKey,
    isConnected: hasEnvCredentials,
    keyType: envKey.startsWith('eyJ') ? 'legacy_jwt' : 'publishable_key',
    detectedProjectRef: projectRef || undefined,
  };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(SUPABASE_CONFIG_KEY);
}

// Global cached client instance
let cachedClient: SupabaseClient | null = null;
let cachedClientUrl = '';
let cachedClientKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey || !config.isConnected) {
    return null;
  }

  if (cachedClient && cachedClientUrl === config.url && cachedClientKey === config.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    cachedClientUrl = config.url;
    cachedClientKey = config.anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

// Test connection with exact diagnosis for 401 Unauthorized and support for both key types
export async function testSupabaseConnection(
  rawUrl: string,
  rawKey: string
): Promise<{ success: boolean; message: string; details?: string }> {
  const url = (rawUrl || '').trim().replace(/\/+$/, '');
  const key = (rawKey || '').trim();

  if (!url || !key) {
    return {
      success: false,
      message: 'Please provide both your Supabase Project URL and Publishable/Anon Key.',
    };
  }

  // 1. Validate URL format
  let projectRef = '';
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith('http')) {
      return { success: false, message: 'Project URL must begin with https://' };
    }
    // Extract project ref (e.g. xyzcompany from https://xyzcompany.supabase.co)
    const hostnameParts = parsed.hostname.split('.');
    if (hostnameParts.length >= 3 && hostnameParts[1] === 'supabase') {
      projectRef = hostnameParts[0];
    }
  } catch {
    return {
      success: false,
      message: 'Invalid URL format. Example: https://your-project-id.supabase.co',
    };
  }

  // 2. Validate Key Type (block secret keys)
  const keyAnalysis = analyzeKeyType(key);
  if (!keyAnalysis.isValidType) {
    return {
      success: false,
      message: keyAnalysis.warning || 'Invalid API key format.',
    };
  }

  // 3. Test through server proxy first to prevent browser CORS false negatives
  try {
    const proxyRes = await fetch('/api/supabase/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, key }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success) {
        const config: SupabaseConfig = {
          url,
          anonKey: key,
          isConnected: true,
          keyType: keyAnalysis.keyType === 'legacy_jwt' ? 'legacy_jwt' : 'publishable_key',
          lastChecked: new Date().toISOString(),
          detectedProjectRef: projectRef || undefined,
        };
        saveSupabaseConfig(config);
        cachedClient = null; // reset client cache
        return {
          success: true,
          message: `Connected successfully to Supabase${projectRef ? ` (${projectRef})` : ''}! Cloud authentication and database sync are activated.`,
        };
      } else {
        return {
          success: false,
          message: data.message,
          details: data.details,
        };
      }
    }
  } catch (proxyErr) {
    console.warn('Server proxy test unavailable, testing direct client endpoint...', proxyErr);
  }

  // 4. Direct client-side verification as backup
  try {
    // Crucial: Only send Authorization: Bearer if key is a legacy JWT (eyJ...)
    // New sb_publishable keys MUST NOT be sent in Authorization: Bearer because PostgREST returns 401: Invalid JWT!
    const headers: Record<string, string> = {
      apikey: key,
    };
    if (key.startsWith('eyJ')) {
      headers['Authorization'] = `Bearer ${key}`;
    }

    // Ping Supabase Auth settings endpoint (tests gateway authentication of the key)
    const authSettingsUrl = `${url}/auth/v1/settings`;
    const response = await fetch(authSettingsUrl, {
      method: 'GET',
      headers,
    });

    if (response.status === 401) {
      return {
        success: false,
        message: '401 Unauthorized: The Supabase project rejected this key.',
        details:
          'Ensure you copied the public "anon" / "sb_publishable" key from Supabase Dashboard > Project Settings > API, and that this key belongs to project ' +
          (projectRef || url),
      };
    }

    if (response.status === 404) {
      return {
        success: false,
        message: '404 Not Found: Could not find Supabase services at this URL.',
        details: 'Check that your Project URL is typed correctly (e.g. https://<project-ref>.supabase.co).',
      };
    }

    if (response.ok || response.status === 200) {
      const config: SupabaseConfig = {
        url,
        anonKey: key,
        isConnected: true,
        keyType: keyAnalysis.keyType === 'legacy_jwt' ? 'legacy_jwt' : 'publishable_key',
        lastChecked: new Date().toISOString(),
        detectedProjectRef: projectRef || undefined,
      };
      saveSupabaseConfig(config);
      cachedClient = null;
      return {
        success: true,
        message: `Connected successfully to Supabase! Cloud sync is activated.`,
      };
    }

    return {
      success: false,
      message: `Supabase returned unexpected status code: ${response.status}`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    return {
      success: false,
      message: `Connection failed: ${errorMsg}. Check your internet connection and verify CORS origin in Supabase.`,
    };
  }
}

// ---------------------------------------------------------------------------
// Real Supabase Authentication & Email Verification Services
// ---------------------------------------------------------------------------

export function mapProfileToUserProfile(user: User, profile?: any): UserProfile {
  const isVerified = !!(user.email_confirmed_at || (user as any).confirmed_at);
  const rawMeta = user.user_metadata || {};
  const name =
    profile?.full_name ||
    rawMeta.full_name ||
    rawMeta.name ||
    (user.email ? user.email.split('@')[0] : 'CareerPilot User');

  return {
    id: user.id,
    name,
    email: user.email || '',
    role: (profile?.role as UserRole) || 'fresher',
    plan: profile?.plan === 'pro' ? 'pro' : 'free',
    avatarUrl:
      profile?.avatar_url ||
      `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80`,
    headline: profile?.target_role
      ? `${profile.target_role} | CareerPilot Member`
      : 'Early Career Professional | Job Seeker',
    universityOrCompany: profile?.university_or_company || 'University / Independent',
    targetRole: profile?.target_role || 'Software Engineer',
    bio: profile?.bio || 'Driven candidate preparing for upcoming career milestones.',
    monthlyAnalysisCount: profile?.monthly_analysis_count ?? 0,
    monthlyAnalysisLimit: profile?.monthly_analysis_limit ?? 3,
    createdAt: user.created_at ? user.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    isSupabaseUser: true,
    isEmailVerified: isVerified,
    isDemo: false,
  };
}

export async function signUpWithSupabase(
  email: string,
  password: string,
  name: string
): Promise<{
  success: boolean;
  message: string;
  requiresEmailConfirmation?: boolean;
  email?: string;
  isExistingUser?: boolean;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      message: 'Supabase is not configured. Please connect your Supabase project URL and Key first.',
    };
  }

  const cleanEmail = email.trim();
  const cleanName = name.trim();

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName || cleanEmail.split('@')[0],
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    // Check if user already existed
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return {
        success: false,
        isExistingUser: true,
        message: 'An account with this email address already exists. Please sign in instead.',
      };
    }

    // When Supabase email confirmation is enabled, data.session is null and email_confirmed_at is null
    const isConfirmed = !!(data.user?.email_confirmed_at || (data.user as any)?.confirmed_at);
    if (!isConfirmed) {
      return {
        success: true,
        requiresEmailConfirmation: true,
        email: cleanEmail,
        message: `Verification email sent to ${cleanEmail}. Supabase email confirmation is enabled and required. Please check your inbox (and spam folder) and click the verification link before logging in.`,
      };
    }

    return {
      success: true,
      requiresEmailConfirmation: false,
      email: cleanEmail,
      message: 'Registration successful! Your account is active.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'An unexpected error occurred during signup.',
    };
  }
}

export async function signInWithSupabase(
  email: string,
  password: string
): Promise<{
  success: boolean;
  message: string;
  isUnconfirmed?: boolean;
  user?: UserProfile;
  rawUser?: User;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      message: 'Supabase is not configured. Please connect your Supabase project URL and Key first.',
    };
  }

  const cleanEmail = email.trim();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
        return {
          success: false,
          isUnconfirmed: true,
          message:
            'Email Not Confirmed: Supabase email verification is strictly enforced. Please check your inbox and verify your email, or have an admin confirm your account in the Supabase Dashboard before signing in.',
        };
      }
      return {
        success: false,
        message: error.message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        message: 'No user session returned from Supabase authentication.',
      };
    }

    // Security check: Verify email is genuinely confirmed
    const isConfirmed = !!(data.user.email_confirmed_at || (data.user as any).confirmed_at);
    if (!isConfirmed) {
      // Sign out immediately so unconfirmed token is not persisted
      await supabase.auth.signOut();
      return {
        success: false,
        isUnconfirmed: true,
        message:
          'Access Blocked: Your email address has not been confirmed yet. Please verify your email via the confirmation link sent to your inbox before accessing CareerPilot AI.',
      };
    }

    // Fetch user profile from public.profiles
    let profileData: any = null;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();
      profileData = profile;
    } catch (profErr) {
      console.warn('Could not load profile from profiles table:', profErr);
    }

    const userProfile = mapProfileToUserProfile(data.user, profileData);
    return {
      success: true,
      message: `Welcome back, ${userProfile.name}!`,
      user: userProfile,
      rawUser: data.user,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'An unexpected error occurred during login.',
    };
  }
}

export async function resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      message: 'Supabase is not configured.',
    };
  }

  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: true,
      message: `A fresh verification email has been dispatched to ${email.trim()}. Please check your inbox and spam folder.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to resend confirmation email.',
    };
  }
}

export async function signOutFromSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
  }
}

export async function fetchCurrentSupabaseUser(): Promise<{
  user: UserProfile | null;
  isVerified: boolean;
  rawUser: User | null;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { user: null, isVerified: false, rawUser: null };
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session || !session.user) {
      return { user: null, isVerified: false, rawUser: null };
    }

    const rawUser = session.user;
    const isVerified = !!(rawUser.email_confirmed_at || (rawUser as any).confirmed_at);

    if (!isVerified) {
      return {
        user: mapProfileToUserProfile(rawUser),
        isVerified: false,
        rawUser,
      };
    }

    // Load profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', rawUser.id)
      .maybeSingle();

    return {
      user: mapProfileToUserProfile(rawUser, profile),
      isVerified: true,
      rawUser,
    };
  } catch (err) {
    console.warn('Failed checking Supabase session:', err);
    return { user: null, isVerified: false, rawUser: null };
  }
}

export async function verifyProjectEmailConfirmationSettings(): Promise<{
  enforced: boolean;
  mailerAutoconfirm: boolean;
  details: string;
}> {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return {
      enforced: true,
      mailerAutoconfirm: false,
      details: 'Supabase credentials not yet saved in client.',
    };
  }

  try {
    const res = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.anonKey },
    });
    if (res.ok) {
      const data = await res.json();
      const mailerAutoconfirm = !!data.mailer_autoconfirm;
      return {
        enforced: !mailerAutoconfirm,
        mailerAutoconfirm,
        details: mailerAutoconfirm
          ? 'Warning: mailer_autoconfirm is true in Supabase project settings. Emails are auto-confirmed.'
          : 'Verified: mailer_autoconfirm is false. Real email confirmation is actively enforced by Supabase.',
      };
    }
  } catch (e: any) {
    console.warn('Error reading auth settings:', e);
  }

  return {
    enforced: true,
    mailerAutoconfirm: false,
    details: 'Standard Supabase default: email confirmation enforced.',
  };
}

// ---------------------------------------------------------------------------
// Per-User Secure Supabase Database CRUD Operations
// ---------------------------------------------------------------------------

export async function fetchUserApplicationsFromCloud(userId: string): Promise<any[]> {
  const supabase = getSupabaseClient();
  if (!supabase || !userId) return [];

  try {
    const { data, error } = await supabase
      .from('job_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching user applications from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      companyName: row.company_name,
      jobTitle: row.job_title,
      location: row.location || 'Remote',
      salaryRange: row.salary_range || undefined,
      applicationDate: row.application_date,
      status: row.status,
      interviewDate: row.interview_date || undefined,
      notes: row.notes || '',
      matchScore: row.match_score || undefined,
      jobUrl: row.job_url || undefined,
      contactPerson: row.contact_person || undefined,
    }));
  } catch (err) {
    console.warn('Network error loading applications:', err);
    return [];
  }
}

export async function saveApplicationToCloud(
  userId: string,
  app: any
): Promise<{ success: boolean; id?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase || !userId) return { success: false };

  try {
    const payload: any = {
      user_id: userId,
      company_name: app.companyName,
      job_title: app.jobTitle,
      location: app.location || 'Remote',
      salary_range: app.salaryRange || null,
      application_date: app.applicationDate || new Date().toISOString().split('T')[0],
      status: app.status || 'applied',
      interview_date: app.interviewDate || null,
      notes: app.notes || '',
      job_url: app.jobUrl || null,
      match_score: app.matchScore || null,
    };

    if (app.id && !app.id.startsWith('app-')) {
      payload.id = app.id;
    }

    const { data, error } = await supabase
      .from('job_applications')
      .upsert(payload)
      .select('id')
      .single();

    if (error) {
      console.warn('Error saving application to Supabase:', error.message);
      return { success: false };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.warn('Failed syncing application to Supabase:', err);
    return { success: false };
  }
}

export async function deleteApplicationFromCloud(userId: string, appId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !userId || !appId) return false;

  try {
    const { error } = await supabase
      .from('job_applications')
      .delete()
      .eq('id', appId)
      .eq('user_id', userId);

    return !error;
  } catch {
    return false;
  }
}

export async function uploadResumeFileToStorage(
  userId: string,
  file: File | Blob,
  fileName: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase || !userId) {
    return { success: false, error: 'Supabase client is not configured or user is not logged in.' };
  }

  try {
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${userId}/${Date.now()}_${cleanName}`;

    const { data, error } = await supabase.storage.from('resumes').upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: (file as any).type || (cleanName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
    });

    if (error) {
      console.warn('Supabase storage upload error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, filePath: data?.path || filePath };
  } catch (err: any) {
    console.warn('Storage upload exception:', err);
    return { success: false, error: err.message || 'Storage upload failed.' };
  }
}

export async function saveResumeAuditToCloud(userId: string, audit: any): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !userId || !audit) return false;

  try {
    const insertPayload: any = {
      user_id: userId,
      target_role: audit.targetRoleDetected || 'Software Engineer',
      ats_score: audit.atsScore || 0,
      raw_text: audit.rawResumeText || '',
      analysis: audit,
      strengths: audit.strengths || [],
      weaknesses: audit.weaknesses || [],
      action_verbs_count: audit.actionVerbsCount || 0,
      action_verbs_suggestions: audit.actionVerbsSuggestions || [],
      bullet_point_improvements: audit.bulletPointImprovements || [],
      recommended_certifications: audit.recommendedCertifications || [],
      summary_review: audit.summaryReview || '',
    };

    if (audit.fileName) {
      insertPayload.file_name = audit.fileName;
    }
    if (audit.fileSize) {
      insertPayload.file_size = audit.fileSize;
    }
    if (audit.storageFilePath) {
      insertPayload.storage_path = audit.storageFilePath;
    }

    const { error } = await supabase.from('resumes').insert(insertPayload);

    if (error) {
      // If table doesn't have the optional file columns, retry without them
      if (error.message && (error.message.includes('column') || error.message.includes('schema'))) {
        const fallbackPayload = {
          user_id: userId,
          target_role: audit.targetRoleDetected || 'Software Engineer',
          ats_score: audit.atsScore || 0,
          raw_text: audit.rawResumeText || '',
          analysis: audit,
          strengths: audit.strengths || [],
          weaknesses: audit.weaknesses || [],
          action_verbs_count: audit.actionVerbsCount || 0,
          action_verbs_suggestions: audit.actionVerbsSuggestions || [],
          bullet_point_improvements: audit.bulletPointImprovements || [],
          recommended_certifications: audit.recommendedCertifications || [],
          summary_review: audit.summaryReview || '',
        };
        const retry = await supabase.from('resumes').insert(fallbackPayload);
        return !retry.error;
      }
      console.warn('Error syncing resume audit to Supabase:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Error syncing resume audit to Supabase:', err);
    return false;
  }
}

// -------------------------------------------------------------
// FEATURE USAGE TRACKING & ENGAGEMENT METRICS (Supabase table)
// Supports both public.feature_usage and public.feature_usage_logs
// -------------------------------------------------------------
export async function logFeatureUsageToCloud(
  userId: string,
  featureName: FeatureUsageType,
  metadata: Record<string, any> = {}
): Promise<{ success: boolean; id?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase || !userId) return { success: false };

  const payload = {
    user_id: userId,
    feature_name: featureName,
    metadata,
    created_at: new Date().toISOString(),
  };

  // 1. Try public.feature_usage first
  try {
    const { data, error } = await supabase
      .from('feature_usage')
      .insert(payload)
      .select('id')
      .single();

    if (!error && data?.id) {
      return { success: true, id: data.id };
    }
  } catch {}

  // 2. Fall back to public.feature_usage_logs
  try {
    const { data, error } = await supabase
      .from('feature_usage_logs')
      .insert(payload)
      .select('id')
      .single();

    if (!error && data?.id) {
      return { success: true, id: data.id };
    }
    if (error) {
      console.warn('Error logging feature usage to Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Failed syncing feature usage to Supabase:', err);
  }

  return { success: false };
}

export async function fetchCloudFeatureUsage(
  userId: string,
  limitCount = 100
): Promise<FeatureUsageLog[]> {
  const supabase = getSupabaseClient();
  if (!supabase || !userId) return [];

  // Try public.feature_usage first
  try {
    const { data, error } = await supabase
      .from('feature_usage')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limitCount);

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        featureName: row.feature_name,
        actionDescription:
          row.action_description ||
          row.metadata?.action_description ||
          row.metadata?.description ||
          undefined,
        metadata: row.metadata || {},
        createdAt: row.created_at,
      }));
    }
  } catch {}

  // Fall back to public.feature_usage_logs
  try {
    const { data, error } = await supabase
      .from('feature_usage_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limitCount);

    if (error) {
      console.warn('Error fetching feature usage from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      featureName: row.feature_name,
      actionDescription:
        row.action_description ||
        row.metadata?.action_description ||
        row.metadata?.description ||
        undefined,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.warn('Failed retrieving cloud feature usage:', err);
    return [];
  }
}

/**
 * Specifically fetches the last 5 recent usage logs from the Supabase feature_usage table
 * to provide a quick snapshot of candidate activity on the UserDashboard.
 */
export async function fetchRecentUsageLogs(userId: string, count = 5): Promise<FeatureUsageLog[]> {
  return fetchCloudFeatureUsage(userId, count);
}



