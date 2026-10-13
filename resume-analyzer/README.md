# AI Resume Analyzer

Full-stack app: Spring Boot + MySQL backend, plain HTML/CSS/JS frontend, AI analysis
powered by the Claude API.

## What's included (v1)

- Register / login with JWT auth
- Resume upload (PDF or DOCX) with text extraction (Apache PDFBox / POI)
- AI analysis via Claude: ATS score, category breakdown, strong/missing skills,
  weak descriptions, missing sections, suggestions
- Job description matching: match %, matched/missing keywords
- Skill gap analysis vs. target job role
- Recommended roles
- Dashboard with history of past analyses

**Not yet built** (straightforward to add on top of this base):
- Personalized week-by-week learning roadmap
- AI mock interview
- Progress-over-time charts

## Requirements

- Java 17+
- Maven 3.8+
- MySQL 8+ running locally (or update the connection URL for a remote instance)
- An Anthropic API key (https://console.anthropic.com)
- Any static file server for the frontend (or just open the HTML files directly)

## 1. Set up the database

MySQL just needs to be running — the app auto-creates the `resume_analyzer`
database and tables on first launch (`spring.jpa.hibernate.ddl-auto=update`).

If your local MySQL username/password aren't `root`/`root`, set env vars (see below).

## 2. Configure environment variables

From `backend/`, before running:

```bash
export DB_USERNAME=root
export DB_PASSWORD=your_mysql_password
export JWT_SECRET=$(openssl rand -hex 32)
export ANTHROPIC_API_KEY=sk-ant-...
```

## 3. Run the backend

```bash
cd backend
mvn spring-boot:run
```

The API starts on `http://localhost:8080`.

## 4. Run the frontend

The frontend is plain static files — no build step. Easiest option:

```bash
cd frontend
python3 -m http.server 5500
```

Then open `http://localhost:5500` in your browser.

(If you serve the frontend from a different port/host, update `API_BASE` in
`frontend/js/api.js`.)

## API overview

| Method | Path                     | Auth | Description                          |
|--------|--------------------------|------|---------------------------------------|
| POST   | /api/auth/register       | no   | Create account, returns JWT           |
| POST   | /api/auth/login          | no   | Log in, returns JWT                   |
| POST   | /api/resume/analyze       | yes  | Upload resume (+ optional job desc) for analysis |
| GET    | /api/dashboard/history    | yes  | Get all past analyses for the user    |

Send the JWT as `Authorization: Bearer <token>` on protected routes.

## Notes on the AI layer

`AIAnalysisService` calls `https://api.anthropic.com/v1/messages` directly using
your `ANTHROPIC_API_KEY`, with a prompt that asks Claude to return a strict JSON
object (ATS score, skills, keywords, job match, skill gap, recommended roles).
That JSON is stored as-is in the `analyses.result_json` column and rendered by
the dashboard, so extending the schema (e.g. adding roadmap data) just means
updating the prompt in `AIAnalysisService.buildPrompt()` and the dashboard JS.

## Next steps (phase 2 ideas)

- **Learning roadmap**: extend the prompt to return a week-by-week plan keyed
  off `skillGap`, store it alongside the analysis, render it on the dashboard.
- **Mock interview**: new endpoint that sends resume + target role to Claude
  asking for interview questions; a follow-up endpoint that takes the user's
  typed answer and asks Claude for feedback.
- **Progress charts**: you already have full history via `/dashboard/history`;
  plot `atsScore` over time on the frontend.
