/* app.js — TaskBoard frontend
   Talks to the Flask backend at the same origin (localhost:5000).
   All API calls use fetch() with credentials: 'include' so the
   session cookie is sent automatically.
*/

const API = "";               // empty = same origin; change to "http://localhost:5000" if serving separately
let state = {
  user: null,
  tasks: [],
  courses: [],
  activeCourse: "all",
  activeStatus: "pending",
  activePriority: "all",
  activeView: "tasks",
  editingTaskId: null,
  calDate: new Date(),
  calSelectedDate: null,
  isRegisterMode: false,
};

// ── Helpers ──────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error en el servidor");
  return data;
}

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${months[parseInt(m)-1]} ${parseInt(d)}`;
}

function isOverdue(iso) {
  if (!iso) return false;
  return iso < new Date().toISOString().split("T")[0];
}

function initials(name) {
  return name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase();
}

function showEl(id) { document.getElementById(id).classList.remove("hidden"); }
function hideEl(id) { document.getElementById(id).classList.add("hidden"); }

// ── Auth ─────────────────────────────────────────────────────────

function toggleAuthMode() {
  state.isRegisterMode = !state.isRegisterMode;
  const reg = state.isRegisterMode;
  document.getElementById("auth-submit-btn").textContent = reg ? "Crear cuenta" : "Iniciar sesión";
  document.getElementById("auth-toggle-text").textContent = reg ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?";
  document.getElementById("auth-toggle-link").textContent = reg ? "Inicia sesión" : "Regístrate";
  document.getElementById("register-name-field").classList.toggle("hidden", !reg);
  document.getElementById("login-error").classList.add("hidden");
}

async function submitAuth() {
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const errorEl = document.getElementById("login-error");
  errorEl.classList.add("hidden");

  try {
    if (state.isRegisterMode) {
      const name = document.getElementById("reg-name").value.trim();
      if (!name) { showError(errorEl, "Por favor ingresa tu nombre."); return; }
      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      state.user = data.user;
    } else {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      state.user = data.user;
    }
    await enterApp();
  } catch (err) {
    showError(errorEl, err.message);
  }
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}

async function logout() {
  await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  state.user = null;
  state.tasks = [];
  state.courses = [];
  hideEl("app-view");
  showEl("login-view");
}

// ── App entry ────────────────────────────────────────────────────

async function enterApp() {
  hideEl("login-view");
  showEl("app-view");

  // Update avatar
  document.getElementById("user-avatar").textContent = initials(state.user.name);
  document.getElementById("user-name-label").textContent = state.user.name;

  await loadCourses();
  await loadTasks();
  renderTasks();
  renderCalendar();
}

// ── Courses ──────────────────────────────────────────────────────

async function loadCourses() {
  const data = await apiFetch("/api/courses");
  state.courses = data.courses;
  renderCourseNav();
  renderCourseSelect();
}

function renderCourseNav() {
  const list = document.getElementById("course-nav-list");
  list.innerHTML = state.courses.map(c => `
    <div class="nav-item" onclick="filterCourse('${c.id}')">
      <span class="course-dot" style="background:${c.color};"></span>
      ${c.name}
    </div>
  `).join("");
}

function renderCourseSelect() {
  const sel = document.getElementById("f-course");
  sel.innerHTML = `<option value="">— Sin curso —</option>` +
    state.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
}

function openCourseModal() {
  document.getElementById("c-name").value = "";
  document.getElementById("c-color").value = "#1D9E75";
  showEl("course-modal-overlay");
}

function closeCourseModal() { hideEl("course-modal-overlay"); }

async function saveCourse() {
  const name = document.getElementById("c-name").value.trim();
  if (!name) return;
  const color = document.getElementById("c-color").value;
  await apiFetch("/api/courses", {
    method: "POST",
    body: JSON.stringify({ name, color }),
  });
  closeCourseModal();
  await loadCourses();
}

// ── Tasks ────────────────────────────────────────────────────────

async function loadTasks() {
  const params = new URLSearchParams();
  if (state.activeCourse !== "all") params.set("course_id", state.activeCourse);
  if (state.activeStatus !== "all") params.set("status", state.activeStatus === "pending" ? "Pending" : "Completed");
  if (state.activePriority !== "all") params.set("priority", state.activePriority);

  const data = await apiFetch(`/api/tasks?${params}`);
  state.tasks = data.tasks;
}

function getFilteredTasks() {
  return state.tasks; // filtering already done server-side
}

function renderTasks() {
  const list = document.getElementById("task-list");
  const tasks = getFilteredTasks();

  if (!tasks.length) {
    list.innerHTML = `<div class="empty"><i class="ti ti-checkbox"></i>No hay tareas aquí</div>`;
    return;
  }

  list.innerHTML = tasks.map(t => {
    const overdue = !t.status === "Pending" && isOverdue(t.due_date);
    const badgeClass = t.priority === "High" ? "badge-high" : t.priority === "Medium" ? "badge-medium" : "badge-low";
    const priorityLabel = t.priority === "High" ? "Alta" : t.priority === "Medium" ? "Media" : "Baja";
    const courseColor = state.courses.find(c => c.id === t.course_id)?.color || "#888";
    const checked = t.status === "Completed";

    return `
      <div class="task-card${checked ? " done" : ""}">
        <div class="check-box${checked ? " checked" : ""}" onclick="toggleTask(${t.id})">
          ${checked ? '<i class="ti ti-check"></i>' : ""}
        </div>
        <div class="task-body">
          <div class="task-title${checked ? " done" : ""}">${t.title}</div>
          <div class="task-meta">
            ${t.course_name ? `<span class="badge" style="background:${courseColor}22;color:${courseColor};">${t.course_name}</span>` : ""}
            <span class="badge ${badgeClass}">${priorityLabel}</span>
            ${t.due_date ? `<span class="due-date${isOverdue(t.due_date) && !checked ? " overdue" : ""}">
              <i class="ti ti-calendar-event"></i>${isOverdue(t.due_date) && !checked ? "Vencida · " : ""}${formatDate(t.due_date)}
            </span>` : ""}
          </div>
        </div>
        <div class="task-actions">
          <button class="icon-btn" title="Editar" onclick="editTask(${t.id})"><i class="ti ti-edit"></i></button>
          <button class="icon-btn" title="Eliminar" onclick="deleteTask(${t.id})"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    `;
  }).join("");
}

async function toggleTask(id) {
  await apiFetch(`/api/tasks/${id}/complete`, { method: "PATCH" });
  await loadTasks();
  renderTasks();
  if (state.activeView === "calendar") renderCalendar();
}

async function deleteTask(id) {
  if (!confirm("¿Eliminar esta tarea?")) return;
  await apiFetch(`/api/tasks/${id}`, { method: "DELETE" });
  await loadTasks();
  renderTasks();
  if (state.activeView === "calendar") renderCalendar();
}

// ── Task modal ───────────────────────────────────────────────────

function openTaskModal(prefillDate = null) {
  state.editingTaskId = null;
  document.getElementById("task-modal-title").textContent = "Nueva tarea";
  document.getElementById("f-title").value = "";
  document.getElementById("f-desc").value = "";
  document.getElementById("f-course").value = "";
  document.getElementById("f-due").value = prefillDate || new Date().toISOString().split("T")[0];
  document.getElementById("f-priority").value = "Medium";
  document.getElementById("f-reminder").value = "";
  showEl("task-modal-overlay");
  document.getElementById("f-title").focus();
}

function editTask(id) {
  const t = state.tasks.find(t => t.id === id);
  if (!t) return;
  state.editingTaskId = id;
  document.getElementById("task-modal-title").textContent = "Editar tarea";
  document.getElementById("f-title").value = t.title;
  document.getElementById("f-desc").value = t.description || "";
  document.getElementById("f-course").value = t.course_id || "";
  document.getElementById("f-due").value = t.due_date || "";
  document.getElementById("f-priority").value = t.priority;
  document.getElementById("f-reminder").value = t.reminder_at ? t.reminder_at.slice(0,16) : "";
  showEl("task-modal-overlay");
}

function closeTaskModal() { hideEl("task-modal-overlay"); }

async function saveTask() {
  const title = document.getElementById("f-title").value.trim();
  if (!title) { alert("El título es obligatorio."); return; }

  const body = {
    title,
    description: document.getElementById("f-desc").value,
    course_id: document.getElementById("f-course").value || null,
    due_date: document.getElementById("f-due").value || null,
    priority: document.getElementById("f-priority").value,
    reminder_at: document.getElementById("f-reminder").value || null,
  };

  if (state.editingTaskId) {
    await apiFetch(`/api/tasks/${state.editingTaskId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  } else {
    await apiFetch("/api/tasks", { method: "POST", body: JSON.stringify(body) });
  }

  closeTaskModal();
  await loadTasks();
  renderTasks();
  if (state.activeView === "calendar") renderCalendar();
}

// ── Filters ──────────────────────────────────────────────────────

async function filterCourse(id) {
  state.activeCourse = id;
  // Update sidebar active state
  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
  document.getElementById("nav-tasks").classList.add("active");
  await loadTasks();
  renderTasks();
  if (state.activeView === "calendar") renderCalendar();
}

async function filterStatus(s) {
  state.activeStatus = s;
  ["pending", "done", "all-s"].forEach(x => {
    document.getElementById("tab-" + x).classList.toggle("active", x === s || (s === "all" && x === "all-s"));
  });
  await loadTasks();
  renderTasks();
}

async function filterPriority(el, p) {
  state.activePriority = p;
  document.querySelectorAll("#priority-filters .filter-chip").forEach(c => c.classList.remove("active"));
  el.classList.add("active");
  await loadTasks();
  renderTasks();
}

// ── Views ────────────────────────────────────────────────────────

function switchView(v) {
  state.activeView = v;
  document.getElementById("tasks-view").classList.toggle("hidden", v !== "tasks");
  document.getElementById("calendar-view-panel").classList.toggle("hidden", v !== "calendar");
  document.getElementById("nav-tasks").classList.toggle("active", v === "tasks");
  document.getElementById("nav-calendar").classList.toggle("active", v === "calendar");
  if (v === "calendar") renderCalendar();
}

// ── Calendar ─────────────────────────────────────────────────────

function changeMonth(dir) {
  state.calDate.setMonth(state.calDate.getMonth() + dir);
  renderCalendar();
}

function renderCalendar() {
  const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const d = state.calDate;
  const year = d.getFullYear(), month = d.getMonth();

  document.getElementById("cal-month-label").textContent = `${months[month]} ${year}`;

  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  // Build a set of dates that have tasks
  const taskDates = new Set(state.tasks.map(t => t.due_date).filter(Boolean));

  let html = "";

  // Padding for previous month
  for (let i = 0; i < first; i++) {
    const pd = new Date(year, month, -first + i + 1);
    html += `<div class="cal-cell other-month">${pd.getDate()}</div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const isToday = ds === todayStr;
    const isSelected = ds === state.calSelectedDate;
    const hasTasks = taskDates.has(ds);

    html += `<div class="cal-cell${isToday ? " today" : ""}${isSelected ? " selected" : ""}" onclick="selectCalDay('${ds}')">
      ${day}
      ${hasTasks ? '<div class="dot"></div>' : ""}
    </div>`;
  }

  document.getElementById("cal-grid").innerHTML = html;
  renderCalTaskList(state.calSelectedDate);
}

function selectCalDay(ds) {
  state.calSelectedDate = ds;
  renderCalendar();
}

function renderCalTaskList(ds) {
  const el = document.getElementById("cal-task-list");
  if (!ds) { el.innerHTML = ""; return; }

  const dayTasks = state.tasks.filter(t => t.due_date === ds);
  if (!dayTasks.length) {
    el.innerHTML = `<div class="empty" style="padding:16px 0;">No hay tareas el ${formatDate(ds)}
      <br><button class="add-btn" style="margin:8px auto 0; font-size:12px;" onclick="openTaskModal('${ds}')">
        <i class="ti ti-plus"></i> Agregar tarea
      </button>
    </div>`;
    return;
  }

  el.innerHTML = `<div style="font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:8px;">Tareas del ${formatDate(ds)}</div>` +
    dayTasks.map(t => {
      const checked = t.status === "Completed";
      const courseColor = state.courses.find(c => c.id === t.course_id)?.color || "#888";
      const badgeClass = t.priority === "High" ? "badge-high" : t.priority === "Medium" ? "badge-medium" : "badge-low";
      const priorityLabel = t.priority === "High" ? "Alta" : t.priority === "Medium" ? "Media" : "Baja";
      return `
        <div class="task-card${checked ? " done" : ""}">
          <div class="check-box${checked ? " checked" : ""}" onclick="toggleTask(${t.id})">
            ${checked ? '<i class="ti ti-check"></i>' : ""}
          </div>
          <div class="task-body">
            <div class="task-title${checked ? " done" : ""}">${t.title}</div>
            <div class="task-meta">
              ${t.course_name ? `<span class="badge" style="background:${courseColor}22;color:${courseColor};">${t.course_name}</span>` : ""}
              <span class="badge ${badgeClass}">${priorityLabel}</span>
            </div>
          </div>
        </div>`;
    }).join("");
}

// ── Reminder polling ─────────────────────────────────────────────

async function checkReminders() {
  try {
    const data = await apiFetch("/api/tasks/reminders/due");
    data.reminders.forEach(t => {
      if (Notification.permission === "granted") {
        new Notification("TaskBoard — Recordatorio", {
          body: `${t.title}${t.due_date ? " · Entrega: " + formatDate(t.due_date) : ""}`,
          icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><text y='20' font-size='20'>📚</text></svg>",
        });
      }
    });
  } catch (_) {}
}

// Request notification permission once user is logged in
function requestNotifPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

// ── Init ─────────────────────────────────────────────────────────

(async function init() {
  // Check if already logged in (session cookie still valid)
  try {
    const data = await apiFetch("/api/auth/me");
    state.user = data.user;
    await enterApp();
    requestNotifPermission();
    setInterval(checkReminders, 60_000); // check every minute
  } catch (_) {
    // Not logged in — show login screen
    showEl("login-view");
    hideEl("app-view");
  }
})();
