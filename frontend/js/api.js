const isGitHubPages = window.location.hostname.includes("github.io") || window.location.protocol === "https:";
const API_BASE = isGitHubPages ? "" : "http://localhost:8080/api";

function getToken() { return localStorage.getItem("token"); }

function setSession(auth) {
  localStorage.setItem("token", auth.token || "demo-jwt-token-" + Date.now());
  localStorage.setItem("userId", auth.userId || "1");
  localStorage.setItem("name", auth.name || "Alex Morgan");
  localStorage.setItem("email", auth.email || "user@example.com");
  if (auth.targetJobRole) localStorage.setItem("role", auth.targetJobRole);
}

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("name");
  localStorage.removeItem("email");
  localStorage.removeItem("role");
}

function requireAuth() {
  if (!getToken()) window.location.href = "index.html";
}

async function apiRequest(path, { method = "GET", body, isForm = false } = {}) {
  // If hosted on GitHub Pages (HTTPS), directly use the smart client-side demo engine
  if (isGitHubPages || !API_BASE) {
    return handleOfflineApi(path, { method, body, isForm });
  }

  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;
  if (!isForm && body) headers["Content-Type"] = "application/json";

  let res;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: isForm ? body : (body ? JSON.stringify(body) : undefined),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
  } catch (e) {
    // Graceful fallback to offline/demo mode so the site never crashes for visitors
    console.warn("Backend not reachable at " + API_BASE + ". Falling back to interactive demo mode.", e);
    return handleOfflineApi(path, { method, body, isForm });
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && path !== "/auth/login") {
    clearSession();
    window.location.href = "index.html";
    return;
  }
  if (!res.ok) throw new Error(data.error || "Request failed (" + res.status + ")");
  return data;
}

// Client-side fallback engine for GitHub Pages & standalone portfolio showcase
async function handleOfflineApi(path, { method, body, isForm } = {}) {
  if (path === "/auth/login") {
    const email = body?.email || "user@example.com";
    const name = email.includes("@") ? email.split("@")[0] : "Candidate";
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    return {
      token: "demo-jwt-token-" + Date.now(),
      userId: 1,
      email: email,
      name: formattedName,
      targetJobRole: localStorage.getItem("role") || "Senior Software Engineer"
    };
  }

  if (path === "/auth/register") {
    return {
      token: "demo-jwt-token-" + Date.now(),
      userId: 1,
      email: body?.email || "user@example.com",
      name: body?.name || "Candidate",
      targetJobRole: body?.targetJobRole || "Software Engineer"
    };
  }

  if (path === "/dashboard/history") {
    const localHistory = JSON.parse(localStorage.getItem("local_analysis_history") || "[]");
    if (!localHistory.length) {
      // Default initial analysis so the dashboard is immediately rich and interactive
      const defaultAnalysis = generateClientAnalysis(
        "Senior Software Engineer experienced with Java, Spring Boot, MySQL, REST APIs, Git, and JUnit.",
        localStorage.getItem("role") || "Senior Software Engineer",
        "Job Title: Senior Java Developer. Requirements: Java, Spring Boot, MySQL, Docker, AWS, CI/CD."
      );
      return [defaultAnalysis];
    }
    return localHistory;
  }

  if (path === "/resume/analyze") {
    let resumeText = "";
    let jobDesc = "";

    if (isForm && body instanceof FormData) {
      const file = body.get("file");
      jobDesc = body.get("jobDescription") || "";

      if (file && typeof file.text === "function") {
        try {
          resumeText = await file.text();
        } catch (e) {
          resumeText = file.name;
        }
      } else {
        resumeText = file?.name || "Software Engineer Resume";
      }
    }

    const analysis = generateClientAnalysis(
      resumeText,
      localStorage.getItem("role") || "Software Engineer",
      jobDesc
    );

    // Save to local history
    const history = JSON.parse(localStorage.getItem("local_analysis_history") || "[]");
    history.unshift(analysis);
    localStorage.setItem("local_analysis_history", JSON.stringify(history));

    return analysis;
  }

  return {};
}

// Client-side ATS & Skill Analysis Engine
function generateClientAnalysis(resumeText, targetRole, jobDescription) {
  const lowerResume = (resumeText || "").toLowerCase();
  const lowerJd = (jobDescription || "").toLowerCase();

  const knownSkills = [
    "Java", "Python", "JavaScript", "TypeScript", "React", "Angular", "Vue", "Node.js",
    "Spring Boot", "SQL", "MySQL", "PostgreSQL", "MongoDB", "Git", "Docker",
    "Kubernetes", "AWS", "REST APIs", "Microservices", "HTML", "CSS", "Linux",
    "CI/CD", "Agile", "JUnit", "Maven", "Machine Learning", "Data Analysis"
  ];

  const strongSkills = [];
  const missingSkills = [];

  knownSkills.forEach(skill => {
    if (lowerResume.includes(skill.toLowerCase())) {
      strongSkills.add ? strongSkills.add(skill) : strongSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  });

  if (strongSkills.length < 3) {
    strongSkills.push("Problem Solving", "Java", "REST APIs", "SQL", "Git");
  }

  const matchedKeywords = [];
  const missingKeywords = [];
  let jobMatchPercent = null;

  if (jobDescription && jobDescription.trim().length > 0) {
    knownSkills.forEach(skill => {
      if (lowerJd.includes(skill.toLowerCase())) {
        if (lowerResume.includes(skill.toLowerCase())) {
          matchedKeywords.push(skill);
        } else {
          missingKeywords.push(skill);
        }
      }
    });

    const totalJd = matchedKeywords.length + missingKeywords.length;
    jobMatchPercent = totalJd > 0 ? Math.min(100, Math.max(40, Math.round((matchedKeywords.length * 100) / totalJd))) : 80;
    if (!missingKeywords.length) {
      missingKeywords.push("Docker", "AWS", "Kubernetes");
    }
  }

  const atsScore = Math.min(95, Math.max(68, 70 + (strongSkills.length * 2)));

  const categoryScores = {
    skills: Math.min(96, 75 + strongSkills.length * 2),
    keywords: jobMatchPercent != null ? jobMatchPercent : 82,
    projects: 85,
    experience: 78,
    formatting: 92
  };

  const weakDescriptions = [
    "Several project bullet points lack measurable metrics (e.g. percentages, latency, cost savings).",
    "Strengthen action verbs by leading with 'Engineered', 'Architected', or 'Spearheaded' instead of passive phrasing."
  ];

  const missingSections = [];
  if (!lowerResume.includes("summary") && !lowerResume.includes("objective")) {
    missingSections.push("Professional Summary");
  }
  if (!lowerResume.includes("certification") && !lowerResume.includes("certificate")) {
    missingSections.push("Certifications");
  }

  const suggestions = [
    "Inject quantifiable metrics (e.g., 'Reduced query latency by 35%') to elevate ATS ranking.",
    "Mirror exact keyword terminology from the target job posting into your skills and project sections.",
    "Keep date formatting unified across all experience entries (e.g. MM/YYYY - MM/YYYY).",
    "Ensure technical headings follow standard ATS conventions."
  ];

  const recommendedRoles = [
    { role: targetRole || "Software Engineer", matchPercent: jobMatchPercent || 85 },
    { role: "Full Stack Developer", matchPercent: 82 },
    { role: "Backend Systems Engineer", matchPercent: 79 }
  ];

  const resultPayload = {
    atsScore,
    categoryScores,
    strongSkills: Array.from(new Set(strongSkills)).slice(0, 8),
    missingSkills: missingSkills.slice(0, 5),
    weakDescriptions,
    missingSections,
    suggestions,
    jobMatchPercent,
    matchedKeywords: Array.from(new Set(matchedKeywords)),
    missingKeywords: Array.from(new Set(missingKeywords)),
    skillGap: missingSkills.slice(0, 4),
    recommendedRoles
  };

  return {
    id: Date.now(),
    atsScore,
    jobMatchPercent,
    createdAt: new Date().toISOString(),
    resultJson: JSON.stringify(resultPayload)
  };
}

async function registerUser(name, email, password, targetJobRole) {
  const auth = await apiRequest("/auth/register", { method: "POST", body: { name, email, password, targetJobRole } });
  setSession(auth);
  return auth;
}

async function loginUser(email, password) {
  const auth = await apiRequest("/auth/login", { method: "POST", body: { email, password } });
  setSession(auth);
  return auth;
}

async function analyzeResume(file, jobDescription) {
  const form = new FormData();
  form.append("file", file);
  if (jobDescription) form.append("jobDescription", jobDescription);
  return apiRequest("/resume/analyze", { method: "POST", body: form, isForm: true });
}

async function fetchHistory() { return apiRequest("/dashboard/history"); }

// Theme management
function initTheme() {
  const saved = localStorage.getItem("app_theme") || 
    (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(saved);
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  localStorage.setItem("app_theme", theme);
  const btns = document.querySelectorAll(".theme-toggle-btn");
  btns.forEach(b => {
    b.innerHTML = theme === "dark" ? "☀️ Light" : "🌙 Dark";
  });
}

function toggleTheme() {
  const current = localStorage.getItem("app_theme") === "dark" ? "light" : "dark";
  applyTheme(current);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTheme);
} else {
  initTheme();
}
