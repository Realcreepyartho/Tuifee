/* =========================================================
   TUIFEE — APPLICATION SCRIPT
   Sections: State, Storage, Utilities, Toasts, Confirm,
   Auth, Theme System, Routing, Modals, Dashboard, Students,
   Batches, Fees, Payments, Fee History, Reports, Settings,
   Charts, Event Handlers, Initialization
   ========================================================= */

/* ===================== STATE ===================== */
const STORAGE_KEYS = {
  DATA: 'tuifee_data',
  THEME: 'tuifee_theme',
  AUTH: 'tuifee_auth',
  SETTINGS: 'tuifee_settings',
  SESSION: 'tuifee_session'
};

let state = {
  students: [],   // {id,name,className,batchId,guardianName,joinDate,mobile,notes,monthlyFee,dueDay,createdAt,updatedAt,deleted}
  batches: [],    // {id,name,className,subject,startTime,endTime,days[],defaultMonthlyFee,description,createdAt}
  payments: [],   // {id,studentId,month,amount,paymentDate,paymentTime,method,notes,createdAt}
  feeHistory: [], // {id,studentId,paymentId,month,amount,previousStatus,newStatus,totalPaid,remainingAmount,date,time,timestamp}
  settings: {
    tuitionName: 'Tuifee Tuitions',
    teacherName: 'Teacher',
    mobile: '',
    defaultMonthlyFee: 1000,
    currency: '₹',
    defaultDueDay: 5,
    defaultStatus: 'unpaid'
  },
  theme: 'lilac'
};

let auth = { username: 'teacher', password: 'teacher123' };
let currentView = 'dashboard';

const THEMES = [
  { id: 'lilac', name: 'Lilac Light', colors: ['#ffffff', '#ede9fe', '#7c3aed'] },
  { id: 'ocean', name: 'Ocean Blue', colors: ['#ffffff', '#e0f2fe', '#0284c7'] },
  { id: 'mint', name: 'Mint Fresh', colors: ['#ffffff', '#d1fae5', '#059669'] },
  { id: 'sunset', name: 'Sunset', colors: ['#ffffff', '#ffedd5', '#ea580c'] },
  { id: 'rose', name: 'Rose', colors: ['#ffffff', '#ffe4e9', '#e11d48'] },
  { id: 'darkpurple', name: 'Dark Purple', colors: ['#17101f', '#2a1c3d', '#a78bfa'] },
  { id: 'midnight', name: 'Midnight Blue', colors: ['#0b1220', '#132038', '#38bdf8'] }
];

/* ===================== STORAGE ===================== */
function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DATA);
    if (raw) {
      const parsed = JSON.parse(raw);
      state.students = Array.isArray(parsed.students) ? parsed.students : [];
      state.batches = Array.isArray(parsed.batches) ? parsed.batches : [];
      state.payments = Array.isArray(parsed.payments) ? parsed.payments : [];
      state.feeHistory = Array.isArray(parsed.feeHistory) ? parsed.feeHistory : [];
    }
  } catch (e) {
    console.warn('Tuifee: could not read local data, starting fresh.', e);
    state.students = []; state.batches = []; state.payments = []; state.feeHistory = [];
  }
}
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify({
      students: state.students, batches: state.batches,
      payments: state.payments, feeHistory: state.feeHistory
    }));
  } catch (e) { console.warn('Tuifee: could not save data.', e); }
}
function getStudents() { return state.students; }
function getBatches() { return state.batches; }
function getPayments() { return state.payments; }
function getFeeHistory() { return state.feeHistory; }
function saveStudents() { saveData(); }
function saveBatches() { saveData(); }
function savePayments() { saveData(); }
function saveFeeHistory() { saveData(); }

function loadAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (raw) auth = JSON.parse(raw);
    else localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(auth));
  } catch (e) { console.warn('Tuifee: auth load failed, using defaults.', e); }
}
function saveAuth() { localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(auth)); }

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) state.settings = Object.assign({}, state.settings, JSON.parse(raw));
  } catch (e) { console.warn('Tuifee: settings load failed, using defaults.', e); }
}
function saveSettings() { localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings)); }

function loadTheme() {
  const t = localStorage.getItem(STORAGE_KEYS.THEME);
  state.theme = t && THEMES.some(th => th.id === t) ? t : 'lilac';
  document.body.setAttribute('data-theme', state.theme);
}
function persistTheme() { localStorage.setItem(STORAGE_KEYS.THEME, state.theme); }

/* ===================== UTILITIES ===================== */
function pad2(n) { return String(n).padStart(2, '0'); }
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function currentMonthKey() { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; }
function monthKeyFromDateStr(dateStr) {
  if (!dateStr) return currentMonthKey();
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return currentMonthKey();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function formatMonthLabel(monthKey) {
  if (!monthKey) return '—';
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}
function formatDateLabel(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
function formatTimeLabel(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function formatCurrency(n) {
  const val = Math.round(Number(n) || 0);
  return (state.settings.currency || '₹') + val.toLocaleString('en-IN');
}
function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function getCSSVar(name) { return getComputedStyle(document.body).getPropertyValue(name).trim(); }
function reducedMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

function animateValue(el, start, end, formatter, duration) {
  if (!el) return;
  duration = reducedMotion() ? 1 : (duration || 700);
  const startTime = performance.now();
  function tick(now) {
    const p = clamp((now - startTime) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = start + (end - start) * eased;
    el.textContent = formatter(val);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ===================== DATA HELPERS / FEE LOGIC ===================== */
function getActiveStudents() { return state.students.filter(s => !s.deleted); }
function getStudentById(id) { return state.students.find(s => s.id === id) || null; }
function getBatchById(id) { return state.batches.find(b => b.id === id) || null; }
function getBatchName(batchId) { const b = getBatchById(batchId); return b ? b.name : 'Unassigned'; }
function getBatchClass(batchId) { const b = getBatchById(batchId); return b ? b.className : ''; }

function getPaymentsFor(studentId, month) {
  return state.payments.filter(p => p.studentId === studentId && p.month === month);
}
function getTotalPaidForMonth(studentId, month) {
  return getPaymentsFor(studentId, month).reduce((sum, p) => sum + Number(p.amount || 0), 0);
}
function getStudentFeeInfo(student, month) {
  const fee = Number(student.monthlyFee) || 0;
  const paid = getTotalPaidForMonth(student.id, month);
  const pending = Math.max(fee - paid, 0);
  let baseStatus = paid <= 0 ? 'unpaid' : (paid < fee ? 'partial' : 'paid');
  let displayStatus = baseStatus;
  if (baseStatus !== 'paid') {
    const [y, m] = month.split('-').map(Number);
    const dueDate = new Date(y, m - 1, clamp(student.dueDay || 5, 1, 28));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (dueDate < today) displayStatus = 'overdue';
  }
  return { fee, paid, pending, baseStatus, displayStatus };
}
function statusBadge(status) {
  const map = {
    paid: ['badge-paid', 'Paid'], partial: ['badge-partial', 'Partially Paid'],
    unpaid: ['badge-unpaid', 'Pending'], overdue: ['badge-overdue', 'Overdue']
  };
  const [cls, label] = map[status] || map.unpaid;
  return `<span class="badge ${cls}">${label}</span>`;
}
function computeMonthTotals(month) {
  let expected = 0, paid = 0;
  getActiveStudents().forEach(s => {
    const info = getStudentFeeInfo(s, month);
    expected += info.fee; paid += info.paid;
  });
  const pending = Math.max(expected - paid, 0);
  const paidPct = expected > 0 ? clamp(Math.round((paid / expected) * 100), 0, 100) : 0;
  const pendingPct = expected > 0 ? clamp(Math.round((pending / expected) * 100), 0, 100) : 0;
  return { expected, paid, pending, paidPct, pendingPct };
}

function recordPayment({ studentId, month, amount, paymentDate, method, notes }) {
  const student = getStudentById(studentId);
  if (!student) return null;
  const before = getStudentFeeInfo(student, month);
  const payment = {
    id: uid(), studentId, month, amount: Number(amount) || 0,
    paymentDate: paymentDate || todayStr(), paymentTime: new Date().toISOString(),
    method: method || 'Cash', notes: notes || '', createdAt: new Date().toISOString()
  };
  state.payments.push(payment);
  const after = getStudentFeeInfo(student, month);
  const now = new Date();
  state.feeHistory.push({
    id: uid(), studentId, paymentId: payment.id, month, amount: payment.amount,
    previousStatus: before.baseStatus, newStatus: after.baseStatus,
    totalPaid: after.paid, remainingAmount: after.pending,
    date: todayStr(), time: formatTimeLabel(now.toISOString()), timestamp: now.toISOString()
  });
  saveData();
  return payment;
}
function reversePayment(paymentId) {
  const payment = state.payments.find(p => p.id === paymentId);
  if (!payment) return;
  const student = getStudentById(payment.studentId);
  const before = student ? getStudentFeeInfo(student, payment.month) : null;
  state.payments = state.payments.filter(p => p.id !== paymentId);
  const after = student ? getStudentFeeInfo(student, payment.month) : null;
  if (student) {
    const now = new Date();
    state.feeHistory.push({
      id: uid(), studentId: student.id, paymentId: null, month: payment.month,
      amount: -payment.amount, previousStatus: before.baseStatus, newStatus: after.baseStatus,
      totalPaid: after.paid, remainingAmount: after.pending,
      date: todayStr(), time: formatTimeLabel(now.toISOString()), timestamp: now.toISOString(),
      note: 'Payment reversed'
    });
  }
  saveData();
}

/* ===================== TOASTS ===================== */
function showToast(message, type) {
  type = type || 'success';
  const icons = { success: '✅', error: '⛔', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.success}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 280);
  }, 3200);
}

/* ===================== CONFIRM DIALOG ===================== */
function showConfirm({ title, message, confirmText, danger, requireText, onConfirm }) {
  const titleEl = document.getElementById('confirm-title');
  const msgEl = document.getElementById('confirm-message');
  const inputEl = document.getElementById('confirm-input');
  const okBtn = document.getElementById('confirm-ok-btn');
  titleEl.textContent = title || 'Are you sure?';
  msgEl.textContent = message || '';
  okBtn.textContent = confirmText || (danger ? 'Delete' : 'Confirm');
  okBtn.className = 'btn ' + (danger === false ? 'btn-primary' : 'btn-danger');

  if (requireText) {
    inputEl.classList.remove('hidden');
    inputEl.value = '';
    inputEl.placeholder = `Type ${requireText} to continue`;
    okBtn.disabled = true;
    inputEl.oninput = () => { okBtn.disabled = inputEl.value.trim() !== requireText; };
  } else {
    inputEl.classList.add('hidden');
    okBtn.disabled = false;
    inputEl.oninput = null;
  }

  okBtn.onclick = () => {
    closeModal('confirm-modal');
    if (typeof onConfirm === 'function') onConfirm();
  };
  openModal('confirm-modal');
}

/* ===================== MODALS ===================== */
function openModal(id) {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  const modal = document.getElementById(id);
  modal.classList.add('active');
  const firstInput = modal.querySelector('input:not([type=hidden]), select, textarea');
  if (firstInput) setTimeout(() => firstInput.focus(), 60);
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
  const anyActive = document.querySelector('.modal.active');
  if (!anyActive) document.getElementById('modal-overlay').classList.add('hidden');
}
function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
  document.getElementById('modal-overlay').classList.add('hidden');
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const anyActive = document.querySelector('.modal.active');
    if (anyActive) closeModal(anyActive.id);
  }
});
document.addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') closeAllModals();
  const closeBtn = e.target.closest('[data-close-modal]');
  if (closeBtn) closeModal(closeBtn.getAttribute('data-close-modal'));
});

/* ===================== AUTH ===================== */
function isLoggedIn() { return sessionStorage.getItem(STORAGE_KEYS.SESSION) === '1'; }
function setLoggedIn(val) {
  if (val) sessionStorage.setItem(STORAGE_KEYS.SESSION, '1');
  else sessionStorage.removeItem(STORAGE_KEYS.SESSION);
}
function doLogin(username, password) {
  if (username === auth.username && password === auth.password) {
    setLoggedIn(true);
    showApp();
    return true;
  }
  return false;
}
function doLogout() {
  setLoggedIn(false);
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('landing-page').classList.remove('hidden');
}

/* ===================== PAGE SWITCHING (LANDING / LOGIN / APP) ===================== */
function showLanding() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('landing-page').classList.remove('hidden');
}
function showLogin() {
  document.getElementById('landing-page').classList.add('hidden');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-page').classList.remove('hidden');
  document.getElementById('login-username').focus();
}
function showApp() {
  document.getElementById('landing-page').classList.add('hidden');
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  navigateTo('dashboard');
  updateTopbarMeta();
}

/* ===================== THEME SYSTEM ===================== */
function setTheme(id, announce) {
  if (!THEMES.some(t => t.id === id)) return;
  state.theme = id;
  document.body.setAttribute('data-theme', id);
  persistTheme();
  renderThemeGrid();
  redrawActiveCharts();
  if (announce) {
    const t = THEMES.find(t => t.id === id);
    showToast(`Theme changed to ${t.name}`, 'info');
  }
}
function renderThemeGrid() {
  const grid = document.getElementById('theme-grid');
  if (!grid) return;
  grid.innerHTML = THEMES.map(t => `
    <div class="theme-swatch ${state.theme === t.id ? 'selected' : ''}" data-theme-id="${t.id}" tabindex="0" role="button" aria-label="Select ${t.name} theme">
      <div class="theme-swatch-check">✓</div>
      <div class="theme-swatch-preview">
        <span style="background:${t.colors[0]}"></span><span style="background:${t.colors[1]}"></span><span style="background:${t.colors[2]}"></span>
      </div>
      <div class="theme-swatch-name">${t.name}</div>
    </div>
  `).join('');
  grid.querySelectorAll('.theme-swatch').forEach(el => {
    el.addEventListener('click', () => setTheme(el.getAttribute('data-theme-id'), true));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTheme(el.getAttribute('data-theme-id'), true); } });
  });
}

/* ===================== ROUTING ===================== */
const VIEW_TITLES = {
  dashboard: 'Dashboard', students: 'Students', batches: 'Batches',
  fees: 'Fees', history: 'Fee History', reports: 'Reports', settings: 'Settings'
};
function navigateTo(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const target = document.getElementById('view-' + view);
  if (target) target.classList.remove('hidden');
  document.querySelectorAll('.nav-item[data-view]').forEach(n => n.classList.toggle('active', n.getAttribute('data-view') === view));
  document.getElementById('topbar-title').textContent = VIEW_TITLES[view] || 'Tuifee';
  closeMobileSidebar();
  renderCurrentView();
}
function renderCurrentView() {
  switch (currentView) {
    case 'dashboard': renderDashboard(); break;
    case 'students': renderStudents(); break;
    case 'batches': renderBatches(); break;
    case 'fees': renderFees(); break;
    case 'history': renderHistory(); break;
    case 'reports': renderReports(); break;
    case 'settings': renderSettings(); break;
  }
  updateNotifDot();
}
function afterDataChange() {
  saveData();
  renderCurrentView();
}

/* ===================== TOPBAR ===================== */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}
function updateTopbarMeta() {
  const name = state.settings.teacherName || 'Teacher';
  document.getElementById('topbar-greeting').textContent = `${getGreeting()}, ${name} 👋`;
  document.getElementById('topbar-date').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('topbar-avatar').textContent = initials(name);
}
function updateNotifDot() {
  const month = currentMonthKey();
  const count = getActiveStudents().filter(s => getStudentFeeInfo(s, month).displayStatus !== 'paid').length;
  document.getElementById('notif-dot').hidden = count === 0;
}

function closeMobileSidebar() {
  document.getElementById('app').classList.remove('mobile-open');
}

/* ===================== STAT CARD RENDERER ===================== */
function animateStatCards(container) {
  container.querySelectorAll('.stat-value').forEach(el => {
    const raw = Number(el.getAttribute('data-raw')) || 0;
    const isCurrency = el.getAttribute('data-currency') === '1';
    animateValue(el, 0, raw, v => isCurrency ? formatCurrency(v) : Math.round(v).toLocaleString('en-IN') + (el.getAttribute('data-suffix') || ''), 800);
  });
}

/* ===================== DASHBOARD ===================== */
function renderDashboard() {
  const month = currentMonthKey();
  const totals = computeMonthTotals(month);
  const statsEl = document.getElementById('dashboard-stats');
  statsEl.innerHTML = [
    { icon: '👥', val: getActiveStudents().length, label: 'Total Students', currency: false },
    { icon: '📚', val: state.batches.length, label: 'Total Batches', currency: false },
    { icon: '💰', val: totals.paid, label: 'Fees Collected', currency: true },
    { icon: '⏳', val: totals.pending, label: 'Fees Pending', currency: true },
    { icon: '📈', val: totals.paidPct, label: 'Collection %', suffix: '%' },
    { icon: '📉', val: totals.pendingPct, label: 'Pending %', suffix: '%' }
  ].map(s => `<div class="stat-card">
      <span class="stat-icon">${s.icon}</span>
      <div class="stat-value" data-raw="${s.val}" data-currency="${s.currency ? '1' : '0'}" data-suffix="${s.suffix || ''}">${s.currency ? formatCurrency(0) : '0'}</div>
      <div class="stat-label">${s.label}</div>
    </div>`).join('');
  animateStatCards(statsEl);

  document.getElementById('dashboard-month-label').textContent = formatMonthLabel(month);
  document.getElementById('dashboard-doughnut-caption').textContent = `${formatCurrency(totals.paid)} / ${formatCurrency(totals.expected)}`;
  animateValue(document.getElementById('dashboard-doughnut-pct'), 0, totals.paidPct, v => Math.round(v) + '%', 800);
  drawDoughnutAnimated(document.getElementById('dashboard-doughnut'), totals.paid, totals.pending);

  const recent = [...state.payments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const recentEl = document.getElementById('dashboard-recent');
  if (recent.length === 0) {
    recentEl.innerHTML = `<div class="empty-state-inline">No payments recorded yet. Record your first payment from the Fees page.</div>`;
  } else {
    recentEl.innerHTML = recent.map(p => {
      const s = getStudentById(p.studentId);
      const name = s ? s.name : 'Deleted Student';
      return `<div class="recent-item">
        <div class="recent-left">
          <div class="recent-avatar">${initials(name)}</div>
          <div><div class="recent-name">${escapeHtml(name)}</div><div class="recent-meta">${formatMonthLabel(p.month)} · ${formatDateLabel(p.paymentDate)} · ${escapeHtml(p.method)}</div></div>
        </div>
        <div class="recent-amount">+${formatCurrency(p.amount)}</div>
      </div>`;
    }).join('');
  }
}

/* ===================== STUDENTS ===================== */
function populateSelectOptions(select, options, placeholder) {
  const current = select.value;
  select.innerHTML = (placeholder ? `<option value="">${placeholder}</option>` : '') + options.map(o => `<option value="${o.value}">${escapeHtml(o.label)}</option>`).join('');
  if ([...select.options].some(o => o.value === current)) select.value = current;
}
function populateStudentFilterOptions() {
  const classes = [...new Set(getActiveStudents().map(s => s.className).filter(Boolean))].sort();
  const batches = state.batches.map(b => ({ value: b.id, label: b.name }));
  populateSelectOptions(document.getElementById('student-filter-class'), classes.map(c => ({ value: c, label: c })), 'All Classes');
  populateSelectOptions(document.getElementById('student-filter-batch'), batches, 'All Batches');
}
function getFilteredSortedStudents() {
  const q = document.getElementById('student-search').value.trim().toLowerCase();
  const classF = document.getElementById('student-filter-class').value;
  const batchF = document.getElementById('student-filter-batch').value;
  const statusF = document.getElementById('student-filter-status').value;
  const sortV = document.getElementById('student-sort').value;
  const month = currentMonthKey();

  let list = getActiveStudents().filter(s => {
    if (q && !(s.name.toLowerCase().includes(q) || (s.guardianName || '').toLowerCase().includes(q) || (s.mobile || '').includes(q))) return false;
    if (classF && s.className !== classF) return false;
    if (batchF && s.batchId !== batchF) return false;
    if (statusF && getStudentFeeInfo(s, month).displayStatus !== statusF) return false;
    return true;
  });

  list = list.slice();
  switch (sortV) {
    case 'name-asc': list.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'name-desc': list.sort((a, b) => b.name.localeCompare(a.name)); break;
    case 'pending-desc': list.sort((a, b) => getStudentFeeInfo(b, month).pending - getStudentFeeInfo(a, month).pending); break;
    case 'pending-asc': list.sort((a, b) => getStudentFeeInfo(a, month).pending - getStudentFeeInfo(b, month).pending); break;
    case 'fee-desc': list.sort((a, b) => (b.monthlyFee || 0) - (a.monthlyFee || 0)); break;
    case 'newest': list.sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate)); break;
    case 'oldest': list.sort((a, b) => new Date(a.joinDate) - new Date(b.joinDate)); break;
  }
  return list;
}
function renderStudents() {
  populateStudentFilterOptions();
  const list = getFilteredSortedStudents();
  const month = currentMonthKey();
  document.getElementById('student-count').textContent = `${list.length} student${list.length === 1 ? '' : 's'}`;

  const tbody = document.getElementById('students-tbody');
  const cardsWrap = document.getElementById('students-cards');
  const emptyEl = document.getElementById('students-empty');
  const hasAny = getActiveStudents().length > 0;
  emptyEl.classList.toggle('hidden', hasAny);
  document.querySelector('#view-students .table-card > .table-scroll').classList.toggle('hidden', !hasAny);
  cardsWrap.classList.toggle('hidden', !hasAny);

  if (!hasAny) { tbody.innerHTML = ''; cardsWrap.innerHTML = ''; return; }

  tbody.innerHTML = list.map(s => {
    const info = getStudentFeeInfo(s, month);
    return `<tr>
      <td class="cell-name">${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.className)}</td>
      <td>${escapeHtml(getBatchName(s.batchId))}</td>
      <td>${escapeHtml(s.guardianName || '—')}</td>
      <td>${formatDateLabel(s.joinDate)}</td>
      <td>${escapeHtml(s.mobile || '—')}</td>
      <td>${formatCurrency(s.monthlyFee)}</td>
      <td>${statusBadge(info.displayStatus)}</td>
      <td>${formatCurrency(info.pending)}</td>
      <td><div class="row-actions">
        <button class="icon-btn" title="View" data-view-student="${s.id}">👁️</button>
        <button class="icon-btn" title="Edit" data-edit-student="${s.id}">✏️</button>
        <button class="icon-btn" title="Delete" data-delete-student="${s.id}">🗑️</button>
      </div></td>
    </tr>`;
  }).join('');

  cardsWrap.innerHTML = list.map(s => {
    const info = getStudentFeeInfo(s, month);
    return `<div class="student-card-item">
      <div class="sc-top">
        <div><div class="sc-name">${escapeHtml(s.name)}</div><div class="sc-meta">${escapeHtml(s.className)} · ${escapeHtml(getBatchName(s.batchId))}</div></div>
        ${statusBadge(info.displayStatus)}
      </div>
      <div class="sc-row"><span>Monthly Fee</span><strong>${formatCurrency(s.monthlyFee)}</strong></div>
      <div class="sc-row"><span>Pending</span><strong>${formatCurrency(info.pending)}</strong></div>
      <div class="sc-row"><span>Mobile</span><span>${escapeHtml(s.mobile || '—')}</span></div>
      <div class="sc-actions">
        <button class="btn btn-ghost" data-view-student="${s.id}">View</button>
        <button class="btn btn-ghost" data-edit-student="${s.id}">Edit</button>
        <button class="btn btn-ghost" data-delete-student="${s.id}">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function populateBatchSelect(selectEl) {
  const opts = state.batches.map(b => ({ value: b.id, label: `${b.name} (${b.className})` }));
  populateSelectOptions(selectEl, opts, state.batches.length ? 'Select a batch' : 'No batches — create one first');
}

function openStudentModal(studentId) {
  const isEdit = !!studentId;
  const form = document.getElementById('student-form');
  form.reset();
  clearFormErrors(form);
  document.getElementById('student-id').value = studentId || '';
  document.getElementById('student-modal-title').textContent = isEdit ? 'Edit Student' : 'Add Student';
  document.getElementById('student-form-submit').textContent = isEdit ? 'Save Changes' : 'Add Student';
  populateBatchSelect(document.getElementById('f-student-batch'));

  const statusRow = document.getElementById('f-student-status').closest('.form-row');
  statusRow.classList.toggle('hidden', isEdit);
  document.getElementById('student-pending-preview').classList.toggle('hidden', isEdit);

  if (isEdit) {
    const s = getStudentById(studentId);
    if (!s) return;
    document.getElementById('f-student-name').value = s.name;
    document.getElementById('f-student-class').value = s.className;
    document.getElementById('f-student-batch').value = s.batchId || '';
    document.getElementById('f-student-guardian').value = s.guardianName || '';
    document.getElementById('f-student-join').value = s.joinDate;
    document.getElementById('f-student-mobile').value = s.mobile || '';
    document.getElementById('f-student-notes').value = s.notes || '';
    document.getElementById('f-student-fee').value = s.monthlyFee;
    document.getElementById('f-student-due').value = s.dueDay;
  } else {
    document.getElementById('f-student-join').value = todayStr();
    document.getElementById('f-student-fee').value = state.settings.defaultMonthlyFee || '';
    document.getElementById('f-student-due').value = state.settings.defaultDueDay || 5;
    document.getElementById('f-student-status').value = state.settings.defaultStatus || 'unpaid';
    updateStudentPaidGroupVisibility();
  }
  openModal('student-modal');
}
function updateStudentPaidGroupVisibility() {
  const status = document.getElementById('f-student-status').value;
  const group = document.getElementById('f-student-paid-group');
  const paidInput = document.getElementById('f-student-paid');
  const fee = Number(document.getElementById('f-student-fee').value) || 0;
  if (status === 'paid') { paidInput.value = fee; paidInput.disabled = true; }
  else if (status === 'unpaid') { paidInput.value = 0; paidInput.disabled = true; }
  else { paidInput.disabled = false; }
  group.style.opacity = status === 'unpaid' ? '0.6' : '1';
  updateStudentPendingPreview();
}
function updateStudentPendingPreview() {
  const fee = Number(document.getElementById('f-student-fee').value) || 0;
  const paid = Number(document.getElementById('f-student-paid').value) || 0;
  const pending = Math.max(fee - paid, 0);
  document.getElementById('student-pending-preview').textContent = `Pending after this entry: ${formatCurrency(pending)}`;
}
function clearFormErrors(form) { form.querySelectorAll('.field-error').forEach(e => e.textContent = ''); }
function setFieldError(id, msg) { const el = document.getElementById(id); if (el) el.textContent = msg; }

function handleStudentFormSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('student-form');
  clearFormErrors(form);
  const id = document.getElementById('student-id').value;
  const isEdit = !!id;

  const name = document.getElementById('f-student-name').value.trim();
  const className = document.getElementById('f-student-class').value.trim();
  const batchId = document.getElementById('f-student-batch').value;
  const guardianName = document.getElementById('f-student-guardian').value.trim();
  const joinDate = document.getElementById('f-student-join').value;
  const mobile = document.getElementById('f-student-mobile').value.trim();
  const notes = document.getElementById('f-student-notes').value.trim();
  const monthlyFee = Number(document.getElementById('f-student-fee').value);
  const dueDay = Number(document.getElementById('f-student-due').value);

  let valid = true;
  if (!name) { setFieldError('err-student-name', 'Student name is required.'); valid = false; }
  if (!className) { setFieldError('err-student-class', 'Class is required.'); valid = false; }
  if (!batchId) { setFieldError('err-student-batch', 'Please select a batch.'); valid = false; }
  if (!joinDate || isNaN(new Date(joinDate).getTime())) { setFieldError('err-student-join', 'Enter a valid join date.'); valid = false; }
  if (mobile && !/^\d{10}$/.test(mobile)) { setFieldError('err-student-mobile', 'Enter a valid 10-digit mobile number.'); valid = false; }
  if (isNaN(monthlyFee) || monthlyFee < 0) { setFieldError('err-student-fee', 'Monthly fee cannot be negative.'); valid = false; }
  if (isNaN(dueDay) || dueDay < 1 || dueDay > 28) { setFieldError('err-student-due', 'Due day must be between 1 and 28.'); valid = false; }

  let initialStatus, initialPaid = 0;
  if (!isEdit) {
    initialStatus = document.getElementById('f-student-status').value;
    initialPaid = Number(document.getElementById('f-student-paid').value) || 0;
    if (initialStatus === 'partial') {
      if (initialPaid <= 0) { setFieldError('err-student-paid', 'Enter an amount greater than 0.'); valid = false; }
      if (initialPaid >= monthlyFee) { setFieldError('err-student-paid', 'Partial amount must be less than the monthly fee.'); valid = false; }
    }
    if (initialPaid < 0) { setFieldError('err-student-paid', 'Paid amount cannot be negative.'); valid = false; }
    if (initialPaid > monthlyFee) { setFieldError('err-student-paid', 'Paid amount cannot exceed the monthly fee.'); valid = false; }
  }

  if (!valid) return;

  if (isEdit) {
    const s = getStudentById(id);
    Object.assign(s, { name, className, batchId, guardianName, joinDate, mobile, notes, monthlyFee, dueDay, updatedAt: new Date().toISOString() });
    afterDataChange();
    showToast('Student updated successfully', 'success');
  } else {
    const student = {
      id: uid(), name, className, batchId, guardianName, joinDate, mobile, notes,
      monthlyFee, dueDay, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deleted: false
    };
    state.students.push(student);
    let amount = 0;
    if (initialStatus === 'paid') amount = monthlyFee;
    else if (initialStatus === 'partial') amount = initialPaid;
    if (amount > 0) {
      recordPayment({ studentId: student.id, month: monthKeyFromDateStr(joinDate), amount, paymentDate: joinDate, method: 'Cash', notes: 'Initial payment at enrollment' });
    }
    afterDataChange();
    showToast('Student added successfully', 'success');
  }
  closeModal('student-modal');
}

function confirmDeleteStudent(id) {
  const s = getStudentById(id);
  if (!s) return;
  showConfirm({
    title: 'Delete Student',
    message: `Remove ${s.name} from your active students? Their payment history will be preserved for your records.`,
    confirmText: 'Delete Student',
    danger: true,
    onConfirm: () => {
      s.deleted = true; s.deletedAt = new Date().toISOString();
      afterDataChange();
      showToast('Student removed', 'success');
    }
  });
}

function openViewStudentModal(id) {
  const s = getStudentById(id);
  if (!s) return;
  const month = currentMonthKey();
  const info = getStudentFeeInfo(s, month);
  const payments = state.payments.filter(p => p.studentId === id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  document.getElementById('view-student-title').textContent = s.name;
  document.getElementById('view-student-body').innerHTML = `
    <div class="profile-head">
      <div class="profile-avatar">${initials(s.name)}</div>
      <div>
        <h2 style="margin-bottom:4px">${escapeHtml(s.name)}</h2>
        <p>${escapeHtml(s.className)} · ${escapeHtml(getBatchName(s.batchId))}</p>
      </div>
    </div>
    <div class="profile-info-grid">
      <div class="profile-info-item"><span>Guardian</span><strong>${escapeHtml(s.guardianName || '—')}</strong></div>
      <div class="profile-info-item"><span>Mobile</span><strong>${escapeHtml(s.mobile || '—')}</strong></div>
      <div class="profile-info-item"><span>Join Date</span><strong>${formatDateLabel(s.joinDate)}</strong></div>
      <div class="profile-info-item"><span>Monthly Fee</span><strong>${formatCurrency(s.monthlyFee)}</strong></div>
      <div class="profile-info-item"><span>This Month's Status</span><strong>${statusBadge(info.displayStatus)}</strong></div>
      <div class="profile-info-item"><span>Pending Amount</span><strong>${formatCurrency(info.pending)}</strong></div>
    </div>
    ${s.notes ? `<p><strong>Notes:</strong> ${escapeHtml(s.notes)}</p>` : ''}
    <div class="profile-actions">
      <button class="btn btn-secondary" id="profile-edit-btn">✏️ Edit Student</button>
      <button class="btn btn-primary" id="profile-payment-btn">💳 Record Payment</button>
    </div>
    <h3 class="form-section-title">Payment History</h3>
    ${payments.length === 0 ? '<p>No payments recorded yet.</p>' : payments.map(p => `
      <div class="profile-history-item">
        <span>${formatMonthLabel(p.month)} · ${escapeHtml(p.method)} · ${formatDateLabel(p.paymentDate)}</span>
        <span style="display:flex;align-items:center;gap:10px;">
          <strong>${formatCurrency(p.amount)}</strong>
          <button class="icon-btn" title="Reverse payment" data-reverse-payment="${p.id}" style="width:26px;height:26px;font-size:0.8rem;">✕</button>
        </span>
      </div>`).join('')}
  `;
  document.getElementById('profile-edit-btn').onclick = () => { closeModal('view-student-modal'); openStudentModal(s.id); };
  document.getElementById('profile-payment-btn').onclick = () => { closeModal('view-student-modal'); openPaymentModal({ studentId: s.id, month }); };
  document.getElementById('view-student-body').querySelectorAll('[data-reverse-payment]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.getAttribute('data-reverse-payment');
      showConfirm({
        title: 'Reverse Payment',
        message: 'This will remove the payment and update the fee status accordingly.',
        confirmText: 'Reverse Payment', danger: true,
        onConfirm: () => { reversePayment(pid); afterDataChange(); openViewStudentModal(id); showToast('Payment reversed', 'warning'); }
      });
    });
  });
  openModal('view-student-modal');
}

/* ===================== BATCHES ===================== */
function renderBatches() {
  const grid = document.getElementById('batches-grid');
  const emptyEl = document.getElementById('batches-empty');
  emptyEl.classList.toggle('hidden', state.batches.length > 0);
  grid.classList.toggle('hidden', state.batches.length === 0);

  grid.innerHTML = state.batches.map(b => {
    const studentCount = getActiveStudents().filter(s => s.batchId === b.id).length;
    const schedule = [(b.days || []).join(', '), (b.startTime && b.endTime) ? `${b.startTime}–${b.endTime}` : ''].filter(Boolean).join(' · ') || 'No schedule set';
    return `<div class="batch-card">
      <div class="batch-card-top">
        <div>
          <div class="batch-name">${escapeHtml(b.name)}</div>
          <span class="batch-class">${escapeHtml(b.className)}</span>
        </div>
      </div>
      ${b.subject ? `<div class="batch-subject">${escapeHtml(b.subject)}</div>` : ''}
      <div class="batch-schedule">🕒 ${escapeHtml(schedule)}</div>
      <div class="batch-stats">
        <div class="batch-stat"><strong>${studentCount}</strong><span>Students</span></div>
        <div class="batch-stat"><strong>${formatCurrency(b.defaultMonthlyFee || 0)}</strong><span>Default Fee</span></div>
      </div>
      <div class="batch-actions">
        <button class="btn btn-ghost" data-view-batch-students="${b.id}">View Students</button>
        <button class="btn btn-ghost" data-edit-batch="${b.id}">Edit</button>
        <button class="btn btn-ghost" data-delete-batch="${b.id}">Delete</button>
      </div>
    </div>`;
  }).join('');
}
function openBatchModal(batchId) {
  const isEdit = !!batchId;
  const form = document.getElementById('batch-form');
  form.reset();
  clearFormErrors(form);
  document.getElementById('batch-id').value = batchId || '';
  document.getElementById('batch-modal-title').textContent = isEdit ? 'Edit Batch' : 'Create Batch';
  document.getElementById('batch-form-submit').textContent = isEdit ? 'Save Changes' : 'Create Batch';
  document.querySelectorAll('#batch-day-picker input').forEach(cb => cb.checked = false);

  if (isEdit) {
    const b = getBatchById(batchId);
    if (!b) return;
    document.getElementById('f-batch-name').value = b.name;
    document.getElementById('f-batch-class').value = b.className;
    document.getElementById('f-batch-subject').value = b.subject || '';
    document.getElementById('f-batch-fee').value = b.defaultMonthlyFee || '';
    document.getElementById('f-batch-start').value = b.startTime || '';
    document.getElementById('f-batch-end').value = b.endTime || '';
    document.getElementById('f-batch-desc').value = b.description || '';
    (b.days || []).forEach(d => {
      const cb = document.querySelector(`#batch-day-picker input[value="${d}"]`);
      if (cb) cb.checked = true;
    });
  }
  openModal('batch-modal');
}
function handleBatchFormSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('batch-form');
  clearFormErrors(form);
  const id = document.getElementById('batch-id').value;
  const isEdit = !!id;
  const name = document.getElementById('f-batch-name').value.trim();
  const className = document.getElementById('f-batch-class').value.trim();
  const subject = document.getElementById('f-batch-subject').value.trim();
  const defaultMonthlyFee = Number(document.getElementById('f-batch-fee').value) || 0;
  const startTime = document.getElementById('f-batch-start').value;
  const endTime = document.getElementById('f-batch-end').value;
  const description = document.getElementById('f-batch-desc').value.trim();
  const days = [...document.querySelectorAll('#batch-day-picker input:checked')].map(cb => cb.value);

  let valid = true;
  if (!name) { setFieldError('err-batch-name', 'Batch name is required.'); valid = false; }
  if (!className) { setFieldError('err-batch-class', 'Class is required.'); valid = false; }
  if (defaultMonthlyFee < 0) { valid = false; }
  if (!valid) return;

  if (isEdit) {
    const b = getBatchById(id);
    Object.assign(b, { name, className, subject, defaultMonthlyFee, startTime, endTime, days, description });
    afterDataChange();
    showToast('Batch updated successfully', 'success');
  } else {
    state.batches.push({ id: uid(), name, className, subject, defaultMonthlyFee, startTime, endTime, days, description, createdAt: new Date().toISOString() });
    afterDataChange();
    showToast('Batch created successfully', 'success');
  }
  closeModal('batch-modal');
}
function confirmDeleteBatch(id) {
  const b = getBatchById(id);
  if (!b) return;
  const count = getActiveStudents().filter(s => s.batchId === id).length;
  const message = count > 0
    ? `${count} student${count === 1 ? '' : 's'} ${count === 1 ? 'is' : 'are'} in "${b.name}". Deleting will unassign them (they'll show as "Unassigned"), but their records stay safe.`
    : `This will permanently delete the "${b.name}" batch.`;
  showConfirm({
    title: 'Delete Batch', message, confirmText: 'Delete Batch', danger: true,
    onConfirm: () => {
      state.students.forEach(s => { if (s.batchId === id) s.batchId = null; });
      state.batches = state.batches.filter(x => x.id !== id);
      afterDataChange();
      showToast('Batch deleted', 'success');
    }
  });
}

/* ===================== FEES ===================== */
function populateFeeFilterOptions() {
  const classes = [...new Set(getActiveStudents().map(s => s.className).filter(Boolean))].sort();
  const batches = state.batches.map(b => ({ value: b.id, label: b.name }));
  populateSelectOptions(document.getElementById('fees-filter-class'), classes.map(c => ({ value: c, label: c })), 'All Classes');
  populateSelectOptions(document.getElementById('fees-filter-batch'), batches, 'All Batches');
}
function renderFees() {
  const monthInput = document.getElementById('fees-month');
  if (!monthInput.value) monthInput.value = currentMonthKey();
  const month = monthInput.value;
  populateFeeFilterOptions();

  const totals = computeMonthTotals(month);
  document.getElementById('fees-summary').innerHTML = `
    <div class="fee-summary-item"><span>Expected</span><strong>${formatCurrency(totals.expected)}</strong></div>
    <div class="fee-summary-item"><span>Collected</span><strong>${formatCurrency(totals.paid)}</strong></div>
    <div class="fee-summary-item"><span>Pending</span><strong>${formatCurrency(totals.pending)}</strong></div>
    <div class="fee-summary-item"><span>Collection %</span><strong>${totals.paidPct}%</strong></div>
  `;

  const q = document.getElementById('fees-search').value.trim().toLowerCase();
  const batchF = document.getElementById('fees-filter-batch').value;
  const classF = document.getElementById('fees-filter-class').value;
  const statusF = document.getElementById('fees-filter-status').value;

  let list = getActiveStudents().filter(s => {
    if (q && !s.name.toLowerCase().includes(q)) return false;
    if (batchF && s.batchId !== batchF) return false;
    if (classF && s.className !== classF) return false;
    if (statusF && getStudentFeeInfo(s, month).displayStatus !== statusF) return false;
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));

  const tbody = document.getElementById('fees-tbody');
  const cardsWrap = document.getElementById('fees-cards');
  const emptyEl = document.getElementById('fees-empty');
  const hasAny = getActiveStudents().length > 0;
  emptyEl.classList.toggle('hidden', hasAny);
  document.querySelector('#view-fees .table-card > .table-scroll').classList.toggle('hidden', !hasAny);
  cardsWrap.classList.toggle('hidden', !hasAny);
  if (!hasAny) { tbody.innerHTML = ''; cardsWrap.innerHTML = ''; return; }

  tbody.innerHTML = list.map(s => {
    const info = getStudentFeeInfo(s, month);
    return `<tr>
      <td class="cell-name">${escapeHtml(s.name)}</td>
      <td>${escapeHtml(getBatchName(s.batchId))}</td>
      <td>${formatMonthLabel(month)}</td>
      <td>${formatCurrency(info.fee)}</td>
      <td>${formatCurrency(info.paid)}</td>
      <td>${formatCurrency(info.pending)}</td>
      <td>${statusBadge(info.displayStatus)}</td>
      <td>${info.pending > 0 ? `<button class="btn btn-secondary" data-record-payment="${s.id}" data-month="${month}">Record Payment</button>` : '<span style="color:var(--success);font-weight:700;">Settled</span>'}</td>
    </tr>`;
  }).join('');

  cardsWrap.innerHTML = list.map(s => {
    const info = getStudentFeeInfo(s, month);
    return `<div class="student-card-item">
      <div class="sc-top"><div><div class="sc-name">${escapeHtml(s.name)}</div><div class="sc-meta">${escapeHtml(getBatchName(s.batchId))} · ${formatMonthLabel(month)}</div></div>${statusBadge(info.displayStatus)}</div>
      <div class="sc-row"><span>Fee</span><strong>${formatCurrency(info.fee)}</strong></div>
      <div class="sc-row"><span>Paid</span><strong>${formatCurrency(info.paid)}</strong></div>
      <div class="sc-row"><span>Pending</span><strong>${formatCurrency(info.pending)}</strong></div>
      ${info.pending > 0 ? `<div class="sc-actions"><button class="btn btn-primary" data-record-payment="${s.id}" data-month="${month}">Record Payment</button></div>` : ''}
    </div>`;
  }).join('');
}

/* ===================== PAYMENTS ===================== */
function populatePaymentStudentSelect() {
  const sel = document.getElementById('f-payment-student');
  const opts = getActiveStudents().sort((a, b) => a.name.localeCompare(b.name)).map(s => ({ value: s.id, label: `${s.name} (${s.className})` }));
  populateSelectOptions(sel, opts, getActiveStudents().length ? null : 'No students yet');
}
function updatePaymentStatusBox() {
  const studentId = document.getElementById('f-payment-student').value;
  const month = document.getElementById('f-payment-month').value || currentMonthKey();
  const box = document.getElementById('payment-status-box');
  const s = getStudentById(studentId);
  if (!s) { box.innerHTML = ''; return; }
  const info = getStudentFeeInfo(s, month);
  box.innerHTML = `
    <div><span style="color:var(--text-secondary);font-size:0.76rem;">Monthly Fee</span><strong>${formatCurrency(info.fee)}</strong></div>
    <div><span style="color:var(--text-secondary);font-size:0.76rem;">Paid So Far</span><strong>${formatCurrency(info.paid)}</strong></div>
    <div><span style="color:var(--text-secondary);font-size:0.76rem;">Remaining</span><strong>${formatCurrency(info.pending)}</strong></div>
  `;
}
function openPaymentModal({ studentId, month }) {
  const form = document.getElementById('payment-form');
  form.reset();
  document.getElementById('err-payment-amount').textContent = '';
  populatePaymentStudentSelect();
  document.getElementById('f-payment-month').value = month || currentMonthKey();
  document.getElementById('f-payment-date').value = todayStr();
  if (studentId) document.getElementById('f-payment-student').value = studentId;
  updatePaymentStatusBox();
  openModal('payment-modal');
}
function handlePaymentFormSubmit(e) {
  e.preventDefault();
  document.getElementById('err-payment-amount').textContent = '';
  const studentId = document.getElementById('f-payment-student').value;
  const month = document.getElementById('f-payment-month').value;
  const paymentDate = document.getElementById('f-payment-date').value;
  const amount = Number(document.getElementById('f-payment-amount').value);
  const method = document.getElementById('f-payment-method').value;
  const notes = document.getElementById('f-payment-notes').value.trim();
  const s = getStudentById(studentId);

  if (!s) { showToast('Please select a student', 'error'); return; }
  const info = getStudentFeeInfo(s, month);
  if (isNaN(amount) || amount <= 0) { setFieldError('err-payment-amount', 'Enter an amount greater than 0.'); return; }
  if (amount > info.pending) { setFieldError('err-payment-amount', `Amount exceeds the pending fee of ${formatCurrency(info.pending)}.`); return; }

  recordPayment({ studentId, month, amount, paymentDate, method, notes });
  afterDataChange();
  const after = getStudentFeeInfo(s, month);
  showToast(after.pending === 0 ? 'Fee marked as paid' : 'Partial payment recorded', 'success');
  closeModal('payment-modal');
}

/* ===================== FEE HISTORY ===================== */
function populateHistoryFilterOptions() {
  const studentOpts = state.students.slice().sort((a, b) => a.name.localeCompare(b.name))
    .map(s => ({ value: s.id, label: s.name + (s.deleted ? ' (Deleted)' : '') }));
  const batchOpts = state.batches.map(b => ({ value: b.id, label: b.name }));
  populateSelectOptions(document.getElementById('history-filter-student'), studentOpts, 'All Students');
  populateSelectOptions(document.getElementById('history-filter-batch'), batchOpts, 'All Batches');
}
function renderHistory() {
  populateHistoryFilterOptions();
  const studentF = document.getElementById('history-filter-student').value;
  const batchF = document.getElementById('history-filter-batch').value;
  const monthF = document.getElementById('history-filter-month').value;
  const statusF = document.getElementById('history-filter-status').value;
  const sortV = document.getElementById('history-sort').value;

  let list = state.feeHistory.filter(h => {
    if (studentF && h.studentId !== studentF) return false;
    if (monthF && h.month !== monthF) return false;
    if (statusF && h.newStatus !== statusF) return false;
    if (batchF) { const s = getStudentById(h.studentId); if (!s || s.batchId !== batchF) return false; }
    return true;
  });
  list = list.slice().sort((a, b) => sortV === 'oldest' ? new Date(a.timestamp) - new Date(b.timestamp) : new Date(b.timestamp) - new Date(a.timestamp));

  const tbody = document.getElementById('history-tbody');
  const emptyEl = document.getElementById('history-empty');
  emptyEl.classList.toggle('hidden', list.length > 0);
  document.querySelector('#view-history .table-scroll').classList.toggle('hidden', list.length === 0);

  const statusLabel = { paid: 'Paid', partial: 'Partially Paid', unpaid: 'Unpaid' };
  tbody.innerHTML = list.map(h => {
    const s = getStudentById(h.studentId);
    const name = s ? s.name + (s.deleted ? ' (Deleted)' : '') : 'Deleted Student';
    return `<tr>
      <td class="cell-name">${escapeHtml(name)}</td>
      <td>${formatMonthLabel(h.month)}</td>
      <td>${statusLabel[h.previousStatus] || h.previousStatus} → <strong>${statusLabel[h.newStatus] || h.newStatus}</strong></td>
      <td>${h.amount < 0 ? '−' : ''}${formatCurrency(Math.abs(h.amount))}</td>
      <td>${formatCurrency(h.remainingAmount)}</td>
      <td>${formatDateLabel(h.date)} <span class="cell-sub">${escapeHtml(h.time)}</span></td>
    </tr>`;
  }).join('');
}

/* ===================== REPORTS ===================== */
function renderReports() {
  const month = currentMonthKey();
  const totals = computeMonthTotals(month);
  const statsEl = document.getElementById('reports-stats');
  statsEl.innerHTML = [
    { icon: '👥', val: getActiveStudents().length, label: 'Total Students', currency: false },
    { icon: '📚', val: state.batches.length, label: 'Total Batches', currency: false },
    { icon: '🎯', val: totals.expected, label: 'Total Expected Fees', currency: true },
    { icon: '💰', val: totals.paid, label: 'Total Paid', currency: true },
    { icon: '⏳', val: totals.pending, label: 'Total Pending', currency: true },
    { icon: '📈', val: totals.paidPct, label: 'Paid %', suffix: '%' }
  ].map(s => `<div class="stat-card">
      <span class="stat-icon">${s.icon}</span>
      <div class="stat-value" data-raw="${s.val}" data-currency="${s.currency ? '1' : '0'}" data-suffix="${s.suffix || ''}">${s.currency ? formatCurrency(0) : '0'}</div>
      <div class="stat-label">${s.label}</div>
    </div>`).join('');
  animateStatCards(statsEl);

  animateValue(document.getElementById('reports-doughnut-pct'), 0, totals.paidPct, v => Math.round(v) + '%', 800);
  drawDoughnutAnimated(document.getElementById('reports-doughnut'), totals.paid, totals.pending);

  // Monthly collection chart
  const byMonth = {};
  state.payments.forEach(p => { byMonth[p.month] = (byMonth[p.month] || 0) + Number(p.amount || 0); });
  const months = Object.keys(byMonth).sort();
  const recentMonths = months.slice(-6);
  const chartWrap = document.getElementById('monthly-chart-wrap');
  const chartEmpty = document.getElementById('monthly-chart-empty');
  if (recentMonths.length === 0) {
    chartWrap.classList.add('hidden'); chartEmpty.classList.remove('hidden');
  } else {
    chartWrap.classList.remove('hidden'); chartEmpty.classList.add('hidden');
    const labels = recentMonths.map(m => formatMonthLabel(m).split(' ')[0].slice(0, 3));
    const values = recentMonths.map(m => byMonth[m]);
    drawBarChart(document.getElementById('monthly-chart'), labels, values);
  }

  // Batch-wise report
  const batchListEl = document.getElementById('batch-report-list');
  const batchEmptyEl = document.getElementById('batch-report-empty');
  if (state.batches.length === 0) {
    batchListEl.innerHTML = ''; batchEmptyEl.classList.remove('hidden');
  } else {
    batchEmptyEl.classList.add('hidden');
    batchListEl.innerHTML = state.batches.map(b => {
      const students = getActiveStudents().filter(s => s.batchId === b.id);
      let expected = 0, paid = 0;
      students.forEach(s => { const info = getStudentFeeInfo(s, month); expected += info.fee; paid += info.paid; });
      const pending = Math.max(expected - paid, 0);
      const pct = expected > 0 ? clamp(Math.round((paid / expected) * 100), 0, 100) : 0;
      return `<div class="batch-report-item">
        <div class="batch-report-top"><span>${escapeHtml(b.name)}</span><span>${pct}%</span></div>
        <div class="batch-report-bar"><div class="batch-report-fill" style="width:${pct}%"></div></div>
        <div class="batch-report-meta"><span>Expected: ${formatCurrency(expected)}</span><span>Paid: ${formatCurrency(paid)}</span><span>Pending: ${formatCurrency(pending)}</span></div>
      </div>`;
    }).join('');
  }
}

/* ===================== CHARTS (CANVAS) ===================== */
let _doughnutAnimFrames = {};
function drawDoughnutStatic(canvas, paidFrac, colorPaid, colorPending) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || canvas.width, cssH = canvas.clientHeight || canvas.height;
  if (canvas.width !== cssW * dpr) { canvas.width = cssW * dpr; canvas.height = cssH * dpr; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  const cx = cssW / 2, cy = cssH / 2, radius = Math.min(cssW, cssH) / 2 - 12, lineWidth = radius * 0.34;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.strokeStyle = colorPending; ctx.lineWidth = lineWidth; ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
  if (paidFrac > 0) {
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + paidFrac * Math.PI * 2 * 0.999;
    ctx.beginPath(); ctx.strokeStyle = colorPaid; ctx.lineWidth = lineWidth; ctx.arc(cx, cy, radius, startAngle, endAngle); ctx.stroke();
  }
}
function drawDoughnutAnimated(canvas, paid, pending) {
  if (!canvas) return;
  const colorPaid = getCSSVar('--chart-paid') || '#7c3aed';
  const colorPending = getCSSVar('--chart-pending') || '#e4defc';
  const total = paid + pending;
  const targetFrac = total > 0 ? paid / total : 0;
  if (_doughnutAnimFrames[canvas.id]) cancelAnimationFrame(_doughnutAnimFrames[canvas.id]);
  if (reducedMotion()) { drawDoughnutStatic(canvas, targetFrac, colorPaid, colorPending); return; }
  const duration = 800;
  const start = performance.now();
  function tick(now) {
    const p = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    drawDoughnutStatic(canvas, targetFrac * eased, colorPaid, colorPending);
    if (p < 1) _doughnutAnimFrames[canvas.id] = requestAnimationFrame(tick);
  }
  _doughnutAnimFrames[canvas.id] = requestAnimationFrame(tick);
}
function roundRectPath(ctx, x, y, w, h, r) {
  if (h < 1) h = 1;
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawBarChart(canvas, labels, values) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || canvas.width, cssH = canvas.clientHeight || canvas.height;
  canvas.width = cssW * dpr; canvas.height = cssH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  const max = Math.max(...values, 1);
  const paddingBottom = 30, paddingTop = 14;
  const chartH = cssH - paddingBottom - paddingTop;
  const gap = cssW / values.length;
  const barW = gap * 0.5;
  const color = getCSSVar('--chart-paid') || '#7c3aed';
  const textColor = getCSSVar('--text-secondary') || '#666';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  values.forEach((v, i) => {
    const barH = max > 0 ? (v / max) * chartH : 0;
    const x = i * gap + (gap - barW) / 2;
    const y = cssH - paddingBottom - barH;
    ctx.fillStyle = color;
    roundRectPath(ctx, x, y, barW, barH, 6);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.fillText(labels[i], x + barW / 2, cssH - paddingBottom + 16);
  });
}
function redrawActiveCharts() {
  setTimeout(() => {
    if (currentView === 'dashboard') renderDashboard();
    else if (currentView === 'reports') renderReports();
  }, 50);
}

/* ===================== SETTINGS ===================== */
function renderSettings() {
  document.getElementById('set-username').value = auth.username;
  document.getElementById('set-current-password').value = '';
  document.getElementById('set-new-password').value = '';
  document.getElementById('set-confirm-password').value = '';
  document.getElementById('account-form-error').textContent = '';

  document.getElementById('set-tuition-name').value = state.settings.tuitionName || '';
  document.getElementById('set-teacher-name').value = state.settings.teacherName || '';
  document.getElementById('set-mobile').value = state.settings.mobile || '';
  document.getElementById('set-default-fee').value = state.settings.defaultMonthlyFee || 0;
  document.getElementById('set-currency').value = state.settings.currency || '₹';

  document.getElementById('set-due-day').value = state.settings.defaultDueDay || 5;
  document.getElementById('set-default-status').value = state.settings.defaultStatus || 'unpaid';

  renderThemeGrid();
}
function handleAccountFormSubmit(e) {
  e.preventDefault();
  const errEl = document.getElementById('account-form-error');
  errEl.textContent = '';
  const username = document.getElementById('set-username').value.trim();
  const current = document.getElementById('set-current-password').value;
  const next = document.getElementById('set-new-password').value;
  const confirm = document.getElementById('set-confirm-password').value;

  if (!username) { errEl.textContent = 'Username cannot be empty.'; return; }

  if (next || confirm || current) {
    if (current !== auth.password) { errEl.textContent = 'Current password is incorrect.'; return; }
    if (!next || next.length < 4) { errEl.textContent = 'New password must be at least 4 characters.'; return; }
    if (next !== confirm) { errEl.textContent = 'New password and confirmation do not match.'; return; }
    auth.password = next;
  }
  auth.username = username;
  saveAuth();
  document.getElementById('set-current-password').value = '';
  document.getElementById('set-new-password').value = '';
  document.getElementById('set-confirm-password').value = '';
  showToast('Account settings updated', 'success');
}
function handleProfileFormSubmit(e) {
  e.preventDefault();
  state.settings.tuitionName = document.getElementById('set-tuition-name').value.trim() || 'Tuifee Tuitions';
  state.settings.teacherName = document.getElementById('set-teacher-name').value.trim() || 'Teacher';
  state.settings.mobile = document.getElementById('set-mobile').value.trim();
  state.settings.defaultMonthlyFee = Number(document.getElementById('set-default-fee').value) || 0;
  state.settings.currency = document.getElementById('set-currency').value.trim() || '₹';
  saveSettings();
  updateTopbarMeta();
  showToast('Profile updated successfully', 'success');
  if (currentView !== 'settings') renderCurrentView();
}
function handleFeeSettingsFormSubmit(e) {
  e.preventDefault();
  state.settings.defaultDueDay = clamp(Number(document.getElementById('set-due-day').value) || 5, 1, 28);
  state.settings.defaultStatus = document.getElementById('set-default-status').value;
  saveSettings();
  showToast('Fee settings updated', 'success');
}

/* ===================== DATA EXPORT / IMPORT / CLEAR ===================== */
function exportData() {
  const backup = {
    app: 'Tuifee', version: 1, exportedAt: new Date().toISOString(),
    theme: state.theme, settings: state.settings,
    students: state.students, batches: state.batches,
    payments: state.payments, feeHistory: state.feeHistory
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  a.href = url;
  a.download = `tuifee-backup-${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  showToast('Backup exported successfully', 'success');
}
function importDataFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try { parsed = JSON.parse(reader.result); }
    catch (e) { showToast('That file is not a valid Tuifee backup.', 'error'); return; }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.students) || !Array.isArray(parsed.batches)) {
      showToast('This backup file looks corrupted or incompatible.', 'error'); return;
    }
    showConfirm({
      title: 'Import Backup',
      message: 'Importing this backup may replace your current local data. Do you want to continue?',
      confirmText: 'Import & Replace', danger: true,
      onConfirm: () => {
        try {
          state.students = Array.isArray(parsed.students) ? parsed.students : [];
          state.batches = Array.isArray(parsed.batches) ? parsed.batches : [];
          state.payments = Array.isArray(parsed.payments) ? parsed.payments : [];
          state.feeHistory = Array.isArray(parsed.feeHistory) ? parsed.feeHistory : [];
          if (parsed.settings) state.settings = Object.assign({}, state.settings, parsed.settings);
          saveData(); saveSettings();
          if (parsed.theme) setTheme(parsed.theme, false);
          updateTopbarMeta();
          renderCurrentView();
          showToast('Data imported successfully', 'success');
        } catch (e) {
          showToast('Something went wrong while importing this backup.', 'error');
        }
      }
    });
  };
  reader.onerror = () => showToast('Could not read that file.', 'error');
  reader.readAsText(file);
}
function clearAllData() {
  showConfirm({
    title: 'Clear All Data',
    message: 'This will permanently remove all local Tuifee data. This action cannot be undone unless you have a backup.',
    confirmText: 'Clear All Data', danger: true, requireText: 'CLEAR',
    onConfirm: () => {
      state.students = []; state.batches = []; state.payments = []; state.feeHistory = [];
      saveData();
      renderCurrentView();
      showToast('All Tuifee data has been cleared', 'warning');
    }
  });
}

/* ===================== EVENT HANDLERS ===================== */
function wireEvents() {
  // Landing / login navigation
  document.getElementById('nav-get-started-btn').addEventListener('click', showLogin);
  document.getElementById('get-started-btn').addEventListener('click', showLogin);
  document.getElementById('login-back-btn').addEventListener('click', showLanding);

  document.getElementById('login-password-toggle').addEventListener('click', () => {
    const input = document.getElementById('login-password');
    const btn = document.getElementById('login-password-toggle');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.textContent = show ? '🙈' : '👁️';
  });

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('login-username-error').textContent = '';
    document.getElementById('login-password-error').textContent = '';
    document.getElementById('login-form-error').textContent = '';
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;
    let valid = true;
    if (!u) { document.getElementById('login-username-error').textContent = 'Username is required.'; valid = false; }
    if (!p) { document.getElementById('login-password-error').textContent = 'Password is required.'; valid = false; }
    if (!valid) return;
    if (!doLogin(u, p)) {
      document.getElementById('login-form-error').textContent = 'Incorrect username or password. Please try again.';
    } else {
      showToast(`Welcome back, ${state.settings.teacherName || 'Teacher'}!`, 'success');
    }
  });

  // Sidebar navigation
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.getAttribute('data-view')));
  });
  document.getElementById('logout-btn').addEventListener('click', () => {
    showConfirm({
      title: 'Log Out', message: 'You will need to log in again to access Tuifee.',
      confirmText: 'Log Out', danger: false,
      onConfirm: () => { doLogout(); showToast('Logged out successfully', 'info'); }
    });
  });
  document.getElementById('sidebar-collapse-btn').addEventListener('click', () => {
    document.getElementById('app').classList.toggle('sidebar-collapsed');
  });
  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.getElementById('app').classList.add('mobile-open');
  });
  document.getElementById('sidebar-overlay').addEventListener('click', closeMobileSidebar);

  // Dashboard quick actions
  document.querySelectorAll('.quick-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      if (action === 'add-student') openStudentModal(null);
      if (action === 'add-batch') openBatchModal(null);
      if (action === 'record-payment') openPaymentModal({});
      if (action === 'view-pending') { navigateTo('fees'); setTimeout(() => { document.getElementById('fees-filter-status').value = 'unpaid'; renderFees(); }, 0); }
      if (action === 'view-reports') navigateTo('reports');
    });
  });
  document.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => navigateTo(btn.getAttribute('data-nav'))));

  // Students
  document.getElementById('add-student-btn').addEventListener('click', () => openStudentModal(null));
  document.getElementById('students-empty-add-btn').addEventListener('click', () => openStudentModal(null));
  ['student-search', 'student-filter-class', 'student-filter-batch', 'student-filter-status', 'student-sort'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderStudents);
    document.getElementById(id).addEventListener('change', renderStudents);
  });
  document.getElementById('student-clear-filters').addEventListener('click', () => {
    document.getElementById('student-search').value = '';
    document.getElementById('student-filter-class').value = '';
    document.getElementById('student-filter-batch').value = '';
    document.getElementById('student-filter-status').value = '';
    document.getElementById('student-sort').value = 'name-asc';
    renderStudents();
  });
  document.getElementById('students-table').addEventListener('click', handleStudentTableClick);
  document.getElementById('students-cards').addEventListener('click', handleStudentTableClick);
  function handleStudentTableClick(e) {
    const viewBtn = e.target.closest('[data-view-student]');
    const editBtn = e.target.closest('[data-edit-student]');
    const delBtn = e.target.closest('[data-delete-student]');
    if (viewBtn) openViewStudentModal(viewBtn.getAttribute('data-view-student'));
    if (editBtn) openStudentModal(editBtn.getAttribute('data-edit-student'));
    if (delBtn) confirmDeleteStudent(delBtn.getAttribute('data-delete-student'));
  }
  document.getElementById('student-form').addEventListener('submit', handleStudentFormSubmit);
  document.getElementById('f-student-status').addEventListener('change', updateStudentPaidGroupVisibility);
  document.getElementById('f-student-fee').addEventListener('input', updateStudentPaidGroupVisibility);
  document.getElementById('f-student-paid').addEventListener('input', updateStudentPendingPreview);

  // Batches
  document.getElementById('add-batch-btn').addEventListener('click', () => openBatchModal(null));
  document.getElementById('batches-empty-add-btn').addEventListener('click', () => openBatchModal(null));
  document.getElementById('batch-form').addEventListener('submit', handleBatchFormSubmit);
  document.getElementById('batches-grid').addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit-batch]');
    const delBtn = e.target.closest('[data-delete-batch]');
    const viewBtn = e.target.closest('[data-view-batch-students]');
    if (editBtn) openBatchModal(editBtn.getAttribute('data-edit-batch'));
    if (delBtn) confirmDeleteBatch(delBtn.getAttribute('data-delete-batch'));
    if (viewBtn) {
      const batchId = viewBtn.getAttribute('data-view-batch-students');
      navigateTo('students');
      setTimeout(() => { document.getElementById('student-filter-batch').value = batchId; renderStudents(); }, 0);
    }
  });

  // Fees
  document.getElementById('fees-month').addEventListener('change', renderFees);
  ['fees-search', 'fees-filter-batch', 'fees-filter-class', 'fees-filter-status'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderFees);
    document.getElementById(id).addEventListener('change', renderFees);
  });
  document.getElementById('fees-clear-filters').addEventListener('click', () => {
    document.getElementById('fees-search').value = '';
    document.getElementById('fees-filter-batch').value = '';
    document.getElementById('fees-filter-class').value = '';
    document.getElementById('fees-filter-status').value = '';
    renderFees();
  });
  function handleFeesTableClick(e) {
    const btn = e.target.closest('[data-record-payment]');
    if (btn) openPaymentModal({ studentId: btn.getAttribute('data-record-payment'), month: btn.getAttribute('data-month') });
  }
  document.getElementById('fees-tbody').addEventListener('click', handleFeesTableClick);
  document.getElementById('fees-cards').addEventListener('click', handleFeesTableClick);

  // Payment modal
  document.getElementById('payment-form').addEventListener('submit', handlePaymentFormSubmit);
  document.getElementById('f-payment-student').addEventListener('change', updatePaymentStatusBox);
  document.getElementById('f-payment-month').addEventListener('change', updatePaymentStatusBox);
  document.getElementById('payment-mark-full-btn').addEventListener('click', () => {
    const s = getStudentById(document.getElementById('f-payment-student').value);
    const month = document.getElementById('f-payment-month').value || currentMonthKey();
    if (!s) { showToast('Please select a student first', 'warning'); return; }
    const info = getStudentFeeInfo(s, month);
    document.getElementById('f-payment-amount').value = info.pending;
  });

  // History
  ['history-filter-student', 'history-filter-batch', 'history-filter-month', 'history-filter-status', 'history-sort'].forEach(id => {
    document.getElementById(id).addEventListener('change', renderHistory);
  });
  document.getElementById('history-clear-filters').addEventListener('click', () => {
    document.getElementById('history-filter-student').value = '';
    document.getElementById('history-filter-batch').value = '';
    document.getElementById('history-filter-month').value = '';
    document.getElementById('history-filter-status').value = '';
    document.getElementById('history-sort').value = 'newest';
    renderHistory();
  });

  // Settings
  document.getElementById('account-form').addEventListener('submit', handleAccountFormSubmit);
  document.getElementById('profile-form').addEventListener('submit', handleProfileFormSubmit);
  document.getElementById('fee-settings-form').addEventListener('submit', handleFeeSettingsFormSubmit);
  document.getElementById('export-data-btn').addEventListener('click', exportData);
  document.getElementById('import-data-btn').addEventListener('click', () => document.getElementById('import-file-input').click());
  document.getElementById('import-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importDataFromFile(file);
    e.target.value = '';
  });
  document.getElementById('clear-data-btn').addEventListener('click', clearAllData);

  window.addEventListener('resize', () => { redrawActiveCharts(); });
}

/* ===================== INITIALIZATION ===================== */
function init() {
  loadTheme();
  loadAuth();
  loadSettings();
  loadData();
  wireEvents();
  updateTopbarMeta();
  renderThemeGrid();

  if (isLoggedIn()) {
    showApp();
  } else {
    showLanding();
  }
}

document.addEventListener('DOMContentLoaded', init);