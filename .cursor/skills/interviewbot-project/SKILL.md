---
name: interviewbot-project
description: Provides architecture knowledge for the AI Interview Bot SaaS platform. Use when exploring the codebase, adding features, debugging, or asking about project structure, tech stack, conventions, database schema, or design system.
---

# AI Interview Bot — Project Architecture

## Project Context

AI Interview Bot is a SaaS platform that conducts automated interviews for any job role using AI. Customers (companies) subscribe and configure interviews per job posting. Candidates receive a unique link to complete text, voice, or video interviews. The platform scores candidates, generates reports, and provides analytics dashboards. Sold as "Interview as a Service" with tiered subscriptions via Stripe.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend Framework | FastAPI (Python 3.12+) |
| Package Manager | uv (lockfile: uv.lock) |
| Task Runner | Nox + nox-uv |
| Linter / Formatter | Ruff |
| Type Checker | mypy (strict mode) |
| Frontend Framework | Next.js 14 (App Router), React 18, TypeScript |
| Database | PostgreSQL 16, SQLAlchemy 2.0 (async), Alembic |
| Cache / Queue | Redis, Celery |
| Auth | JWT (python-jose) + OAuth2 (Google SSO) |
| UI Components | shadcn/ui, Radix UI, Tailwind CSS |
| State Management | Zustand, TanStack Query |
| Charts | Recharts |
| LLM | OpenAI GPT-4o (primary), Claude (fallback) |
| Speech-to-Text | OpenAI Whisper API |
| Text-to-Speech | ElevenLabs API |
| Video/Voice | LiveKit (WebRTC) |
| Code Execution | Judge0 API (sandboxed) |
| Code Editor | Monaco Editor |
| Billing | Stripe (subscriptions + usage metering) |
| Media Storage | AWS S3 / MinIO |
| Deployment | Docker, Docker Compose, GitHub Actions |
| Monitoring | Sentry, Prometheus, Grafana |

## Project Structure

```
interview-with-giri/
├── backend/
│   ├── src/interviewbot/           # Python package (src-layout)
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app factory
│   │   ├── config.py               # Pydantic Settings
│   │   ├── dependencies.py         # DI: DB, current_user, org
│   │   ├── routers/
│   │   │   ├── health.py
│   │   │   ├── auth.py
│   │   │   ├── organizations.py
│   │   │   ├── job_postings.py
│   │   │   ├── interviews.py
│   │   │   ├── reports.py
│   │   │   └── billing.py
│   │   ├── services/
│   │   │   ├── ai_engine.py        # LLM orchestration
│   │   │   ├── interview_service.py
│   │   │   ├── scoring_service.py
│   │   │   ├── speech_service.py   # STT + TTS
│   │   │   ├── code_eval_service.py
│   │   │   └── billing_service.py
│   │   ├── models/
│   │   │   ├── database.py         # SQLAlchemy async engine
│   │   │   ├── tables.py           # ORM models
│   │   │   └── schemas.py          # Pydantic request/response
│   │   ├── middleware/
│   │   │   ├── tenant.py           # Multi-tenant context
│   │   │   └── auth.py
│   │   ├── workers/                # Celery tasks
│   │   │   ├── report_worker.py
│   │   │   └── email_worker.py
│   │   ├── websocket/
│   │   │   ├── chat_handler.py
│   │   │   └── voice_handler.py
│   │   └── utils/
│   │       └── logger.py           # structlog setup
│   ├── alembic/
│   ├── tests/
│   ├── pyproject.toml              # Single source of truth (deps, tools, config)
│   ├── uv.lock                     # Locked dependencies for reproducibility
│   ├── noxfile.py                  # Task automation (test, lint, type_check, fmt)
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js App Router
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── signup/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx      # Sidebar + topbar shell
│   │   │   │   ├── page.tsx        # Overview
│   │   │   │   ├── jobs/
│   │   │   │   ├── interviews/
│   │   │   │   ├── reports/
│   │   │   │   ├── analytics/
│   │   │   │   └── settings/
│   │   │   └── interview/
│   │   │       └── [token]/page.tsx  # Candidate interview page
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui primitives
│   │   │   ├── interview/          # Chat, voice, video UIs
│   │   │   ├── code-editor/        # Monaco editor wrapper
│   │   │   ├── dashboard/          # Charts, KPI cards, tables
│   │   │   └── layout/             # Sidebar, topbar, mobile nav
│   │   ├── lib/
│   │   │   ├── api.ts              # Typed API client
│   │   │   ├── socket.ts           # WebSocket client
│   │   │   ├── livekit.ts          # LiveKit client
│   │   │   └── utils.ts            # cn() helper
│   │   ├── hooks/
│   │   │   ├── use-interview.ts
│   │   │   └── use-auth.ts
│   │   └── types/
│   │       └── index.ts
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── db/
│   ├── init.sql                    # Schema DDL
│   └── seed.sql                    # Demo data
├── docker/
│   └── docker-compose.yml
├── .cursor/skills/                 # Cursor AI skills
├── .github/workflows/
├── .env.example
└── README.md
```

## Database Schema

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `organization` | Tenant (customer company) | id (UUID), name, domain, settings (JSON) |
| `users` | Org members | id (UUID), org_id (FK), email, role, password_hash |
| `subscription` | Stripe billing | id (UUID), org_id (FK), stripe_subscription_id, plan_tier, interviews_remaining |
| `job_posting` | Interview config per role | id (UUID), org_id (FK), title, role_type, job_description, required_skills (JSON), interview_config (JSON), interview_format |
| `interview_session` | One candidate interview | id (UUID), job_posting_id (FK), candidate_name, candidate_email, status, format, overall_score, duration_seconds |
| `interview_message` | Chat messages/turns | id (UUID), session_id (FK), role, content, media_url |
| `candidate_report` | AI-generated report | id (UUID), session_id (FK), skill_scores (JSON), behavioral_scores (JSON), ai_summary, recommendation, confidence_score |

## User Roles (RBAC)

| Role | Permissions |
|------|-------------|
| Admin | Full org access, billing, user management, all interviews |
| Hiring Manager | CRUD job postings, view interviews/reports, invite candidates |
| Viewer | Read-only access to interviews and reports |

## User Journeys

### Hiring Manager Flow
```
Sign up → Create org → Subscribe (Stripe) → Create job posting
  → Configure interview (format, questions, duration)
  → Generate candidate link → Send invitation email
  → View completed interviews → Compare candidates → Hire
```

### Candidate Flow
```
Receive email link → Open interview page → Consent + device check
  → Start interview (text/voice/video) → Answer questions
  → AI asks follow-ups → Interview ends → Thank you page
```

## Design System

- **Background**: Slate-50 to white gradient (light theme primary)
- **Primary accent**: Indigo-600 (#4f46e5)
- **Success**: Emerald-500 (#10b981)
- **Danger**: Red-500 (#ef4444)
- **Text**: Slate-900 primary, Slate-500 secondary
- **Font**: Inter (body + headings)
- **Cards**: `bg-white border border-slate-200 rounded-xl shadow-sm`
- **Candidate interview page**: Dark theme (`bg-slate-900`, white text)

## Environment Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | Backend | PostgreSQL async connection |
| `REDIS_URL` | Backend | Redis connection |
| `JWT_SECRET` | Backend | Token signing |
| `OPENAI_API_KEY` | Backend | GPT-4o for interview AI |
| `ANTHROPIC_API_KEY` | Backend | Claude fallback |
| `ELEVENLABS_API_KEY` | Backend | Text-to-speech |
| `LIVEKIT_API_KEY` | Backend | LiveKit server SDK |
| `LIVEKIT_API_SECRET` | Backend | LiveKit server SDK |
| `LIVEKIT_URL` | Both | LiveKit server URL |
| `STRIPE_SECRET_KEY` | Backend | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Backend | Webhook verification |
| `JUDGE0_API_URL` | Backend | Code execution sandbox |
| `AWS_ACCESS_KEY_ID` | Backend | S3 media storage |
| `AWS_SECRET_ACCESS_KEY` | Backend | S3 media storage |
| `S3_BUCKET_NAME` | Backend | Media bucket |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend API base URL |
| `NEXT_PUBLIC_LIVEKIT_URL` | Frontend | LiveKit WebSocket URL |
| `NEXT_PUBLIC_STRIPE_KEY` | Frontend | Stripe publishable key |

## Naming Conventions

| Used for | Style | Example |
|----------|-------|---------|
| Python package, files | snake_case | `interviewbot`, `ai_engine.py` |
| Python classes | PascalCase | `InterviewEngine`, `BookingResponse` |
| API routes | kebab-case | `/api/v1/job-postings` |
| DB tables | snake_case | `interview_session`, `candidate_report` |
| Next.js components | PascalCase | `InterviewChat.tsx`, `KPICard.tsx` |
| Next.js pages/dirs | kebab-case | `job-postings/`, `[token]/` |
| CSS/Tailwind | kebab-case | `text-slate-900`, `bg-indigo-600` |
| Env vars | UPPER_SNAKE_CASE | `OPENAI_API_KEY` |

## Key Rules

1. **Always use `src/` layout** for the Python backend package
2. **`pyproject.toml` is the single source of truth** for deps, tools, and config
3. **Use `uv` for package management** -- `uv sync` to install, `uv lock` to update
4. **Use `nox` for task automation** -- `uv run nox -s test`, `uv run nox -s lint`
5. **Use `ruff` for linting and formatting** -- replaces flake8, isort, black
6. **Use `mypy` in strict mode** -- full type checking
7. **Never mix secrets with structural config** -- `.env` for secrets only
8. **Always use structlog** -- never `print()`
5. **Every tenant-scoped table has `org_id`** -- multi-tenant isolation
6. **Frontend and backend are independently deployable**
7. **All API routes versioned** under `/api/v1/`
8. **Interview candidate pages are public** (accessed via unique token)
9. **Dashboard pages require authentication**
