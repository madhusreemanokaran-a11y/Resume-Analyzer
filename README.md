# AI Resume Analyzer

Full-stack app: Spring Boot + MySQL backend, plain HTML/CSS/JS frontend, AI analysis
powered by the Claude API.

## Features (v1)

- Register / login with JWT auth
- Resume upload (PDF or DOCX) with text extraction (Apache PDFBox / POI)
- AI analysis: ATS score, category breakdown, strong/missing skills, suggestions
- Job description matching: match %, matched/missing keywords
- Skill gap analysis and recommended roles
- Dashboard with history of past analyses

Not built yet: learning roadmap, AI mock interview, progress charts.

## Requirements

- Java 17+ and Maven 3.8+
- MySQL 8+ running locally
- An Anthropic API key (https://console.anthropic.com)
- VS Code with the Live Server extension (or any static file server) for the frontend

## 1. Set environment variables

Run these in the SAME terminal you start the backend from.

Windows (Command Prompt):

```cmd
set DB_USERNAME=root
set DB_PASSWORD=your_mysql_password
set JWT_SECRET=any-long-random-string-at-least-32-characters
set ANTHROPIC_API_KEY=sk-ant-...
```

Windows (PowerShell): use `$env:DB_PASSWORD="..."` style instead of `set`.

macOS / Linux:

```bash
export DB_USERNAME=root
export DB_PASSWORD=your_mysql_password
export JWT_SECRET=$(openssl rand -hex 32)
export ANTHROPIC_API_KEY=sk-ant-...
```

The database and tables are created automatically on first run.

## 2. Run the backend

```bash
cd backend
mvn spring-boot:run
```

Wait for `Started ResumeAnalyzerApplication`. It runs on http://localhost:8080.

## 3. Run the frontend

Right-click `frontend/index.html` in VS Code and choose "Open with Live Server",
or run `python -m http.server 5500` inside `frontend/`.

## Troubleshooting

- "Failed to fetch" / "Cannot reach the server": the backend isn't running. Check the terminal.
- "Public Key Retrieval is not allowed": already handled by `allowPublicKeyRetrieval=true` in application.properties.
- "Access denied for user 'root'": set `DB_PASSWORD` to your real MySQL password.
- 503 "ANTHROPIC_API_KEY is not set": set the key in the same terminal, then restart the backend.

## API

| Method | Path                    | Auth | Description                          |
|--------|-------------------------|------|--------------------------------------|
| POST   | /api/auth/register      | no   | Create account, returns JWT          |
| POST   | /api/auth/login         | no   | Log in, returns JWT                  |
| POST   | /api/resume/analyze     | yes  | Upload resume (+ optional job desc)  |
| GET    | /api/dashboard/history  | yes  | Past analyses for the user           |
