---
name: interviewbot-testing
description: Write and run pytest backend tests and Playwright E2E tests for the Interview Bot. Use when creating tests, debugging test failures, adding test coverage, mocking external services, or configuring test infrastructure.
---

# Interview Bot Testing

## Backend Testing (pytest)

### Quick Start

```bash
cd backend

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src/interviewbot --cov-report=term-missing

# Run specific test file
pytest tests/test_auth.py -v

# Run single test
pytest tests/test_auth.py::test_login_success -v
```

### Project Structure

```
backend/tests/
├── conftest.py                # Shared fixtures (app, client, db, factories)
├── test_auth.py               # Login, signup, JWT validation
├── test_job_postings.py       # CRUD job postings
├── test_interviews.py         # Interview session lifecycle
├── test_ai_engine.py          # LLM integration (mocked)
├── test_billing.py            # Stripe subscription flow (mocked)
├── test_scoring.py            # Scoring service
└── test_websocket.py          # WebSocket interview flow
```

### conftest.py

```python
# backend/tests/conftest.py
import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from interviewbot.main import create_app
from interviewbot.config import get_settings

@pytest.fixture
def app():
    return create_app()

@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

@pytest.fixture
def auth_headers():
    """Generate valid JWT headers for testing."""
    from jose import jwt
    settings = get_settings()
    token = jwt.encode(
        {
            "sub": str(uuid.uuid4()),
            "email": "test@democorp.com",
            "role": "admin",
            "org_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def hiring_manager_headers():
    """JWT headers for hiring manager role."""
    from jose import jwt
    settings = get_settings()
    token = jwt.encode(
        {
            "sub": str(uuid.uuid4()),
            "email": "hiring@democorp.com",
            "role": "hiring_manager",
            "org_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return {"Authorization": f"Bearer {token}"}
```

### Test Templates

#### API Endpoint Test

```python
# tests/test_job_postings.py
import pytest

@pytest.mark.asyncio
async def test_create_job_posting(client, auth_headers):
    response = await client.post(
        "/api/v1/job-postings",
        json={
            "title": "Senior Python Developer",
            "role_type": "technical",
            "job_description": "Looking for a senior Python developer with FastAPI experience " * 3,
            "required_skills": ["Python", "FastAPI", "PostgreSQL"],
            "interview_format": "text",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Senior Python Developer"
    assert data["is_active"] is True

@pytest.mark.asyncio
async def test_create_job_posting_unauthorized(client):
    response = await client.post("/api/v1/job-postings", json={})
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_create_job_posting_validation_error(client, auth_headers):
    response = await client.post(
        "/api/v1/job-postings",
        json={"title": "AB"},  # too short
        headers=auth_headers,
    )
    assert response.status_code == 422
```

#### Service Unit Test

```python
# tests/test_ai_engine.py
import pytest
from unittest.mock import AsyncMock, patch
from interviewbot.services.ai_engine import AIEngine, InterviewConversation

@pytest.mark.asyncio
async def test_ai_engine_generates_question():
    engine = AIEngine()
    engine.primary = AsyncMock()
    engine.primary.chat.return_value = "Tell me about your experience with Python."

    conversation = InterviewConversation("You are an interviewer.")
    messages = conversation.get_messages()
    response = await engine.chat(messages)

    assert "Python" in response
    engine.primary.chat.assert_called_once()

@pytest.mark.asyncio
async def test_ai_engine_fallback_on_primary_failure():
    engine = AIEngine()
    engine.primary = AsyncMock()
    engine.primary.chat.side_effect = Exception("API down")
    engine.fallback = AsyncMock()
    engine.fallback.chat.return_value = "Fallback response"

    response = await engine.chat([{"role": "user", "content": "Hello"}])

    assert response == "Fallback response"
    engine.fallback.chat.assert_called_once()
```

#### WebSocket Test

```python
# tests/test_websocket.py
import pytest
from starlette.testclient import TestClient

def test_websocket_interview(app):
    client = TestClient(app)
    with client.websocket_connect("/ws/interview/test-token-123") as ws:
        data = ws.receive_json()
        assert data["type"] in ("question", "error")
```

### Mocking External Services

```python
# Mock OpenAI
@pytest.fixture
def mock_openai():
    with patch("interviewbot.services.ai_engine.AsyncOpenAI") as mock:
        instance = mock.return_value
        instance.chat.completions.create = AsyncMock(return_value=MockCompletion("response"))
        yield instance

# Mock Stripe
@pytest.fixture
def mock_stripe():
    with patch("interviewbot.services.billing_service.stripe") as mock:
        mock.checkout.Session.create.return_value = {"url": "https://checkout.stripe.com/test"}
        mock.Customer.create.return_value = {"id": "cus_test123"}
        yield mock

# Mock Judge0
@pytest.fixture
def mock_judge0():
    with patch("interviewbot.services.code_eval_service.httpx.AsyncClient") as mock:
        instance = mock.return_value.__aenter__.return_value
        instance.post.return_value = MockResponse({"stdout": "Hello", "status": {"description": "Accepted"}})
        yield instance
```

### pyproject.toml Test Config

```toml
[tool.pytest.ini_options]
pythonpath = ["src"]
testpaths = ["tests"]
asyncio_mode = "auto"
addopts = ["--cov=src/interviewbot", "--cov-report=term-missing", "--verbose"]
```

---

## Frontend E2E Testing (Playwright)

### Quick Start

```bash
cd frontend

# Install Playwright
npm install -D @playwright/test
npx playwright install chromium

# Run all tests
npx playwright test

# Run with visible browser
npx playwright test --headed

# Interactive UI mode
npx playwright test --ui

# View report
npx playwright show-report
```

### Project Structure

```
frontend/tests/
├── e2e/
│   ├── auth.spec.ts            # Login, signup, logout
│   ├── dashboard.spec.ts       # Dashboard pages, KPIs, navigation
│   ├── job-postings.spec.ts    # Create, edit, delete job postings
│   ├── interview-flow.spec.ts  # Candidate interview (text chat)
│   ├── reports.spec.ts         # View candidate reports
│   ├── billing.spec.ts         # Pricing page, upgrade flow
│   ├── responsive.spec.ts      # Mobile + tablet viewports
│   └── navigation.spec.ts      # Sidebar, topbar, cross-page links
├── fixtures/
│   └── test-fixtures.ts
└── helpers/
    └── selectors.ts
playwright.config.ts
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
  ],
});
```

### E2E Test Template

```typescript
import { test, expect } from "@playwright/test";

test.describe("Job Postings", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill("admin@democorp.com");
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should create a new job posting", async ({ page }) => {
    await page.getByRole("link", { name: "Jobs" }).click();
    await page.getByRole("button", { name: "Create Job" }).click();

    await page.getByLabel("Job Title").fill("Senior Engineer");
    await page.getByLabel("Description").fill("Looking for a senior engineer with 5+ years experience...");

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/v1/job-postings") && r.status() === 201),
      page.getByRole("button", { name: "Create" }).click(),
    ]);

    await expect(page.getByText("Job posting created")).toBeVisible();
  });
});
```

### Mock API for Isolated Tests

```typescript
test("should show empty state when no interviews", async ({ page }) => {
  await page.route("/api/v1/interviews*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], total: 0 }),
    })
  );

  await page.goto("/dashboard/interviews");
  await expect(page.getByText("No interviews yet")).toBeVisible();
});
```

### Responsive Test

```typescript
test("should show mobile nav on small screens", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/dashboard");

  await expect(page.locator("[data-testid='sidebar']")).not.toBeVisible();
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.locator("[data-testid='mobile-nav']")).toBeVisible();
});
```

### CI Integration

```yaml
# Add to .github/workflows/ci.yml
  e2e:
    runs-on: ubuntu-latest
    needs: [backend, frontend]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
        working-directory: frontend
      - run: npx playwright install --with-deps chromium
        working-directory: frontend
      - run: npx playwright test
        working-directory: frontend
        env:
          E2E_BASE_URL: http://localhost:3000
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

## Key Rules

1. **Always mock external services** in tests (OpenAI, Stripe, Judge0, ElevenLabs)
2. **CI tests against real Postgres + Redis** -- not SQLite or in-memory
3. **Every new endpoint gets tests** -- happy path, auth guard, validation errors
4. **E2E tests are independent** -- no reliance on test ordering
5. **Use factories for test data** -- not raw SQL in each test
6. **Prefer `getByRole()` and `getByLabel()`** over CSS selectors in Playwright
7. **Add `data-testid`** to complex components for reliable E2E targeting
8. **Coverage target: 80%+** for backend services
