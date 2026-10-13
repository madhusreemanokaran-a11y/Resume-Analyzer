/**
 * AI Career & Resume Copilot Chatbot Widget
 * Automatically attaches floating drawer and handles context-aware advice.
 */

(function () {
  // Inject HTML markup for chatbot widget
  function injectChatbot() {
    if (document.getElementById("career-chatbot-widget")) return;

    const wrap = document.createElement("div");
    wrap.id = "career-chatbot-widget";
    wrap.innerHTML = `
      <!-- Floating Action Button -->
      <button class="chatbot-fab" id="chatbot-fab" onclick="toggleChatbot()" title="Chat with AI Career Copilot">
        <span>💬</span>
        <span class="fab-badge"></span>
      </button>

      <!-- Expandable Chatbot Window -->
      <div class="chatbot-window" id="chatbot-window">
        <div class="chatbot-header">
          <div class="chatbot-header-title">
            <div class="chatbot-avatar">🤖</div>
            <div class="chatbot-header-text">
              <h4>Career AI Copilot</h4>
              <span>Online · Resume Mentor</span>
            </div>
          </div>
          <div class="chatbot-header-actions">
            <button class="chatbot-close-btn" onclick="clearChatHistory()" title="Clear chat">🗑️</button>
            <button class="chatbot-close-btn" onclick="toggleChatbot()" title="Close chat">✕</button>
          </div>
        </div>

        <div class="chatbot-context-banner" id="chat-context-banner">
          <span id="chat-context-text">Target: Software Engineer</span>
          <span style="color:var(--primary); font-weight:700;" id="chat-context-score">ATS: --</span>
        </div>

        <div class="chatbot-body" id="chat-messages">
          <!-- Messages will stream here -->
        </div>

        <div class="chat-chips-wrap" id="chat-chips">
          <div class="chat-chip" onclick="sendQuickPrompt('How do I boost my ATS score to 90+?')">📈 Boost ATS to 90+</div>
          <div class="chat-chip" onclick="sendQuickPrompt('Write a strong 3-sentence summary for my resume')">✍️ Summary Rewrite</div>
          <div class="chat-chip" onclick="sendQuickPrompt('What project can I build to learn Docker and AWS?')">🐳 Docker Project Idea</div>
          <div class="chat-chip" onclick="sendQuickPrompt('Simulate a technical interview question for my role')">🎙️ Mock Interview</div>
          <div class="chat-chip" onclick="sendQuickPrompt('How do I explain an employment gap?')">⏳ Explain Career Gap</div>
        </div>

        <div class="chatbot-footer">
          <input type="text" class="chat-input" id="chat-input" placeholder="Ask about resume, ATS, interview, skills..." onkeydown="handleChatKeyDown(event)">
          <button class="chat-send-btn" onclick="handleSendMessage()" title="Send">➤</button>
        </div>
      </div>
    `;

    document.body.appendChild(wrap);
    updateChatContext();
    loadInitialGreeting();
  }

  // Update context banner based on current session
  function updateChatContext() {
    const role = localStorage.getItem("role") || "Software Engineer";
    const userName = localStorage.getItem("name") || "Job Seeker";

    let score = "--";
    try {
      const cached = sessionStorage.getItem("latestAnalysis");
      if (cached) {
        const parsed = JSON.parse(cached);
        score = (parsed.atsScore ?? "--") + "%";
      }
    } catch (e) {}

    const textEl = document.getElementById("chat-context-text");
    const scoreEl = document.getElementById("chat-context-score");
    if (textEl) textEl.textContent = `Candidate: ${userName} · ${role}`;
    if (scoreEl) scoreEl.textContent = `ATS: ${score}`;
  }

  // Initial welcome greeting
  function loadInitialGreeting() {
    const msgs = document.getElementById("chat-messages");
    if (!msgs) return;

    const userName = localStorage.getItem("name") || "there";
    const role = localStorage.getItem("role") || "Software Developer";

    const welcome = `Hi ${userName}! 👋 I'm your **AI Career & Resume Copilot**.\n\nI can help you:\n- **Boost your ATS score** by fixing missing keywords\n- **Rewrite weak bullet points** into high-impact STAR achievements\n- **Practice targeted interview questions** for your target role (${role})\n- **Plan a learning roadmap** for missing skills\n\nWhat would you like to work on?`;

    appendMessage("bot", welcome);
  }

  // Toggle open/closed
  window.toggleChatbot = function () {
    const win = document.getElementById("chatbot-window");
    if (!win) return;
    const isOpen = win.classList.toggle("open");
    if (isOpen) {
      updateChatContext();
      const input = document.getElementById("chat-input");
      if (input) setTimeout(() => input.focus(), 150);
    }
  };

  // Quick Prompt click
  window.sendQuickPrompt = function (text) {
    const input = document.getElementById("chat-input");
    if (input) {
      input.value = text;
      handleSendMessage();
    }
  };

  // Clear chat
  window.clearChatHistory = function () {
    const msgs = document.getElementById("chat-messages");
    if (msgs) {
      msgs.innerHTML = "";
      loadInitialGreeting();
    }
  };

  // Keydown Enter handler
  window.handleChatKeyDown = function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Main send message handler
  window.handleSendMessage = function () {
    const input = document.getElementById("chat-input");
    const query = input.value.trim();
    if (!query) return;

    appendMessage("user", query);
    input.value = "";

    // Show typing indicator
    const typingId = showTypingIndicator();

    setTimeout(() => {
      removeTypingIndicator(typingId);
      const reply = generateAIResponse(query);
      appendMessage("bot", reply);
    }, 600 + Math.random() * 400);
  };

  // Append a message bubble
  function appendMessage(sender, text) {
    const msgs = document.getElementById("chat-messages");
    if (!msgs) return;

    const msgEl = document.createElement("div");
    msgEl.className = "chat-msg " + sender;

    const bubbleEl = document.createElement("div");
    bubbleEl.className = "chat-bubble";
    bubbleEl.innerHTML = formatMarkdown(text);

    const timeEl = document.createElement("span");
    timeEl.className = "chat-time";
    timeEl.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    msgEl.appendChild(bubbleEl);
    msgEl.appendChild(timeEl);
    msgs.appendChild(msgEl);

    msgs.scrollTop = msgs.scrollHeight;
  }

  // Show typing bouncing dots
  function showTypingIndicator() {
    const msgs = document.getElementById("chat-messages");
    if (!msgs) return null;

    const id = "typing-" + Date.now();
    const wrap = document.createElement("div");
    wrap.id = id;
    wrap.className = "chat-msg bot";
    wrap.innerHTML = `
      <div class="chat-bubble" style="padding:4px 8px;">
        <div class="chat-typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
    return id;
  }

  function removeTypingIndicator(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  // Lightweight markdown formatter for bold, code, bullets, links
  function formatMarkdown(str) {
    return str
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code style='background:rgba(148,163,184,0.2); padding:2px 5px; border-radius:4px; font-size:0.85em;'>$1</code>")
      .replace(/\n- (.*?)(?=\n|$)/g, "<br>• $1")
      .replace(/\n\n/g, "<br><br>")
      .replace(/\n/g, "<br>");
  }

  // Context-aware Intelligence Engine
  function generateAIResponse(query) {
    const q = query.toLowerCase();
    const role = localStorage.getItem("role") || "Software Engineer";

    // 1. ATS Score improvement
    if (q.includes("ats") || q.includes("boost") || q.includes("score") || q.includes("90")) {
      return `To push your resume to a **90+ ATS Score**, follow these 4 high-yield actions:\n\n` +
        `1. **Inject Exact Role Keywords:** Scan the job posting for tools like *Docker, AWS, REST APIs, CI/CD, Microservices* and mirror the exact spelling.\n` +
        `2. **Use Clear ATS Headings:** Always use standard titles: *Professional Summary, Technical Skills, Professional Experience, Education, Projects*.\n` +
        `3. **Add Quantifiable Numbers:** ATS scanners and hiring managers prioritize metrics. E.g., *"Reduced API latency by 35%"* or *"Maintained 99.9% uptime across 15,000 users"*.\n` +
        `4. **Clean Single-Column Layout:** Avoid tables, multi-column text boxes, or header/footer text that can confuse legacy ATS parsers.`;
    }

    // 2. Summary rewrite
    if (q.includes("summary") || q.includes("objective") || q.includes("about me") || q.includes("profile")) {
      return `Here is a strong, ATS-compliant 3-sentence **Professional Summary** customized for a **${role}**:\n\n` +
        `> *"Results-driven ${role} with proven expertise in building scalable web architectures, optimizing database performance, and designing resilient RESTful APIs. Adept at collaborating in Agile teams to deliver high-availability software solutions with automated testing and CI/CD pipelines. Passionate about leveraging modern cloud technologies to drive measurable business impact."*\n\n` +
        `💡 *Tip: Place this directly beneath your contact header!*`;
    }

    // 3. Docker / AWS / Cloud Project
    if (q.includes("docker") || q.includes("project") || q.includes("aws") || q.includes("portfolio") || q.includes("build")) {
      return `Here is an impressive portfolio project that demonstrates both **Docker & Cloud Architecture**:\n\n` +
        `🚀 **Project Idea: Containerized Microservices Task & Event Engine**\n` +
        `- **Backend:** Java Spring Boot or Node.js REST API with MySQL.\n` +
        `- **Dockerization:** Create a multi-stage \`Dockerfile\` and a \`docker-compose.yml\` spinning up the app and database in one command.\n` +
        `- **CI/CD:** Setup a GitHub Actions workflow that builds the Docker image and runs unit tests on every commit.\n` +
        `- **Resume Bullet:** *"Engineered containerized microservices using Docker and Spring Boot, automating deployment via GitHub Actions and cutting local dev onboarding time by 50%."*`;
    }

    // 4. Mock Interview Simulation
    if (q.includes("interview") || q.includes("question") || q.includes("practice") || q.includes("mock")) {
      return `Let's practice! Here is a core interview question for a **${role}**:\n\n` +
        `🎙️ **"How do you approach diagnosing and resolving a sudden performance bottleneck or high latency in a production API?"**\n\n` +
        `**Model Strategy (STAR):**\n` +
        `1. **Isolate:** Check APM metrics, CPU/memory usage, and query logs (slow query log / EXPLAIN).\n` +
        `2. **Diagnose:** Identify if it is database locks, N+1 ORM queries, network latency, or memory leaks.\n` +
        `3. **Resolve:** Apply indexing, introduce Redis caching, or scale worker replicas.\n` +
        `4. **Verify:** Run load tests and implement automated alert thresholds.`;
    }

    // 5. Employment Gap Explanation
    if (q.includes("gap") || q.includes("career break") || q.includes("unemployed")) {
      return `When explaining a career or employment gap, use the **A-B-C Formula**:\n\n` +
        `- **Acknowledge (Briefly):** State the reason transparently without over-explaining (e.g., family care, health, personal relocation, or dedicated upskilling).\n` +
        `- **Bridge to Skills:** Highlight what you did during that time (e.g., certifications, open-source projects, mastering Docker/Cloud, online courses).\n` +
        `- **Commit to the Future:** Express your excitement and readiness to contribute immediately.\n\n` +
        `Example: *"I took intentional time to complete my Cloud certifications and build full-stack microservice applications, and I'm eager to bring that focused energy to this role."*`;
    }

    // 6. Salary & Negotiation
    if (q.includes("salary") || q.includes("compensation") || q.includes("negotiate") || q.includes("pay")) {
      return `💡 **Key Rules for Salary Discussion for a ${role}:**\n\n` +
        `1. **Research Local Benchmarks:** Check levels.fyi, Glassdoor, and LinkedIn Salary for your specific years of experience.\n` +
        `2. **Anchor with a Range:** Give a range where your realistic target is the *bottom* of your range (e.g., if you want $95k, ask for $95k - $110k).\n` +
        `3. **Focus on Total Rewards:** Consider bonus structure, remote flexibility, health benefits, and PTO alongside base pay.\n` +
        `4. **Phrase It Professionally:** *"Based on the responsibilities of this role and market benchmarks for similar roles in this area, I'm targeting between [X] and [Y]."*`;
    }

    // 7. General advice
    return `That's a great question regarding your career as a **${role}**!\n\n` +
      `Here is my recommendation:\n` +
      `- Ensure your bullet points highlight **quantifiable results** (e.g., % improvement, users served, latency reduction).\n` +
      `- Keep your resume to **1-2 pages maximum** with clean formatting.\n` +
      `- Align technical skills with what hiring managers look for in modern development stacks.\n\n` +
      `Feel free to paste a bullet point from your resume here, and I'll rewrite it for you in STAR format!`;
  }

  // Initialize once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectChatbot);
  } else {
    injectChatbot();
  }
})();
