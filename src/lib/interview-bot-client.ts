const INTERVIEW_BOT_URL = process.env.INTERVIEW_BOT_API_URL ?? "http://localhost:8000";
const INTERVIEW_BOT_KEY = process.env.INTERVIEW_BOT_API_KEY ?? "";

interface CreateInterviewConfigRequest {
  title: string;
  description: string;
  skills: string[];
  orgId: string;
}

interface InterviewConfig {
  id: string;
  interviewLink: string;
}

interface InterviewReport {
  candidateId: string;
  score: number;
  status: string;
  reportUrl: string;
  summary: string;
}

async function botFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${INTERVIEW_BOT_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${INTERVIEW_BOT_KEY}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Interview Bot API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function createInterviewConfig(
  data: CreateInterviewConfigRequest
): Promise<InterviewConfig> {
  return botFetch<InterviewConfig>("/api/v1/interviews", {
    method: "POST",
    body: JSON.stringify({
      title: data.title,
      description: data.description,
      required_skills: data.skills,
      organization_id: data.orgId,
    }),
  });
}

export async function getInterviewReport(reportId: string): Promise<InterviewReport> {
  return botFetch<InterviewReport>(`/api/v1/reports/${reportId}`);
}

export async function listInterviewConfigs(orgId: string) {
  return botFetch<{ configs: InterviewConfig[] }>(
    `/api/v1/interviews?organization_id=${orgId}`
  );
}
