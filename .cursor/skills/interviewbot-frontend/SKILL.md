---
name: interviewbot-frontend
description: Build and maintain the Interview Bot Next.js frontend with dashboard UI, candidate interview pages, and responsive design. Use when creating pages, components, layouts, forms, or frontend configuration.
---

# Interview Bot Next.js Frontend

## Tech Stack

```json
{
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "react-dom": "^18.3",
    "@radix-ui/react-dialog": "^1.1",
    "@radix-ui/react-dropdown-menu": "^2.1",
    "@radix-ui/react-tabs": "^1.1",
    "@radix-ui/react-select": "^2.1",
    "class-variance-authority": "^0.7",
    "clsx": "^2.1",
    "tailwind-merge": "^2.5",
    "lucide-react": "^0.460",
    "recharts": "^2.13",
    "zustand": "^4.5",
    "@tanstack/react-query": "^5.60",
    "@livekit/components-react": "^2.6",
    "livekit-client": "^2.6",
    "@monaco-editor/react": "^4.6",
    "react-hook-form": "^7.53",
    "@hookform/resolvers": "^3.9",
    "zod": "^3.23",
    "sonner": "^1.7",
    "date-fns": "^3.6"
  }
}
```

## API Client

Typed client wrapping `fetch` with automatic auth headers.

```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined"
    ? localStorage.getItem("token")
    : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  health: () => request<{ status: string }>("/api/v1/health"),

  // Auth
  login: (email: string, password: string) =>
    request<{ access_token: string; role: string }>("/api/v1/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    }),
  signup: (data: SignupRequest) =>
    request<{ access_token: string }>("/api/v1/auth/signup", {
      method: "POST", body: JSON.stringify(data),
    }),

  // Job Postings
  getJobPostings: (page = 1) =>
    request<JobPostingListResponse>(`/api/v1/job-postings?page=${page}`),
  createJobPosting: (data: JobPostingCreateRequest) =>
    request<JobPostingResponse>("/api/v1/job-postings", {
      method: "POST", body: JSON.stringify(data),
    }),

  // Interviews
  getInterviews: (jobId?: string) =>
    request<InterviewSession[]>(`/api/v1/interviews${jobId ? `?job_id=${jobId}` : ""}`),
  getReport: (sessionId: string) =>
    request<CandidateReport>(`/api/v1/reports/${sessionId}`),

  // Public (candidate-facing)
  getPublicInterview: (token: string) =>
    request<PublicInterviewInfo>(`/api/v1/interviews/public/${token}`),
  startInterview: (token: string, data: InterviewStartRequest) =>
    request<InterviewSession>(`/api/v1/interviews/public/${token}/start`, {
      method: "POST", body: JSON.stringify(data),
    }),

  // Analytics
  getDashboardStats: () => request<DashboardStats>("/api/v1/analytics/dashboard"),

  // Billing
  getSubscription: () => request<Subscription>("/api/v1/billing/subscription"),
  createCheckout: (planId: string) =>
    request<{ url: string }>("/api/v1/billing/checkout", {
      method: "POST", body: JSON.stringify({ plan_id: planId }),
    }),
};
```

## Page Template

```tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function FeaturePage() {
  const [data, setData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getData()
      .then(setData)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Feature</h1>
      </div>
      {/* Content */}
    </div>
  );
}
```

## Dashboard Layout

```tsx
// app/(dashboard)/layout.tsx
"use client";
import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
      <Sidebar className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64" />
      <MobileNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
```

## KPI Card

```tsx
// components/dashboard/kpi-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string;
  changePct: number;
  icon: React.ReactNode;
  loading?: boolean;
}

export function KPICard({ label, value, changePct, icon, loading }: KPICardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-8 w-32 animate-pulse rounded bg-slate-200" />
        </CardContent>
      </Card>
    );
  }

  const isPositive = changePct >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className={`mt-1 flex items-center gap-1 text-sm ${
          isPositive ? "text-emerald-600" : "text-red-600"
        }`}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {isPositive ? "+" : ""}{changePct.toFixed(1)}%
        </div>
      </CardContent>
    </Card>
  );
}
```

## Form Pattern (React Hook Form + Zod)

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@/lib/api";

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  job_description: z.string().min(50, "Description must be at least 50 characters"),
  role_type: z.enum(["technical", "non_technical", "mixed"]),
  interview_format: z.enum(["text", "voice", "video"]),
});

type FormData = z.infer<typeof schema>;

export function CreateJobForm({ onSuccess }: { onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      await api.createJobPosting(data);
      toast.success("Job posting created!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
        <input
          {...register("title")}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          placeholder="e.g. Senior Backend Engineer"
        />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
      </div>
      {/* More fields... */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
      >
        {isSubmitting ? "Creating..." : "Create Job Posting"}
      </button>
    </form>
  );
}
```

## Candidate Interview Page (Dark Theme)

The candidate-facing interview page uses a dark theme, distinct from the dashboard.

```tsx
// app/interview/[token]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { InterviewChat } from "@/components/interview/interview-chat";
import { InterviewVoice } from "@/components/interview/interview-voice";
import { InterviewVideo } from "@/components/interview/interview-video";

export default function InterviewPage() {
  const { token } = useParams<{ token: string }>();

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Interview UI renders based on format */}
    </div>
  );
}
```

## Chat Bubble Component

```tsx
// components/interview/chat-bubble.tsx
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  role: "interviewer" | "candidate";
  content: string;
  timestamp?: string;
}

export function ChatBubble({ role, content, timestamp }: ChatBubbleProps) {
  const isInterviewer = role === "interviewer";

  return (
    <div className={cn("flex", isInterviewer ? "justify-start" : "justify-end")}>
      <div className={cn(
        "max-w-[75%] rounded-2xl px-4 py-3 text-sm",
        isInterviewer
          ? "bg-slate-700 text-slate-100 rounded-bl-md"
          : "bg-indigo-600 text-white rounded-br-md"
      )}>
        <p>{content}</p>
        {timestamp && (
          <span className="mt-1 block text-xs opacity-60">{timestamp}</span>
        )}
      </div>
    </div>
  );
}
```

## Loading Skeleton

```tsx
function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
    </div>
  );
}
```

## Error Boundary

```tsx
// app/(dashboard)/error.tsx
"use client";
export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold text-slate-900">Something went wrong</h2>
      <p className="text-slate-500">{error.message}</p>
      <button onClick={reset} className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500">
        Try again
      </button>
    </div>
  );
}
```

## Key Rules

1. **Never hardcode backend URLs** -- use `NEXT_PUBLIC_API_URL`
2. **Always use the `api` client** -- never raw `fetch` in components
3. **Always provide loading skeletons** -- never blank screens
4. **Always define TypeScript interfaces** for API responses
5. **Dashboard pages use light theme** -- slate/indigo palette
6. **Candidate interview pages use dark theme** -- slate-900 background
7. **Toast notifications via sonner** -- never `alert()`
8. **Icons from `lucide-react` only**
9. **Mobile-first** -- design for 375px, scale up with `sm:`, `md:`, `lg:`
10. **Sidebar collapses** on screens < 1024px
