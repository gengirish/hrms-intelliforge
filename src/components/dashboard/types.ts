import type { EnrollmentRecord as LearningEnrollmentRecord } from "@/components/learning/enroll-course-modal";

export type { LearningEnrollmentRecord };

export const LEARNING_BASE_URL = "https://learning.intelliforge.tech";

export type BootState = "loading" | "forbidden" | "error" | "ready";

export type DashboardTab =
  | "overview"
  | "attendance"
  | "tasks"
  | "learning"
  | "emails"
  | "notifications"
  | "analytics";

export interface Intern {
  id: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  branch: string;
  year: string;
  role: string;
  startDate: string;
  durationWeeks: number;
  stipendPaise: number;
  mentorId: string | null;
  aadharUrl: string | null;
  panUrl: string | null;
  photoUrl: string | null;
  agentmailInboxId?: string | null;
  agentmailAddress?: string | null;
  whatsappOptIn?: boolean;
  status: string;
  deactivated?: boolean;
  deactivatedAt?: string | null;
  acceptedAt: string | null;
  createdAt: string;
  attendance?: AttendanceRecord[];
  tasks?: TaskRecord[];
  messages?: EmailMessage[];
  learningEnrollments?: LearningEnrollmentRecord[];
}

export interface AttendanceRecord {
  id: string;
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  mode: string;
  dailyStatus?: string | null;
}

export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  status: string;
  hours: number;
  week: string;
}

export interface EmailMessage {
  messageId: string;
  subject: string;
  from: string;
  createdAt: string;
  text: string;
}

export interface NotificationRecord {
  id: string;
  channel: "EMAIL" | "WHATSAPP";
  type: string;
  subject: string | null;
  body: string;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface PerformanceScoreRecord {
  id: string;
  weekLabel: string;
  attendanceScore: number;
  taskScore: number;
  consistencyScore: number;
  overallScore: number;
  riskLevel: string;
}

export interface PerformanceReviewRecord {
  id: string;
  summary: string;
  recommendation: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
}

export interface DocVerification {
  id: string;
  documentType: string;
  status: string;
  extractedName: string | null;
  extractedNumber: string | null;
  nameMatch: boolean | null;
  formatValid: boolean | null;
  reviewNote: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface MentorOption {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  punchedOut: number;
  withStatus: number;
}

export interface DashboardStats {
  total: number;
  pending: number;
  offered: number;
  active: number;
  completed: number;
  deactivated: number;
}
