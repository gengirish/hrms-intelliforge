---
name: interviewbot-database
description: Set up and maintain PostgreSQL database, SQLAlchemy async models, Alembic migrations, multi-tenant queries, and Redis caching for the Interview Bot. Use when working with database schemas, migrations, ORM models, queries, or caching.
---

# Interview Bot Data Layer

## Database Schema

```sql
-- db/init.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS organization (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',   -- 'admin', 'hiring_manager', 'viewer'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    plan_tier VARCHAR(50) NOT NULL DEFAULT 'free',  -- 'free', 'starter', 'professional', 'enterprise'
    interviews_limit INTEGER DEFAULT 10,
    interviews_used INTEGER DEFAULT 0,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'active',            -- 'active', 'past_due', 'cancelled'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_posting (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    role_type VARCHAR(50) NOT NULL,                -- 'technical', 'non_technical', 'mixed'
    job_description TEXT NOT NULL,
    required_skills JSONB DEFAULT '[]',
    interview_config JSONB DEFAULT '{"num_questions": 10, "duration_minutes": 30, "difficulty": "medium", "include_coding": false}',
    interview_format VARCHAR(20) DEFAULT 'text',   -- 'text', 'voice', 'video'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_session (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_posting_id UUID NOT NULL REFERENCES job_posting(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organization(id),
    token VARCHAR(64) UNIQUE NOT NULL,             -- unique link token for candidate
    candidate_name VARCHAR(255),
    candidate_email VARCHAR(255),
    status VARCHAR(30) DEFAULT 'pending',          -- 'pending', 'in_progress', 'completed', 'expired', 'disconnected'
    format VARCHAR(20) DEFAULT 'text',
    overall_score NUMERIC(4, 2),
    duration_seconds INTEGER,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_message (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES interview_session(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,                     -- 'interviewer', 'candidate', 'system'
    content TEXT NOT NULL,
    media_url TEXT,                                -- S3 URL for voice/video recordings
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidate_report (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID UNIQUE NOT NULL REFERENCES interview_session(id) ON DELETE CASCADE,
    skill_scores JSONB DEFAULT '{}',
    behavioral_scores JSONB DEFAULT '{}',
    ai_summary TEXT,
    strengths JSONB DEFAULT '[]',
    concerns JSONB DEFAULT '[]',
    recommendation VARCHAR(50),                    -- 'strong_hire', 'hire', 'no_hire'
    confidence_score NUMERIC(3, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_job_posting_org ON job_posting(org_id);
CREATE INDEX idx_session_job ON interview_session(job_posting_id);
CREATE INDEX idx_session_org ON interview_session(org_id);
CREATE INDEX idx_session_token ON interview_session(token);
CREATE INDEX idx_session_status ON interview_session(status);
CREATE INDEX idx_message_session ON interview_message(session_id);
CREATE INDEX idx_report_session ON candidate_report(session_id);
CREATE INDEX idx_subscription_org ON subscription(org_id);
```

## Seed Data

```sql
-- db/seed.sql

INSERT INTO organization (id, name, domain) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Demo Corp', 'democorp.com');

INSERT INTO users (org_id, email, password_hash, full_name, role) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@democorp.com', '$2b$12$PLACEHOLDER_HASH', 'Admin User', 'admin'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'hiring@democorp.com', '$2b$12$PLACEHOLDER_HASH', 'Hiring Manager', 'hiring_manager');

INSERT INTO subscription (org_id, plan_tier, interviews_limit, status) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'professional', 200, 'active');

INSERT INTO job_posting (org_id, title, role_type, job_description, required_skills, interview_format) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Senior Backend Engineer', 'technical',
 'We are looking for a Senior Backend Engineer with 5+ years of experience in Python, FastAPI, PostgreSQL, and distributed systems.',
 '["Python", "FastAPI", "PostgreSQL", "Redis", "Docker"]', 'text');
```

## SQLAlchemy Async Setup

```python
# src/interviewbot/models/database.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from interviewbot.config import get_settings

def get_engine():
    settings = get_settings()
    return create_async_engine(settings.database_url, echo=settings.debug, pool_size=10)

def get_session_factory():
    return async_sessionmaker(get_engine(), class_=AsyncSession, expire_on_commit=False)
```

## SQLAlchemy ORM Models

```python
# src/interviewbot/models/tables.py
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import DeclarativeBase, relationship

class Base(DeclarativeBase):
    pass

class Organization(Base):
    __tablename__ = "organization"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    domain = Column(String(255))
    settings = Column(JSONB, default={})
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organization.id"), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="viewer")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class InterviewSession(Base):
    __tablename__ = "interview_session"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_posting_id = Column(UUID(as_uuid=True), ForeignKey("job_posting.id"), nullable=False)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organization.id"), nullable=False)
    token = Column(String(64), unique=True, nullable=False)
    candidate_name = Column(String(255))
    candidate_email = Column(String(255))
    status = Column(String(30), default="pending")
    format = Column(String(20), default="text")
    overall_score = Column(Numeric(4, 2))
    duration_seconds = Column(Integer)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    messages = relationship("InterviewMessage", back_populates="session")
```

## Alembic Setup

```bash
# Initialize (once)
cd backend && alembic init alembic

# Create migration
alembic revision --autogenerate -m "description of change"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

Configure `alembic/env.py` to use async engine:

```python
# alembic/env.py (key parts)
from interviewbot.models.tables import Base
from interviewbot.config import get_settings

target_metadata = Base.metadata

def get_url():
    settings = get_settings()
    return settings.database_url
```

## Multi-Tenant Query Pattern

Every query on tenant-scoped data MUST filter by `org_id`.

```python
from sqlalchemy import select

# Correct: always filter by org_id
stmt = select(JobPosting).where(
    JobPosting.org_id == org_id,
    JobPosting.is_active == True,
).order_by(JobPosting.created_at.desc())

# WRONG: never query without org_id filter
stmt = select(JobPosting).where(JobPosting.is_active == True)  # TENANT LEAK!
```

## Avoiding N+1 Queries

Never loop over IDs executing one query per iteration. Use batch queries with `in_()`:

```python
# WRONG: N+1 pattern (3 queries per session = 15 queries for 5 sessions)
for sid in session_ids:
    session = await db.execute(select(InterviewSession).where(InterviewSession.id == sid))
    report = await db.execute(select(CandidateReport).where(CandidateReport.session_id == sid))

# CORRECT: Batch load in 2 queries total
sessions_result = await db.execute(
    select(InterviewSession).where(InterviewSession.id.in_(session_ids))
)
sessions_map = {s.id: s for s in sessions_result.scalars().all()}

reports_result = await db.execute(
    select(CandidateReport).where(CandidateReport.session_id.in_(session_ids))
)
reports_map = {r.session_id: r for r in reports_result.scalars().all()}
```

For related data, use `selectinload()` or `joinedload()`:

```python
from sqlalchemy.orm import selectinload

# Load sessions with their messages in one query
stmt = select(InterviewSession).where(
    InterviewSession.org_id == org_id,
).options(selectinload(InterviewSession.messages))
```

For existence checks in loops, prefetch all matches:

```python
# WRONG: query per title in a loop
for job in jobs:
    existing = await db.execute(
        select(JobPosting).where(JobPosting.title == job.title)
    )

# CORRECT: batch check
all_titles = [j.title for j in jobs]
existing_result = await db.execute(
    select(JobPosting.title).where(
        JobPosting.org_id == org_id,
        JobPosting.title.in_(all_titles),
    )
)
existing_titles = set(existing_result.scalars().all())
```

## Redis Caching

```python
# Interview session state (active conversation) stored in Redis
import redis.asyncio as redis
import json

class SessionCache:
    def __init__(self, redis_url: str):
        self.redis = redis.from_url(redis_url)

    async def save_conversation(self, session_id: str, messages: list[dict]):
        await self.redis.set(
            f"interview:{session_id}:messages",
            json.dumps(messages),
            ex=3600,  # 1 hour TTL
        )

    async def get_conversation(self, session_id: str) -> list[dict] | None:
        data = await self.redis.get(f"interview:{session_id}:messages")
        return json.loads(data) if data else None

    async def increment_usage(self, org_id: str) -> int:
        key = f"usage:{org_id}:interviews"
        return await self.redis.incr(key)
```

## Key Rules

1. **Always use UUID primary keys** -- never auto-increment integers
2. **Every tenant-scoped table has `org_id`** -- always filter by it
3. **Use JSONB** for flexible structured data (skills, config, scores)
4. **Use NUMERIC for scores** -- never FLOAT
5. **Always add indexes** on FK columns and columns used in WHERE
6. **Always include `created_at`** timestamps
7. **Use parameterized queries** -- never string interpolation
8. **Alembic for all schema changes** -- never modify DB manually in production
9. **Seed data must be realistic** -- use proper UUIDs, real-looking data
10. **Redis for ephemeral state** -- conversation cache, rate limits, usage counters
11. **Never query in a loop** -- use `.in_()` batch queries or `selectinload()`/`joinedload()` to avoid N+1
