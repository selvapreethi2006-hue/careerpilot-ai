export type UserRole = 'student' | 'fresher' | 'jobseeker' | 'admin';
export type PlanTier = 'free' | 'pro';

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  updatedAt: string;
  topics?: string[];
  isFork?: boolean;
}

export interface GitHubProfileData {
  username: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  htmlUrl: string;
  publicRepos: number;
  followers: number;
  following: number;
  company: string | null;
  location: string | null;
  blog: string | null;
  syncedAt: string;
  topLanguages: Array<{ language: string; count: number; percentage: number }>;
  topRepositories: GitHubRepository[];
  suggestedResumeBullets?: string[];
  syncMethod?: 'username' | 'oauth';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  plan: PlanTier;
  avatarUrl: string;
  headline: string;
  universityOrCompany: string;
  targetRole: string;
  bio: string;
  monthlyAnalysisCount: number;
  monthlyAnalysisLimit: number;
  createdAt: string;
  isSupabaseUser?: boolean;
  isEmailVerified?: boolean;
  isDemo?: boolean;
  githubProfile?: GitHubProfileData;
}

export interface ResumeAnalysisResult {
  id: string;
  timestamp: string;
  candidateName: string;
  contactDetails?: {
    email?: string;
    phone?: string;
    location?: string;
    links?: string[];
  };
  targetRoleDetected: string;
  experienceLevel: string;
  atsScore: number;
  scoresBreakdown: {
    impact: number;
    formatting: number;
    brevity: number;
    keywords: number;
  };
  extractedSkills: {
    technical: string[];
    soft: string[];
    tools: string[];
  };
  education?: Array<{
    institution: string;
    degree: string;
    year?: string;
    gpa?: string;
    details?: string;
  }>;
  workExperience?: Array<{
    company: string;
    role: string;
    duration?: string;
    achievements: string[];
  }>;
  projects?: Array<{
    name: string;
    description: string;
    techStack?: string[];
  }>;
  strengths: string[];
  weaknesses: string[];
  missingSkillsAndSuggestions?: Array<{
    skill: string;
    rationale: string;
    recommendedAction: string;
  }>;
  grammarAndSpelling?: Array<{
    originalText: string;
    suggestedCorrection: string;
    explanation: string;
  }>;
  improvedProfessionalSummary?: string;
  actionVerbsCount: number;
  actionVerbsSuggestions: string[];
  bulletPointImprovements: Array<{
    original: string;
    improved: string;
    reason: string;
  }>;
  atsKeywordSuggestions?: Array<{
    keyword: string;
    category: string;
    status: 'found' | 'missing';
    recommendation: string;
  }>;
  recommendedCertifications: string[];
  summaryReview: string;
  rawResumeText?: string;
  fileName?: string;
  fileSize?: number;
  storageFilePath?: string;
  isDirectGemini?: boolean;
  aiEngine?: string;
}

export interface JobMatchResult {
  id: string;
  timestamp: string;
  companyName: string;
  jobTitle: string;
  overallMatchScore: number;
  categoryScores: {
    skillsMatch: number;
    experienceMatch: number;
    educationMatch: number;
    domainRelevance: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  bonusSkills: string[];
  atsKeywordCheck: Array<{
    keyword: string;
    foundInResume: boolean;
    importance: 'critical' | 'preferred' | 'optional';
  }>;
  interviewProbability: 'High' | 'Medium' | 'Low';
  tailoringAdvice: string[];
  recommendedResumeEdits: Array<{
    section: string;
    suggestion: string;
  }>;
  verdict: string;
  jobDescriptionText?: string;
}

export interface CoverLetterResult {
  id: string;
  timestamp: string;
  companyName: string;
  jobTitle: string;
  tone: 'confident' | 'enthusiastic' | 'corporate' | 'creative';
  coverLetterText: string;
  subjectLine: string;
  keySellingPoints: string[];
  suggestedCallToAction: string;
}

export type ApplicationStatus =
  | 'wishlist'
  | 'applied'
  | 'screening'
  | 'interviewing'
  | 'offered'
  | 'rejected';

export interface JobApplication {
  id: string;
  companyName: string;
  jobTitle: string;
  location: string;
  salaryRange?: string;
  applicationDate: string;
  status: ApplicationStatus;
  interviewDate?: string;
  notes: string;
  matchScore?: number;
  jobUrl?: string;
  contactPerson?: string;
}

export interface InterviewPrepData {
  likelyQuestions: Array<{
    question: string;
    category: string;
    sampleAnswerFramework: string;
    tip: string;
  }>;
  questionsToAskInterviewer: string[];
  companyResearchTips: string[];
}

export interface RemotiveJob {
  id: number | string;
  url: string;
  title: string;
  companyName: string;
  companyLogo: string | null;
  category: string;
  tags: string[];
  jobType: string;
  publicationDate: string;
  candidateRequiredLocation: string;
  salary: string | null;
  description: string;
  source: 'Remotive';
  isNew?: boolean;
  isFresherFriendly?: boolean;
  isIndiaEligible?: boolean;
  matchScore?: number;
  matchedSkills?: string[];
}

// -------------------------------------------------------------
// 1. AI Skill Gap Analyzer Types
// -------------------------------------------------------------
export interface SkillGapItem {
  skill: string;
  category: 'technical' | 'soft' | 'tool' | 'framework' | 'domain';
  priority: 'high' | 'medium' | 'low';
  currentStatus: 'missing' | 'partial' | 'proficient';
  rationale: string;
  recommendedLearningResource?: string;
  estimatedTimeToLearn?: string;
}

export interface SkillGapResult {
  id: string;
  timestamp: string;
  targetRole: string;
  customJobTitle?: string;
  skillMatchPercentage: number;
  existingSkills: {
    technical: string[];
    soft: string[];
  };
  missingSkills: SkillGapItem[];
  partiallyMatchingSkills: SkillGapItem[];
  experienceGaps: string[];
  personalizedImprovementPlan: Array<{
    phase: string;
    focus: string;
    actions: string[];
    deliverable: string;
  }>;
  strengthsSummary: string;
  summaryVerdict: string;
}

// -------------------------------------------------------------
// 2. AI Mock Interview Platform Types
// -------------------------------------------------------------
export type InterviewDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type InterviewCategory = 'role-specific' | 'technical' | 'hr' | 'behavioral' | 'system-design';

export interface MockInterviewQuestion {
  id: string;
  question: string;
  category: InterviewCategory;
  difficulty: InterviewDifficulty;
  intent: string;
  keyPointsToCover: string[];
  userAnswer?: string;
  timeSpentSeconds?: number;
  followUpQuestion?: string;
  followUpAnswer?: string;
  evaluation?: MockQuestionEvaluation;
}

export interface MockQuestionEvaluation {
  scoreOutOf10: number;
  communicationScore: number;
  technicalAccuracyScore: number;
  strengths: string[];
  weaknesses: string[];
  modelAnswer: string;
  improvementTip: string;
}

export interface MockInterviewSession {
  id: string;
  timestamp: string;
  targetRole: string;
  difficulty: InterviewDifficulty;
  category: InterviewCategory;
  questions: MockInterviewQuestion[];
  overallScore?: number;
  overallFeedback?: string;
  communicationSummary?: string;
  technicalSummary?: string;
  hiringVerdict?: 'Strong Hire' | 'Hire' | 'Leaning Hire' | 'Needs Practice';
  completedAt?: string;
}

// -------------------------------------------------------------
// 3. Personalized AI Learning Roadmap Types
// -------------------------------------------------------------
export interface LearningResource {
  title: string;
  type: 'documentation' | 'tutorial' | 'course' | 'interactive';
  url: string;
  isFree: boolean;
  provider: string;
}

export interface DailyLearningTask {
  dayNumber: number;
  taskTitle: string;
  description: string;
  estimatedMinutes: number;
  exercise: string;
  completed?: boolean;
}

export interface WeeklyRoadmapModule {
  weekNumber: number;
  weekTitle: string;
  coreObjective: string;
  keySkills: string[];
  recommendedTechnologies: string[];
  resources: LearningResource[];
  handsOnProject: {
    title: string;
    description: string;
    deliverables: string[];
  };
  dailyTasks: DailyLearningTask[];
  completed?: boolean;
}

export interface LearningRoadmapResult {
  id: string;
  timestamp: string;
  targetRole: string;
  experienceLevel: string;
  durationWeeks: number;
  currentSkillsCovered: string[];
  targetSkillsToMaster: string[];
  weeklyModules: WeeklyRoadmapModule[];
  careerMilestones: string[];
}

// -------------------------------------------------------------
// 4. Smart Job Application Assistant Types
// -------------------------------------------------------------
export type OutreachType =
  | 'recruiter_inmail'
  | 'linkedin_connection'
  | 'application_email'
  | 'post_interview_followup'
  | 'offer_negotiation'
  | 'interview_acceptance';

export interface SmartOutreachDraft {
  id: string;
  timestamp: string;
  companyName: string;
  jobTitle: string;
  contactName?: string;
  type: OutreachType;
  subject?: string;
  messageContent: string;
  recommendedTiming: string;
  proTips: string[];
  isCustomized?: boolean;
}

// -------------------------------------------------------------
// 5. AI Portfolio Website Builder Types
// -------------------------------------------------------------
export type PortfolioTemplateId = 'modern_minimal' | 'cyber_dark' | 'executive_clean' | 'creative_developer';

export interface PortfolioProjectItem {
  id: string;
  title: string;
  tagline: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  liveUrl?: string;
  highlights: string[];
}

export interface PortfolioExperienceItem {
  id: string;
  role: string;
  organization: string;
  period: string;
  location?: string;
  type: 'internship' | 'full-time' | 'freelance' | 'academic';
  achievements: string[];
}

export interface PortfolioEducationItem {
  id: string;
  institution: string;
  degree: string;
  field: string;
  year: string;
  gpa?: string;
}

export interface PortfolioProfileData {
  id?: string;
  fullName: string;
  headline: string;
  aboutBio: string;
  email: string;
  phone?: string;
  location: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  skills: {
    technical: string[];
    frameworks: string[];
    tools: string[];
    soft: string[];
  };
  projects: PortfolioProjectItem[];
  experience: PortfolioExperienceItem[];
  education: PortfolioEducationItem[];
  certifications: string[];
  theme: {
    templateId: PortfolioTemplateId;
    accentColor: string;
    customCss?: string;
  };
  generatedHtml?: string;
}

// -------------------------------------------------------------
// 6. AI Salary and Career Insights Types
// -------------------------------------------------------------
export interface SalaryRangeBand {
  min: number;
  median: number;
  p75: number;
  max: number;
  currency: string;
  period: 'yearly' | 'monthly';
}

export interface SalaryInsightsResult {
  id: string;
  timestamp: string;
  jobTitle: string;
  country: string;
  city: string;
  experienceLevel: string;
  industry: string;
  salaryBand: SalaryRangeBand;
  entryLevelOpportunities: {
    availabilityRating: 'Very High' | 'High' | 'Moderate' | 'Selective';
    description: string;
    fresherAverageSalary: string;
  };
  topInDemandSkills: Array<{
    skill: string;
    demandLevel: 'Critical' | 'High' | 'Growing';
    salaryPremium: string;
  }>;
  careerProgressionLadder: Array<{
    level: string;
    typicalTenure: string;
    expectedCompensation: string;
    keyMilestone: string;
  }>;
  relatedJobRoles: Array<{
    title: string;
    similarity: string;
    salaryComparison: string;
  }>;
  industryTrends: string[];
  dataSourceNote: string;
}

// -------------------------------------------------------------
// 7. Career Mentor AI Types
// -------------------------------------------------------------
export type MentorLanguage = 'en' | 'ta' | 'tanglish';

export interface MentorChatMessage {
  id: string;
  sender: 'user' | 'mentor';
  text: string;
  timestamp: string;
  language?: MentorLanguage;
  actionableFollowUps?: string[];
  recommendedTool?: string;
}

// -------------------------------------------------------------
// 8. Feature Usage Tracking & Engagement Visualization Types
// -------------------------------------------------------------
export type FeatureUsageType =
  | 'resume_analysis'
  | 'job_application'
  | 'skill_gap_analysis'
  | 'mock_interview'
  | 'cover_letter'
  | 'job_match'
  | 'roadmap_task';

export interface FeatureUsageLog {
  id: string;
  userId: string;
  featureName: FeatureUsageType;
  actionDescription?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface EngagementSummary {
  totalActions: number;
  resumeAnalysesCount: number;
  jobApplicationsCount: number;
  skillGapsCount: number;
  mockInterviewsCount: number;
  coverLettersCount: number;
  engagementTier: 'Novice Explorer' | 'Steady Jobseeker' | 'Proactive Job Hunter' | 'Elite Candidate';
  weeklyActivity: Array<{ date: string; dayLabel: string; count: number }>;
  recentLogs: FeatureUsageLog[];
}


