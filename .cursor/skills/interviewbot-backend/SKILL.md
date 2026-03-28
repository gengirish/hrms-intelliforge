---
name: interviewbot-backend
description: Build and maintain the AI Interview Bot FastAPI backend with production best practices. Use when creating API endpoints, services, middleware, Pydantic schemas, or backend configuration.
---

# Interview Bot FastAPI Backend

## Application Factory

Always use the factory pattern. Never create `app = FastAPI()` at module level.

```python
# src/interviewbot/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from interviewbot.config import get_settings
from interviewbot.routers import health, auth, organizations, job_postings, interviews, reports, billing
from interviewbot.middleware.tenant import TenantMiddleware

def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Interview Bot API",
        version="1.0.0",
        docs_url="/api/docs" if settings.debug else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
        allow_headers=["Authorization", "Content-Type"],
    )
    app.add_middleware(TenantMiddleware)

    for router in [health, auth, organizations, job_postings, interviews, reports, billing]:
        app.include_router(router.router, prefix="/api/v1")

    return app

app = create_app()
```

## Configuration

```python
# src/interviewbot/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    app_env: str = "dev"
    debug: bool = False
    database_url: str
    redis_url: str = "redis://localhost:6379"
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    elevenlabs_api_key: str = ""
    livekit_api_key: str = ""
    livekit_api_secret: str = ""
    livekit_url: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    judge0_api_url: str = "https://judge0-ce.p.rapidapi.com"
    s3_bucket_name: str = ""
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

## Router Pattern

Domain logic lives in services, not routers. Routers are thin wrappers.

```python
# src/interviewbot/routers/job_postings.py
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from interviewbot.dependencies import get_current_user, get_db, get_org_id
from interviewbot.models.schemas import (
    JobPostingCreateRequest, JobPostingResponse, JobPostingListResponse,
)
from interviewbot.services.interview_service import InterviewService

router = APIRouter(prefix="/job-postings", tags=["Job Postings"])

@router.post("", response_model=JobPostingResponse, status_code=status.HTTP_201_CREATED)
async def create_job_posting(
    request: JobPostingCreateRequest,
    user=Depends(get_current_user),
    db=Depends(get_db),
    org_id: UUID = Depends(get_org_id),
):
    service = InterviewService(db)
    return await service.create_job_posting(org_id=org_id, created_by=user["sub"], data=request)

@router.get("", response_model=JobPostingListResponse)
async def list_job_postings(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user=Depends(get_current_user),
    db=Depends(get_db),
    org_id: UUID = Depends(get_org_id),
):
    service = InterviewService(db)
    return await service.list_job_postings(org_id=org_id, page=page, per_page=per_page)

@router.get("/{posting_id}", response_model=JobPostingResponse)
async def get_job_posting(
    posting_id: UUID,
    user=Depends(get_current_user),
    db=Depends(get_db),
    org_id: UUID = Depends(get_org_id),
):
    service = InterviewService(db)
    posting = await service.get_job_posting(org_id=org_id, posting_id=posting_id)
    if not posting:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job posting not found")
    return posting
```

## Dependencies (DI)

```python
# src/interviewbot/dependencies.py
from uuid import UUID
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from interviewbot.config import get_settings
from interviewbot.models.database import get_session_factory

security = HTTPBearer()

async def get_db():
    factory = get_session_factory()
    async with factory() as session:
        yield session

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    settings = get_settings()
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")

async def get_org_id(request: Request) -> UUID:
    org_id = getattr(request.state, "org_id", None)
    if not org_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Organization context required")
    return org_id

def require_role(*allowed_roles: str):
    async def checker(user: dict = Depends(get_current_user)):
        if user.get("role") not in allowed_roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return user
    return checker
```

## Pydantic Schemas

```python
# src/interviewbot/models/schemas.py
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr
from enum import Enum

class InterviewFormat(str, Enum):
    TEXT = "text"
    VOICE = "voice"
    VIDEO = "video"

class RoleType(str, Enum):
    TECHNICAL = "technical"
    NON_TECHNICAL = "non_technical"
    MIXED = "mixed"

class JobPostingCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    role_type: RoleType
    job_description: str = Field(..., min_length=50)
    required_skills: list[str] = Field(default_factory=list)
    interview_format: InterviewFormat = InterviewFormat.TEXT
    interview_config: dict = Field(default_factory=lambda: {
        "num_questions": 10,
        "duration_minutes": 30,
        "difficulty": "medium",
        "include_coding": False,
    })

class JobPostingResponse(BaseModel):
    id: UUID
    org_id: UUID
    title: str
    role_type: RoleType
    job_description: str
    required_skills: list[str]
    interview_format: InterviewFormat
    interview_config: dict
    is_active: bool
    created_at: datetime
    interview_link: str | None = None

class JobPostingListResponse(BaseModel):
    items: list[JobPostingResponse]
    total: int
    page: int
    per_page: int

class InterviewStartRequest(BaseModel):
    candidate_name: str = Field(..., min_length=2)
    candidate_email: EmailStr

class InterviewMessageResponse(BaseModel):
    role: str
    content: str
    created_at: datetime

class CandidateReportResponse(BaseModel):
    session_id: UUID
    candidate_name: str
    overall_score: float
    skill_scores: dict
    behavioral_scores: dict
    ai_summary: str
    recommendation: str
    confidence_score: float
```

## Error Response Convention

```python
# Always use HTTPException with detail string
raise HTTPException(status.HTTP_400_BAD_REQUEST, "Validation failed: ...")
raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
raise HTTPException(status.HTTP_404_NOT_FOUND, "Resource not found")
raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Rate limit exceeded")
```

FastAPI serializes this as `{"detail": "message"}`.

## Health Checks

```python
# src/interviewbot/routers/health.py
from fastapi import APIRouter, Depends
from interviewbot.dependencies import get_db

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
async def health():
    return {"status": "healthy", "service": "interviewbot-api"}

@router.get("/db")
async def health_db(db=Depends(get_db)):
    await db.execute("SELECT 1")
    return {"status": "healthy", "database": "connected"}
```

## Candidate-Facing Routes (Public)

Interview pages are accessed via unique token, no auth required.

```python
# src/interviewbot/routers/interviews.py (public endpoints)
@router.get("/public/{token}")
async def get_interview_by_token(token: str, db=Depends(get_db)):
    service = InterviewService(db)
    session = await service.get_session_by_token(token)
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Interview not found")
    return session

@router.post("/public/{token}/start")
async def start_interview(
    token: str,
    request: InterviewStartRequest,
    db=Depends(get_db),
):
    service = InterviewService(db)
    return await service.start_session(token=token, data=request)
```

## Background Tasks (Celery)

```python
# src/interviewbot/workers/report_worker.py
from celery import Celery
from interviewbot.config import get_settings

settings = get_settings()
celery_app = Celery("interviewbot", broker=settings.redis_url)

@celery_app.task
def generate_report(session_id: str):
    """Generate candidate report after interview completion."""
    ...

@celery_app.task
def send_interview_invitation(email: str, interview_link: str, job_title: str):
    """Send interview invitation email to candidate."""
    ...
```

## Checklist for New Endpoints

1. Create or add to router in `src/interviewbot/routers/`
2. Choose auth level: public (candidate) / authenticated / admin-only
3. Create Pydantic request/response schemas in `models/schemas.py`
4. Add domain logic to a service in `services/`
5. Always filter by `org_id` for tenant isolation
6. Add rate limiting for public-facing endpoints
7. Log with structlog -- never `print()`
8. Write tests in `tests/`

## Key Rules

1. **Never hardcode secrets** -- all secrets via `Settings`
2. **Always version API routes** -- prefix with `/api/v1/`
3. **Always validate inputs** -- Pydantic `Field` constraints
4. **Always use async** -- `asyncpg`, `httpx.AsyncClient`
5. **Domain logic in services** -- routers are thin wrappers
6. **Multi-tenant isolation** -- every query filters by `org_id`
7. **Log with structlog** -- never `print()`
8. **Candidate endpoints are public** -- accessed via unique token
9. **Dashboard endpoints require JWT** -- always validate token
