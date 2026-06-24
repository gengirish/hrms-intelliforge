# HRMS Integrations

External services HRMS calls into. Each section documents the env vars,
how to provision credentials, and how to verify the wiring.

## IntelliForge Learning Platform

HRMS provisions Learning enrollments on demand from the intern detail
panel. The admin clicks **Enroll in a course**, picks a course from the
live dropdown, and HRMS POSTs to Learning's v1 enrollment API on their
behalf.

- Source of truth: [`learning.intelliforge.tech`](https://learning.intelliforge.tech)
- Repo (separate): `training-feedback` (local: `C:\Users\gengi\Documents\training-feedback`)
- Identity bridge: `Intern.email` ↔ `enrollments.user_email`. There is **no**
  shared session — interns sign in to Learning independently.

### Required env vars (HRMS deployment)

| Var                       | Required | Where it ships          | Notes                                                         |
| ------------------------- | :------: | ----------------------- | ------------------------------------------------------------- |
| `LEARNING_API_KEY`        | yes      | Vercel: prod & preview  | Raw `ifk_...` key minted in Learning admin UI (`write` scope) |
| `LEARNING_API_BASE_URL`   | no       | Vercel: prod & preview  | Defaults to `https://learning.intelliforge.tech`. Override for staging. |

### Optional auto-provision (when intern becomes ACTIVE)

| Var                                  | Notes                                                                 |
| ------------------------------------ | --------------------------------------------------------------------- |
| `LEARNING_AUTO_ENROLL_COURSE_IDS`    | Comma-separated Learning course IDs enrolled automatically            |
| `LEARNING_AUTO_ENROLL_COURSE_SLUGS` | Comma-separated slugs (preferred). Defaults to intern onboarding courses — see `docs/LEARNING_SETUP.md` |
| `LEARNING_AUTO_REGISTER_SESSION`     | Training session title for bootcamp registration via `/api/participants` |
| `LEARNING_AUTO_REGISTER_LIVE_SESSION_ID` | Live session ID registered via `/api/v1/sessions/{id}/register`   |
| `LEARNING_AUTO_ENROLL_DEFAULTS`    | Set `false` to disable built-in intern onboarding slug defaults       |

Auto-provision runs when an intern's status changes to **ACTIVE** (offer
accepted via dashboard, offer page, email reply, or WhatsApp). Failures are
logged but never block the status transition.

If `LEARNING_API_KEY` is unset, the courses proxy returns `503` and the
"Enroll in Learning" UI shows a friendly "integration not configured"
message. Nothing else in HRMS breaks.

### One-time provisioning (operator playbook)

1. Sign in to Learning as an admin (`learning.intelliforge.tech`).
2. Open the API Keys panel (route: `/admin/api-keys`).
3. Click **New API key** with:
   - **Name:** `HRMS auto-enroll prod`
   - **Scope:** `write` (read+write also works; we need write to create
     enrollments)
4. Copy the raw key (`ifk_...`) — it's shown once and not retrievable.
5. In the HRMS Vercel project settings, add the var to **Production** and
   **Preview** environments:
   - `LEARNING_API_KEY` = the raw key from step 4
6. Trigger a redeploy (or wait for the next push).
7. Verify: in HRMS open any intern detail panel → Learning tab. The
   "Enroll in a course" button should open a modal listing the published
   Learning courses.

### Mint a separate key per environment

Use distinct keys for prod vs. preview/staging. Suggested names:

- `HRMS auto-enroll prod`
- `HRMS auto-enroll preview`

This makes audit logs in Learning's `api_key_logs` table actionable and
makes key rotation isolated.

### Rotation

1. Mint a new key in Learning admin UI.
2. Update `LEARNING_API_KEY` in Vercel.
3. Redeploy HRMS.
4. Revoke the old key in Learning admin UI.

### Endpoints HRMS consumes

| Method | Path                          | Use                                         |
| ------ | ----------------------------- | ------------------------------------------- |
| GET    | `/api/v1/courses`             | Populate the course-picker dropdown         |
| GET    | `/api/v1/enrollments?email=`  | Sync lesson progress into HRMS              |
| POST   | `/api/v1/enrollments`         | Create an enrollment for `{email, course_id}` |
| POST   | `/api/participants`           | Bootcamp / training session registration (no API key) |
| GET    | `/api/v1/sessions?upcoming=`  | List live sessions (Learning repo)            |
| POST   | `/api/v1/sessions/{id}/register` | Register learner for live session (Learning repo) |

HRMS exposes:

| Method | Path                    | Use                                      |
| ------ | ----------------------- | ---------------------------------------- |
| POST   | `/api/learning/sync`    | Admin-triggered progress sync for an intern |
| POST   | `/api/learning/enroll`  | Manual course enrollment                 |
| GET    | `/api/learning/courses` | Course catalog proxy                     |

Both v1 GET/POST enrollment endpoints require `Authorization: Bearer <LEARNING_API_KEY>`. The POST is
upsert on `(user_email, course_id)` so retries are safe; HRMS additionally
holds a unique row in `learning_enrollments(internId, courseId)` for local
idempotency and UI history.

### Failure modes

| HRMS response from `/api/learning/enroll` | Meaning                                                  |
| ----------------------------------------- | -------------------------------------------------------- |
| `200 { alreadyExisted: false }`           | New enrollment created on Learning + persisted locally   |
| `200 { alreadyExisted: true }`            | Either local row already existed, or Learning's upsert hit an existing row |
| `400`                                     | Missing/invalid `internId` or `courseId`                 |
| `403`                                     | Admin's account isn't attached to an org                 |
| `404`                                     | Intern doesn't belong to this admin's org, or course not in catalog |
| `429`                                     | Rate limited (10 enrollments/min/IP)                     |
| `502`                                     | Learning rejected our credentials, or upstream failure   |
| `503`                                     | `LEARNING_API_KEY` is unset on the HRMS deployment       |

### Notification

On a successful new enrollment, HRMS sends a `COURSE_ENROLLED` email
through the existing notification pipeline (AgentMail) to the intern,
linking them to the course on Learning. The notification is best-effort
— a failed email never rolls back the enrollment.
