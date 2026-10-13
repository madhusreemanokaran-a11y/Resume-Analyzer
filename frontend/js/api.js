const API_BASE = "http://localhost:8080/api";

function getToken() { return localStorage.getItem("token"); }

function setSession(auth) {
  localStorage.setItem("token", auth.token);
  localStorage.setItem("userId", auth.userId);
  localStorage.setItem("name", auth.name);
  localStorage.setItem("email", auth.email);
}

function clearSession() { localStorage.clear(); }

function requireAuth() {
  if (!getToken()) window.location.href = "index.html";
}

async function apiRequest(path, { method = "GET", body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;
  if (!isForm && body) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: isForm ? body : (body ? JSON.stringify(body) : undefined)
    });
  } catch (e) {
    throw new Error("Cannot reach the server at " + API_BASE + ". Is the backend running on port 8080?");
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

