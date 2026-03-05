/* ============================================================
   GramSeva - Core Application Module (app.js)
   localStorage-based CRUD, auth, complaint ID generator
   ============================================================ */

// ---------- Utility: SHA-256 hash ----------
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- Complaint ID Generator ----------
function generateComplaintId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 10; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// ---------- UUID Generator ----------
function generateId() {
  return "xxxx-xxxx-xxxx".replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

// ---------- Copy to Clipboard ----------
function copyToClipboard(text, btnEl) {
  navigator.clipboard.writeText(text).then(() => {
    if (btnEl) {
      const original = btnEl.textContent;
      btnEl.textContent = "Copied!";
      btnEl.classList.add("copied");
      setTimeout(() => {
        btnEl.textContent = original;
        btnEl.classList.remove("copied");
      }, 1500);
    }
  });
}

// ---------- Toast Notification ----------
function showToast(message, type = "success") {
  const existing = document.querySelector(".gs-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `gs-toast gs-toast--${type}`;
  toast.innerHTML = `
    <div class="gs-toast__content">
      <span class="gs-toast__icon">${
        type === "success"
          ? '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2"/></svg>'
          : type === "error"
          ? '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2"/><path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
          : '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2"/><path d="M10 7v3M10 13h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      }</span>
      <span class="gs-toast__message">${message}</span>
    </div>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("gs-toast--visible"));
  setTimeout(() => {
    toast.classList.remove("gs-toast--visible");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ---------- GramSeva Database (localStorage CRUD) ----------
class GramSevaDB {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem("gs_users")) {
      localStorage.setItem("gs_users", JSON.stringify([]));
    }
    if (!localStorage.getItem("gs_complaints")) {
      localStorage.setItem("gs_complaints", JSON.stringify([]));
    }
    if (!localStorage.getItem("gs_technicians")) {
      localStorage.setItem("gs_technicians", JSON.stringify([]));
    }
    if (!localStorage.getItem("gs_admins")) {
      // Seed default admin
      hashPassword("admin123").then((hashed) => {
        const admins = [
          {
            admin_id: "admin-001",
            email: "admin@gramseva.com",
            password: hashed,
            name: "Administrator",
          },
        ];
        if (!localStorage.getItem("gs_admins") || JSON.parse(localStorage.getItem("gs_admins")).length === 0) {
          localStorage.setItem("gs_admins", JSON.stringify(admins));
        }
      });
    }
  }

  // Generic CRUD
  getAll(table) {
    return JSON.parse(localStorage.getItem(table) || "[]");
  }

  getById(table, idField, idValue) {
    const items = this.getAll(table);
    return items.find((item) => item[idField] === idValue) || null;
  }

  getByField(table, field, value) {
    const items = this.getAll(table);
    return items.filter((item) => item[field] === value);
  }

  insert(table, record) {
    const items = this.getAll(table);
    items.push(record);
    localStorage.setItem(table, JSON.stringify(items));
    return record;
  }

  update(table, idField, idValue, updates) {
    const items = this.getAll(table);
    const index = items.findIndex((item) => item[idField] === idValue);
    if (index === -1) return null;
    items[index] = { ...items[index], ...updates };
    localStorage.setItem(table, JSON.stringify(items));
    return items[index];
  }

  delete(table, idField, idValue) {
    const items = this.getAll(table);
    const filtered = items.filter((item) => item[idField] !== idValue);
    localStorage.setItem(table, JSON.stringify(filtered));
    return filtered.length < items.length;
  }
}

// ---------- Auth Helpers ----------
function setSession(role, data) {
  sessionStorage.setItem(
    "gs_session",
    JSON.stringify({ role, ...data, loginTime: new Date().toISOString() })
  );
}

function getSession() {
  const s = sessionStorage.getItem("gs_session");
  return s ? JSON.parse(s) : null;
}

function checkAuth(requiredRole) {
  const session = getSession();
  if (!session || session.role !== requiredRole) {
    const loginPaths = {
      user: "/user/login.html",
      admin: "/admin/login.html",
      technician: "/technician/login.html",
    };
    window.location.href = loginPaths[requiredRole] || "/index.html";
    return null;
  }
  return session;
}

function logout() {
  sessionStorage.removeItem("gs_session");
  window.location.href = "/index.html";
}

// ---------- Format Date ----------
function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------- Status Badge HTML ----------
function statusBadge(status) {
  const classes = {
    Pending: "badge--pending",
    Assigned: "badge--assigned",
    "In Progress": "badge--progress",
    Completed: "badge--completed",
  };
  return `<span class="badge ${classes[status] || "badge--pending"}">${status}</span>`;
}

// ---------- Priority Badge HTML ----------
function priorityBadge(priority) {
  const classes = {
    Urgent: "priority--urgent",
    High: "priority--high",
    Medium: "priority--medium",
    Low: "priority--low",
  };
  return `<span class="priority-badge ${classes[priority] || "priority--low"}">${priority}</span>`;
}

// ---------- Sidebar Toggle (Mobile) ----------
function initSidebar() {
  const toggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");

  if (toggle && sidebar) {
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("sidebar--open");
      if (overlay) overlay.classList.toggle("overlay--visible");
    });
  }
  if (overlay && sidebar) {
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("sidebar--open");
      overlay.classList.remove("overlay--visible");
    });
  }
}

// ---------- Initialize DB on load ----------
const db = new GramSevaDB();
