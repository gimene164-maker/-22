/* ============================================
   VIP Platform - Main Application
   ============================================ */

// State
let currentRoute = '';
let deferredPrompt = null;

// DOM refs
const publicShell = document.getElementById('publicShell');
const authShell = document.getElementById('authShell');
const appShell = document.getElementById('appShell');
const authContent = document.getElementById('authContent');
const sidebar = document.getElementById('sidebar');
const mainArea = document.getElementById('mainArea');
const modalOverlay = document.getElementById('modalOverlay');
const modalBody = document.getElementById('modalBody');
const toastWrap = document.getElementById('toastWrap');

/* ============================================
   ROUTING
   ============================================ */

function navigate(hash) {
  window.location.hash = hash;
}

function handleRoute() {
  const hash = window.location.hash || '#/';
  const path = hash.replace('#', '').split('?')[0];
  currentRoute = path;

  // Hide all shells
  publicShell.classList.remove('active');
  authShell.classList.remove('active');
  appShell.classList.remove('active');
  publicShell.style.display = 'none';
  authShell.style.display = 'none';
  appShell.style.display = 'none';

  const user = VIPDB.getCurrentUser();

  // Public routes
  if (path === '/' || path === '' || path === '/login') {
    if (user) {
      navigate(user.role === 'admin' ? '#/admin/dashboard' : '#/student/dashboard');
      return;
    }
    if (path === '/login') {
      authShell.style.display = 'flex';
      authShell.classList.add('active');
      renderLogin();
    } else {
      publicShell.style.display = 'block';
      publicShell.classList.add('active');
      loadPublicData();
    }
    return;
  }

  // Auth required
  if (!user) {
    navigate('#/login');
    return;
  }

  // Admin routes
  if (path.startsWith('/admin')) {
    if (user.role !== 'admin') {
      navigate('#/student/dashboard');
      return;
    }
    appShell.style.display = 'flex';
    appShell.classList.add('active');
    renderAdminSidebar();
    renderAdminPage(path);
    return;
  }

  // Student routes
  if (path.startsWith('/student')) {
    if (user.role !== 'student') {
      navigate('#/admin/dashboard');
      return;
    }
    appShell.style.display = 'flex';
    appShell.classList.add('active');
    renderStudentSidebar();
    renderStudentPage(path);
    return;
  }

  // Default
  navigate('#/');
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', () => {
  VIPDB.initDB().then(() => handleRoute());
});

/* ============================================
   PUBLIC PAGES
   ============================================ */

async function loadPublicData() {
  try {
    const teachers = await VIPDB.getTeachers();
    const grid = document.getElementById('teachersGrid');
    if (!grid) return;

    document.getElementById('heroTeacherCount').textContent = teachers.length;

    grid.innerHTML = teachers.map(t => `
      <div class="card teacher-card" style="animation: fadeInUp 0.5s ease-out both;">
        <div class="avatar">${t.name.charAt(0)}</div>
        <h4>${t.name}</h4>
        <div class="subject">${t.subject}</div>
        <p class="bio">${t.bio || ''}</p>
      </div>
    `).join('');

    // Load library preview
    const books = await VIPDB.getBooks({ status: 'active' });
    const libGrid = document.getElementById('libraryPreviewGrid');
    if (libGrid && books.length > 0) {
      libGrid.innerHTML = books.slice(0, 4).map(b => `
        <div class="card library-card" style="animation: fadeInUp 0.5s ease-out both;">
          <div class="lib-img" style="background: linear-gradient(135deg, var(--green-700), var(--green-500));"></div>
          <div class="lib-body">
            <h4>${b.name}</h4>
            <p>${b.description || 'كتاب تعليمي مميز'}</p>
            <div class="lib-meta">
              <span class="lib-tag teacher-tag">${b.teacherName || b.teacherId || 'VIP'}</span>
              <span class="lib-tag">${b.subject || ''}</span>
            </div>
          </div>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error('Load public data error:', e);
  }
}

function toggleFaq(el) {
  const item = el.closest('.faq-item');
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!wasOpen) item.classList.add('open');
}

/* ============================================
   LOGIN & REGISTRATION
   ============================================ */

function renderLogin() {
  authContent.innerHTML = `
    <div class="auth-box">
      <div class="brand"><div class="mark">VIP</div> VIP</div>
      <h2>تسجيل الدخول</h2>
      <p class="subtitle">أدخل كود الاشتراك الخاص بك للوصول للمنصة</p>

      <form onsubmit="handleLogin(event)">
        <div class="form-group">
          <label>كود الاشتراك</label>
          <input type="text" id="loginCode" placeholder="مثال: VIP-8K29X7" required 
                 style="text-transform: uppercase; letter-spacing: 1px;" 
                 oninput="this.value = this.value.toUpperCase()">
          <div class="hint">الكود يتكون من 10 أحرف ويحتوي على شرطة</div>
        </div>
        <button type="submit" class="btn btn-primary w-full" id="loginBtn">
          <span>دخول</span>
        </button>
      </form>

      <div class="login-helper">
        <div class="login-helper-item">
          <span style="color: var(--text-3);">للاشتراك أو الحصول على كود الدخول تواصل معنا عبر واتساب</span>
        </div>
        <div class="login-helper-item">
          <a href="https://wa.me/${VIPDB.WHATSAPP_NUMBER}" target="_blank" rel="noopener">
            📱 20 11 48865176
          </a>
        </div>
        <div class="login-helper-item">
          <a href="https://wa.me/${VIPDB.WHATSAPP_NUMBER}" target="_blank" rel="noopener" style="font-size: 13px;">
            واتساب الإدارة
          </a>
        </div>
      </div>
    </div>
  `;
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const codeInput = document.getElementById('loginCode');
  const codeValue = codeInput.value.trim();

  if (!codeValue) return;

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>';

  try {
    // Check admin code first (for demo: admin@elite3.local passwordless via special code)
    if (codeValue === '0VIP0') {
      const adminUser = { id: 'admin', role: 'admin', name: 'الأدمن', email: VIPDB.ADMIN_EMAIL };
      VIPDB.setCurrentUser(adminUser);
      showToast('تم تسجيل الدخول كأدمن', 'success');
      navigate('#/admin/dashboard');
      return;
    }

    const validation = await VIPDB.validateCode(codeValue);
    if (!validation.valid) {
      showToast(validation.reason, 'error');
      btn.disabled = false;
      btn.innerHTML = '<span>دخول</span>';
      return;
    }

    const code = validation.code;

    // Check if student already registered with this code
    const existingStudent = await VIPDB.getStudentByCode(code.id);
    if (existingStudent) {
      // Login existing student
      VIPDB.setCurrentUser({ ...existingStudent, role: 'student' });
      showToast('مرحبًا بك مجددًا، ' + existingStudent.fullName, 'success');
      navigate('#/student/dashboard');
      return;
    }

    // New student - show registration form
    renderStudentRegistration(code);

  } catch (err) {
    console.error(err);
    showToast('حدث خطأ، حاول مرة أخرى', 'error');
    btn.disabled = false;
    btn.innerHTML = '<span>دخول</span>';
  }
}

function renderStudentRegistration(code) {
  authContent.innerHTML = `
    <div class="auth-box" style="max-width: 520px;">
      <div class="brand"><div class="mark">VIP</div> VIP</div>
      <h2>إكمال بيانات الحساب</h2>
      <p class="subtitle">أكمل بياناتك للانضمام لمنصة VIP</p>

      <form onsubmit="handleStudentRegistration(event, '${code.id}')">
        <div class="grid grid-2" style="grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label>الاسم بالكامل *</label>
            <input type="text" id="regName" required placeholder="الاسم رباعي">
          </div>
          <div class="form-group">
            <label>رقم الهاتف *</label>
            <input type="tel" id="regPhone" required placeholder="01xxxxxxxxx">
          </div>
          <div class="form-group">
            <label>رقم ولي الأمر *</label>
            <input type="tel" id="regParentPhone" required placeholder="01xxxxxxxxx">
          </div>
          <div class="form-group">
            <label>المحافظة *</label>
            <select id="regGovernorate" required>
              <option value="">اختر المحافظة</option>
              <option value="القاهرة">القاهرة</option>
              <option value="الجيزة">الجيزة</option>
              <option value="الإسكندرية">الإسكندرية</option>
              <option value="الدقهلية">الدقهلية</option>
              <option value="الشرقية">الشرقية</option>
              <option value="الغربية">الغربية</option>
              <option value="القليوبية">القليوبية</option>
              <option value="المنوفية">المنوفية</option>
              <option value="كفر الشيخ">كفر الشيخ</option>
              <option value="البحيرة">البحيرة</option>
              <option value="دمياط">دمياط</option>
              <option value="بورسعيد">بورسعيد</option>
              <option value="الإسماعيلية">الإسماعيلية</option>
              <option value="السويس">السويس</option>
              <option value="شمال سيناء">شمال سيناء</option>
              <option value="جنوب سيناء">جنوب سيناء</option>
              <option value="بني سويف">بني سويف</option>
              <option value="الفيوم">الفيوم</option>
              <option value="المنيا">المنيا</option>
              <option value="أسيوط">أسيوط</option>
              <option value="سوهاج">سوهاج</option>
              <option value="قنا">قنا</option>
              <option value="الأقصر">الأقصر</option>
              <option value="أسوان">أسوان</option>
              <option value="البحر الأحمر">البحر الأحمر</option>
              <option value="الوادي الجديد">الوادي الجديد</option>
              <option value="مطروح">مطروح</option>
            </select>
          </div>
          <div class="form-group">
            <label>المدرسة *</label>
            <input type="text" id="regSchool" required placeholder="اسم المدرسة">
          </div>
          <div class="form-group">
            <label>الصف الدراسي *</label>
            <select id="regGrade" required>
              <option value="">اختر الصف</option>
              <option value="الثالث الثانوي">الثالث الثانوي</option>
              <option value="الثاني الثانوي">الثاني الثانوي</option>
              <option value="الأول الثانوي">الأول الثانوي</option>
            </select>
          </div>
          <div class="form-group">
            <label>الشعبة *</label>
            <select id="regSection" required>
              <option value="">اختر الشعبة</option>
              <option value="علمي علوم">علمي علوم</option>
              <option value="علمي رياضة">علمي رياضة</option>
              <option value="أدبي">أدبي</option>
            </select>
          </div>
          <div class="form-group">
            <label>البريد الإلكتروني</label>
            <input type="email" id="regEmail" placeholder="اختياري">
          </div>
        </div>

        <div class="form-group mt-2">
          <label>الكود: <span style="color: var(--green-400); font-family: monospace;">${code.code}</span></label>
          <div class="hint">مدة الاشتراك: ${code.duration || 30} يوم | تاريخ الانتهاء: ${formatDate(code.expiresAt)}</div>
        </div>

        <button type="submit" class="btn btn-primary w-full mt-2" id="regBtn">
          <span>إكمال التسجيل</span>
        </button>
      </form>
    </div>
  `;
}

async function handleStudentRegistration(e, codeId) {
  e.preventDefault();
  const btn = document.getElementById('regBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div> جاري التسجيل...';

  try {
    const studentData = {
      fullName: document.getElementById('regName').value.trim(),
      phone: document.getElementById('regPhone').value.trim(),
      parentPhone: document.getElementById('regParentPhone').value.trim(),
      governorate: document.getElementById('regGovernorate').value,
      school: document.getElementById('regSchool').value.trim(),
      grade: document.getElementById('regGrade').value,
      section: document.getElementById('regSection').value,
      email: document.getElementById('regEmail').value.trim() || null
    };

    // Validate
    if (!studentData.fullName || !studentData.phone || !studentData.governorate) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      btn.disabled = false;
      btn.innerHTML = '<span>إكمال التسجيل</span>';
      return;
    }

    // Create student
    const student = await VIPDB.registerStudent(studentData, codeId);

    // Mark code as used
    const deviceId = navigator.userAgent + '_' + Date.now();
    await VIPDB.useCode(codeId, student.id, deviceId);

    // Login
    VIPDB.setCurrentUser({ ...student, role: 'student' });
    showToast('تم التسجيل بنجاح! مرحبًا بك في VIP', 'success');
    navigate('#/student/dashboard');

  } catch (err) {
    console.error(err);
    showToast('حدث خطأ أثناء التسجيل', 'error');
    btn.disabled = false;
    btn.innerHTML = '<span>إكمال التسجيل</span>';
  }
}

/* ============================================
   SIDEBARS
   ============================================ */

function renderAdminSidebar() {
  const path = currentRoute;
  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div class="brand"><div class="mark">VIP</div> VIP</div>
      <p style="color: var(--text-3); font-size: 12px; margin-top: 4px;">لوحة التحكم</p>
    </div>
    <nav class="sidebar-nav">
      <a href="#/admin/dashboard" class="${path === '/admin/dashboard' ? 'active' : ''}">📊 الإحصائيات</a>
      <a href="#/admin/codes" class="${path === '/admin/codes' ? 'active' : ''}">🔑 الأكواد</a>
      <a href="#/admin/students" class="${path === '/admin/students' ? 'active' : ''}">👥 الطلاب</a>
      <a href="#/admin/teachers" class="${path === '/admin/teachers' ? 'active' : ''}">👨‍🏫 المدرسون</a>
      <a href="#/admin/library" class="${path === '/admin/library' ? 'active' : ''}">📚 المكتبة</a>
      <a href="#/admin/videos" class="${path === '/admin/videos' ? 'active' : ''}">🎬 إدارة الفيديوهات</a>
      <a href="#/admin/exams" class="${path === '/admin/exams' ? 'active' : ''}">📝 الامتحانات</a>
      <a href="#/admin/notifications" class="${path === '/admin/notifications' ? 'active' : ''}">🔔 الإشعارات</a>
    </nav>
    <div class="sidebar-footer">
      <button class="btn btn-ghost w-full" onclick="VIPDB.logout()">🚪 تسجيل الخروج</button>
    </div>
  `;
}

function renderStudentSidebar() {
  const path = currentRoute;
  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div class="brand"><div class="mark">VIP</div> VIP</div>
      <p style="color: var(--text-3); font-size: 12px; margin-top: 4px;">منصة التميز</p>
    </div>
    <nav class="sidebar-nav">
      <a href="#/student/dashboard" class="${path === '/student/dashboard' ? 'active' : ''}">🏠 الرئيسية</a>
      <a href="#/student/exams" class="${path === '/student/exams' ? 'active' : ''}">📝 الامتحانات</a>
      <a href="#/student/lessons" class="${path === '/student/lessons' ? 'active' : ''}">📖 الدروس</a>
      <a href="#/student/library" class="${path === '/student/library' ? 'active' : ''}">📚 المكتبة</a>
      <a href="#/student/rankings" class="${path === '/student/rankings' ? 'active' : ''}">🏆 الترتيب</a>
      <a href="#/student/profile" class="${path === '/student/profile' ? 'active' : ''}">👤 الملف الشخصي</a>
    </nav>
    <div class="sidebar-footer">
      <button class="btn btn-ghost w-full" onclick="VIPDB.logout()">🚪 تسجيل الخروج</button>
    </div>
  `;
}

/* ============================================
   ADMIN PAGES
   ============================================ */

function renderAdminPage(path) {
  switch (path) {
    case '/admin/dashboard': renderAdminDashboard(); break;
    case '/admin/codes': renderAdminCodes(); break;
    case '/admin/students': renderAdminStudents(); break;
    case '/admin/teachers': renderAdminTeachers(); break;
    case '/admin/library': renderAdminLibrary(); break;
    case '/admin/videos': renderAdminVideos(); break;
    case '/admin/exams': renderAdminExams(); break;
    case '/admin/notifications': renderAdminNotifications(); break;
    default: renderAdminDashboard();
  }
}

// Admin Dashboard
async function renderAdminDashboard() {
  mainArea.innerHTML = '<div class="page-header"><h1>الإحصائيات</h1><p>تحليل شامل لبيانات المنصة</p></div><div id="adminStats">جاري التحميل...</div>';

  try {
    const stats = await VIPDB.getAnalytics();
    const govStats = await VIPDB.getGovernorateStats();

    mainArea.innerHTML = `
      <div class="page-header">
        <h1>📊 الإحصائيات</h1>
        <p>نظرة شاملة على أداء المنصة والطلاب</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">إجمالي الطلاب</div>
          <div class="stat-value">${stats.totalStudents}</div>
          <div class="stat-change up">+${stats.todayRegistrations} اليوم</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">الطلاب النشطون</div>
          <div class="stat-value">${stats.activeStudents}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">الاشتراكات النشطة</div>
          <div class="stat-value">${stats.activeSubscriptions}</div>
          <div class="stat-change up">+${stats.newSubscriptions} هذا الشهر</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">الاشتراكات المنتهية</div>
          <div class="stat-value">${stats.expiredSubscriptions}</div>
          <div class="stat-change down">${stats.expiredThisMonth} هذا الشهر</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">الأكواد المستخدمة</div>
          <div class="stat-value">${stats.usedCodes}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">الأكواد غير المستخدمة</div>
          <div class="stat-value">${stats.unusedCodes}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">عدد المدرسين</div>
          <div class="stat-value">${stats.totalTeachers}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">الكتب والBoxات</div>
          <div class="stat-value">${stats.totalBooks + stats.totalBoxes}</div>
        </div>
      </div>

      <div class="grid grid-2" style="margin-top: 32px;">
        <div class="chart-container">
          <h3>📍 الطلاب حسب المحافظة</h3>
          <div id="govChart">
            ${govStats.length === 0 ? '<p style="color: var(--text-3); text-align: center;">لا توجد بيانات كافية</p>' : 
              govStats.map(([gov, count]) => `
                <div style="margin-bottom: 16px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span style="font-weight: 700;">${gov}</span>
                    <span style="color: var(--green-400); font-weight: 800;">${count} طالب</span>
                  </div>
                  <div style="background: var(--surface-2); height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, var(--green-700), var(--green-500)); height: 100%; border-radius: 4px; width: ${Math.min((count / stats.totalStudents) * 100, 100)}%; transition: width 1s ease-out;"></div>
                  </div>
                </div>
              `).join('')
            }
          </div>
        </div>

        <div class="chart-container">
          <h3>📈 التسجيلات الزمنية</h3>
          <div class="chart-bar" style="height: 180px;">
            <div class="chart-bar-item">
              <div class="bar" style="height: ${Math.min(stats.todayRegistrations * 10 + 20, 100)}%"></div>
              <span class="label">اليوم</span>
              <span style="font-size: 12px; font-weight: 800; color: var(--green-400);">${stats.todayRegistrations}</span>
            </div>
            <div class="chart-bar-item">
              <div class="bar" style="height: ${Math.min(stats.weekRegistrations * 3 + 20, 100)}%"></div>
              <span class="label">هذا الأسبوع</span>
              <span style="font-size: 12px; font-weight: 800; color: var(--green-400);">${stats.weekRegistrations}</span>
            </div>
            <div class="chart-bar-item">
              <div class="bar" style="height: ${Math.min(stats.monthRegistrations * 1.5 + 20, 100)}%"></div>
              <span class="label">هذا الشهر</span>
              <span style="font-size: 12px; font-weight: 800; color: var(--green-400);">${stats.monthRegistrations}</span>
            </div>
            <div class="chart-bar-item">
              <div class="bar" style="height: ${Math.min(stats.totalStudents * 0.5 + 20, 100)}%"></div>
              <span class="label">الإجمالي</span>
              <span style="font-size: 12px; font-weight: 800; color: var(--green-400);">${stats.totalStudents}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    console.error(e);
    mainArea.innerHTML = '<div class="page-header"><h1>خطأ</h1><p>تعذر تحميل الإحصائيات</p></div>';
  }
}

// Admin Codes
async function renderAdminCodes() {
  mainArea.innerHTML = `
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
      <div>
        <h1>🔑 إدارة الأكواد</h1>
        <p>إنشاء وإدارة أكواد الاشتراك</p>
      </div>
      <button class="btn btn-primary" onclick="showCreateCodeModal()">+ إنشاء كود جديد</button>
    </div>
    <div id="codesTable">جاري التحميل...</div>
  `;

  try {
    const codes = await VIPDB.getAllCodes();
    const students = await VIPDB.getDocs(VIPDB.COLLECTIONS.students);
    const studentMap = {};
    students.forEach(s => studentMap[s.codeId] = s);

    mainArea.querySelector('#codesTable').innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الكود</th>
              <th>الحالة</th>
              <th>الطالب</th>
              <th>تاريخ البداية</th>
              <th>تاريخ الانتهاء</th>
              <th>تاريخ الاستخدام</th>
              <th>المدة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${codes.map(c => {
              const student = studentMap[c.id];
              const statusClass = c.status === 'unused' ? 'status-inactive' : 
                                  c.status === 'used' ? 'status-active' :
                                  c.status === 'expired' ? 'status-expired' :
                                  c.status === 'suspended' ? 'status-pending' : 'status-inactive';
              const statusText = c.status === 'unused' ? 'غير مستخدم' :
                                 c.status === 'used' ? 'فعال' :
                                 c.status === 'expired' ? 'منتهي' :
                                 c.status === 'suspended' ? 'موقوف' : c.status;
              return `
                <tr>
                  <td style="font-family: monospace; font-weight: 800; color: var(--green-400);">${c.code}</td>
                  <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                  <td>${student ? student.fullName : '-'}</td>
                  <td>${formatDate(c.startsAt)}</td>
                  <td>${formatDate(c.expiresAt)}</td>
                  <td>${c.usedAt ? formatDate(c.usedAt) : '-'}</td>
                  <td>${c.duration || 30} يوم</td>
                  <td>
                    <div style="display: flex; gap: 8px;">
                      ${c.status === 'unused' ? `<button class="btn btn-sm btn-ghost" onclick="suspendCode('${c.id}')">🚫 إيقاف</button>` : ''}
                      ${c.status === 'suspended' ? `<button class="btn btn-sm btn-ghost" onclick="activateCode('${c.id}')">✅ تفعيل</button>` : ''}
                      ${c.status === 'used' ? `<button class="btn btn-sm btn-ghost" onclick="extendCode('${c.id}')">⏱️ تمديد</button>` : ''}
                      <button class="btn btn-sm btn-danger" onclick="deleteCode('${c.id}')">🗑️</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    console.error(e);
    mainArea.querySelector('#codesTable').innerHTML = '<p style="color: var(--danger);">تعذر تحميل الأكواد</p>';
  }
}

function showCreateCodeModal() {
  modalBody.innerHTML = `
    <div class="modal-header">
      <h3>إنشاء كود جديد</h3>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>الكود (اتركه فارغًا للتوليد التلقائي)</label>
        <input type="text" id="newCodeValue" placeholder="VIP-XXXXXX" style="text-transform: uppercase;">
      </div>
      <div class="form-group">
        <label>مدة الاشتراك (بالأيام)</label>
        <input type="number" id="newCodeDuration" value="30" min="1" max="365">
      </div>
      <div class="form-group">
        <label>تاريخ البداية</label>
        <input type="date" id="newCodeStart">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="createNewCode()">إنشاء</button>
    </div>
  `;
  document.getElementById('newCodeStart').valueAsDate = new Date();
  openModal();
}

async function createNewCode() {
  const codeValue = document.getElementById('newCodeValue').value.trim().toUpperCase();
  const duration = parseInt(document.getElementById('newCodeDuration').value) || 30;
  const startsAt = document.getElementById('newCodeStart').value || new Date().toISOString().split('T')[0];

  try {
    await VIPDB.createCode({
      code: codeValue || undefined,
      duration: duration,
      startsAt: new Date(startsAt).toISOString()
    });
    closeModal();
    showToast('تم إنشاء الكود بنجاح', 'success');
    renderAdminCodes();
  } catch (e) {
    console.error(e);
    showToast('حدث خطأ أثناء إنشاء الكود', 'error');
  }
}

async function suspendCode(id) {
  try {
    await VIPDB.updateDoc(VIPDB.COLLECTIONS.codes, id, { status: 'suspended' });
    showToast('تم إيقاف الكود', 'success');
    renderAdminCodes();
  } catch (e) { showToast('خطأ', 'error'); }
}

async function activateCode(id) {
  try {
    await VIPDB.updateDoc(VIPDB.COLLECTIONS.codes, id, { status: 'unused' });
    showToast('تم تفعيل الكود', 'success');
    renderAdminCodes();
  } catch (e) { showToast('خطأ', 'error'); }
}

async function extendCode(id) {
  const code = await VIPDB.getDoc(VIPDB.COLLECTIONS.codes, id);
  if (!code) return;
  const newDate = new Date(code.expiresAt);
  newDate.setDate(newDate.getDate() + 30);
  try {
    await VIPDB.updateDoc(VIPDB.COLLECTIONS.codes, id, { 
      expiresAt: newDate.toISOString(),
      duration: (code.duration || 30) + 30
    });
    showToast('تم تمديد الكود 30 يومًا', 'success');
    renderAdminCodes();
  } catch (e) { showToast('خطأ', 'error'); }
}

async function deleteCode(id) {
  if (!confirm('هل أنت متأكد من حذف هذا الكود؟')) return;
  try {
    await VIPDB.deleteDoc(VIPDB.COLLECTIONS.codes, id);
    showToast('تم الحذف', 'success');
    renderAdminCodes();
  } catch (e) { showToast('خطأ', 'error'); }
}

// Admin Students
async function renderAdminStudents() {
  mainArea.innerHTML = `
    <div class="page-header">
      <h1>👥 إدارة الطلاب</h1>
      <p>قائمة الطلاب المسجلين في المنصة</p>
    </div>

    <div class="filter-bar">
      <select id="filterGov" onchange="loadStudents()">
        <option value="">كل المحافظات</option>
      </select>
      <select id="filterGrade" onchange="loadStudents()">
        <option value="">كل الصفوف</option>
        <option value="الثالث الثانوي">الثالث الثانوي</option>
        <option value="الثاني الثانوي">الثاني الثانوي</option>
        <option value="الأول الثانوي">الأول الثانوي</option>
      </select>
      <select id="filterSection" onchange="loadStudents()">
        <option value="">كل الشعب</option>
        <option value="علمي علوم">علمي علوم</option>
        <option value="علمي رياضة">علمي رياضة</option>
        <option value="أدبي">أدبي</option>
      </select>
      <select id="filterStatus" onchange="loadStudents()">
        <option value="">كل الحالات</option>
        <option value="active">نشط</option>
        <option value="inactive">غير نشط</option>
      </select>
    </div>

    <div id="studentsTable">جاري التحميل...</div>
  `;

  // Populate governorates
  const govSelect = document.getElementById('filterGov');
  const governorates = ['القاهرة','الجيزة','الإسكندرية','الدقهلية','الشرقية','الغربية','القليوبية','المنوفية','كفر الشيخ','البحيرة','دمياط','بورسعيد','الإسماعيلية','السويس','شمال سيناء','جنوب سيناء','بني سويف','الفيوم','المنيا','أسيوط','سوهاج','قنا','الأقصر','أسوان','البحر الأحمر','الوادي الجديد','مطروح'];
  governorates.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g; opt.textContent = g;
    govSelect.appendChild(opt);
  });

  await loadStudents();
}

async function loadStudents() {
  const filters = {
    governorate: document.getElementById('filterGov').value,
    grade: document.getElementById('filterGrade').value,
    section: document.getElementById('filterSection').value,
    status: document.getElementById('filterStatus').value
  };

  // Remove empty filters
  Object.keys(filters).forEach(k => { if (!filters[k]) delete filters[k]; });

  try {
    const students = await VIPDB.getAllStudents(filters);
    const container = document.getElementById('studentsTable');

    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الهاتف</th>
              <th>المحافظة</th>
              <th>المدرسة</th>
              <th>الصف</th>
              <th>الشعبة</th>
              <th>تاريخ التسجيل</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${students.length === 0 ? '<tr><td colspan="8" style="text-align: center; color: var(--text-3);">لا يوجد طلاب</td></tr>' : 
              students.map(s => `
                <tr>
                  <td style="font-weight: 700;">${s.fullName}</td>
                  <td>${s.phone}</td>
                  <td>${s.governorate || '-'}</td>
                  <td>${s.school || '-'}</td>
                  <td>${s.grade || '-'}</td>
                  <td>${s.section || '-'}</td>
                  <td>${formatDate(s.createdAt)}</td>
                  <td><span class="status-badge ${s.status === 'active' ? 'status-active' : 'status-inactive'}">${s.status === 'active' ? 'نشط' : 'غير نشط'}</span></td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
      <div style="margin-top: 16px; color: var(--text-3); font-size: 14px;">
        إجمالي النتائج: ${students.length} طالب
      </div>
    `;
  } catch (e) {
    console.error(e);
    document.getElementById('studentsTable').innerHTML = '<p style="color: var(--danger);">تعذر تحميل الطلاب</p>';
  }
}

// Admin Teachers
async function renderAdminTeachers() {
  mainArea.innerHTML = `
    <div class="page-header">
      <h1>👨‍🏫 المدرسون</h1>
      <p>إدارة فريق المدرسين</p>
    </div>
    <div id="teachersAdmin">جاري التحميل...</div>
  `;

  try {
    const teachers = await VIPDB.getTeachers();
    mainArea.querySelector('#teachersAdmin').innerHTML = `
      <div class="grid grid-3">
        ${teachers.map(t => `
          <div class="card teacher-card">
            <div class="avatar">${t.name.charAt(0)}</div>
            <h4>${t.name}</h4>
            <div class="subject">${t.subject}</div>
            <p class="bio">${t.bio || ''}</p>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    mainArea.querySelector('#teachersAdmin').innerHTML = '<p style="color: var(--danger);">خطأ في التحميل</p>';
  }
}

// Admin Library
async function renderAdminLibrary() {
  mainArea.innerHTML = `
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
      <div>
        <h1>📚 إدارة المكتبة</h1>
        <p>إدارة الكتب والBoxات التعليمية</p>
      </div>
      <div style="display: flex; gap: 12px;">
        <button class="btn btn-primary" onclick="showAddBookModal()">+ إضافة كتاب</button>
        <button class="btn btn-outline" onclick="showAddBoxModal()">+ إضافة Box</button>
      </div>
    </div>

    <h3 style="margin-bottom: 20px; font-family: var(--font-head);">📖 الكتب</h3>
    <div id="booksGrid">جاري التحميل...</div>

    <h3 style="margin: 40px 0 20px; font-family: var(--font-head);">📦 الBoxات</h3>
    <div id="boxesGrid">جاري التحميل...</div>
  `;

  await loadAdminLibrary();
}

async function loadAdminLibrary() {
  try {
    const [books, boxes, teachers] = await Promise.all([
      VIPDB.getBooks(),
      VIPDB.getBoxes(),
      VIPDB.getTeachers()
    ]);

    const teacherMap = {};
    teachers.forEach(t => teacherMap[t.id] = t.name);

    const booksGrid = document.getElementById('booksGrid');
    booksGrid.innerHTML = books.length === 0 ? 
      '<p style="color: var(--text-3);">لا توجد كتب مضافة بعد</p>' :
      `<div class="grid grid-4">${books.map(b => `
        <div class="card library-card">
          <div class="lib-img" style="${b.imageUrl ? 'background-image: url(' + JSON.stringify(b.imageUrl) + ');' : 'background: linear-gradient(135deg, var(--green-700), var(--green-500));'} background-size: cover; background-position: center;"></div>
          <div class="lib-body">
            <h4>${b.name}</h4>
            <p>${b.description || ''}</p>
            <div class="lib-meta">
              <span class="lib-tag teacher-tag">${teacherMap[b.teacherId] || b.teacherId || 'VIP'}</span>
              <span class="lib-tag">${b.subject || ''}</span>
              <span class="lib-tag">${b.grade || ''}</span>
              <span class="status-badge ${b.status === 'active' ? 'status-active' : 'status-inactive'}">${b.status === 'active' ? 'متاح' : 'غير متاح'}</span>
            </div>
            <div style="margin-top: 12px; display: flex; gap: 8px;">
              <button class="btn btn-sm btn-ghost" onclick="editBook('${b.id}')">✏️ تعديل</button>
              <button class="btn btn-sm btn-danger" onclick="deleteBookItem('${b.id}')">🗑️ حذف</button>
            </div>
          </div>
        </div>
      `).join('')}</div>`;

    const boxesGrid = document.getElementById('boxesGrid');
    boxesGrid.innerHTML = boxes.length === 0 ?
      '<p style="color: var(--text-3);">لا توجد Boxات مضافة بعد</p>' :
      `<div class="grid grid-4">${boxes.map(b => `
        <div class="card library-card">
          <div class="lib-img" style="${b.imageUrl ? 'background-image: url(' + JSON.stringify(b.imageUrl) + ');' : 'background: linear-gradient(135deg, var(--info), var(--green-600));'} background-size: cover; background-position: center;"></div>
          <div class="lib-body">
            <h4>${b.name}</h4>
            <p>${b.description || ''}</p>
            <div class="lib-meta">
              <span class="lib-tag teacher-tag">${teacherMap[b.teacherId] || b.teacherId || 'VIP'}</span>
              <span class="lib-tag">${b.subject || ''}</span>
              <span class="lib-tag">${b.booksCount || 0} كتاب</span>
              <span class="status-badge ${b.status === 'active' ? 'status-active' : 'status-inactive'}">${b.status === 'active' ? 'متاح' : 'غير متاح'}</span>
            </div>
            <div style="margin-top: 12px; display: flex; gap: 8px;">
              <button class="btn btn-sm btn-ghost" onclick="editBox('${b.id}')">✏️ تعديل</button>
              <button class="btn btn-sm btn-danger" onclick="deleteBoxItem('${b.id}')">🗑️ حذف</button>
            </div>
          </div>
        </div>
      `).join('')}</div>`;

  } catch (e) {
    console.error(e);
  }
}

function showAddBookModal() {
  modalBody.innerHTML = `
    <div class="modal-header"><h3>إضافة كتاب جديد</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-group"><label>اسم الكتاب *</label><input type="text" id="bookName" required></div>
      <div class="form-group"><label>المدرس *</label><input type="text" id="bookTeacher" placeholder="اسم المدرس أو ID"></div>
      <div class="form-group"><label>المادة *</label><input type="text" id="bookSubject" required></div>
      <div class="form-group"><label>الصف *</label><input type="text" id="bookGrade" required></div>
      <div class="form-group"><label>الوصف</label><textarea id="bookDesc" rows="3"></textarea></div>
      <div class="form-group"><label>رابط صورة الكتاب</label>
        <input type="url" id="bookImageUrl" placeholder="https://example.com/book.jpg (اختياري)">
        <div class="hint">ممكن ترفع الصورة على Imgur أو Google Drive وتاخد الرابط</div>
      </div>
      <div class="form-group"><label>أو ارفع صورة من جهازك</label>
        <input type="file" id="bookImageFile" accept="image/*" onchange="previewBookImage(this)">
        <div id="bookImagePreview" style="margin-top:10px; max-width:200px; display:none;">
          <img id="bookPreviewImg" style="width:100%; border-radius:8px; border:1px solid var(--surface-3);">
        </div>
      </div>
      <div class="form-group"><label>الحالة</label>
        <select id="bookStatus"><option value="active">متاح</option><option value="inactive">غير متاح</option></select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="saveNewBook()">حفظ</button>
    </div>
  `;
  openModal();
}

function previewBookImage(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('bookPreviewImg').src = e.target.result;
    document.getElementById('bookImagePreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

async function saveNewBook() {
  const btn = document.querySelector('.modal-footer .btn-primary');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div> جاري الحفظ...';

  try {
    let imageUrl = document.getElementById('bookImageUrl').value.trim();
    const fileInput = document.getElementById('bookImageFile');

    // If user uploaded a file, convert to base64
    if (fileInput && fileInput.files && fileInput.files[0]) {
      imageUrl = await VIPDB.uploadImage(fileInput.files[0], 400);
    }

    const data = {
      name: document.getElementById('bookName').value.trim(),
      teacherId: document.getElementById('bookTeacher').value.trim(),
      subject: document.getElementById('bookSubject').value.trim(),
      grade: document.getElementById('bookGrade').value.trim(),
      description: document.getElementById('bookDesc').value.trim(),
      imageUrl: imageUrl || null,
      status: document.getElementById('bookStatus').value
    };

    if (!data.name || !data.subject || !data.grade) {
      showToast('يرجى ملء الحقول المطلوبة', 'error'); 
      btn.disabled = false; btn.innerHTML = 'حفظ';
      return;
    }

    await VIPDB.createBook(data);
    closeModal(); showToast('تم إضافة الكتاب', 'success');
    loadAdminLibrary();
  } catch (e) { 
    console.error(e);
    showToast('خطأ أثناء الحفظ', 'error'); 
    btn.disabled = false; btn.innerHTML = 'حفظ';
  }
}

function showAddBoxModal() {
  modalBody.innerHTML = `
    <div class="modal-header"><h3>إضافة Box جديد</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-group"><label>اسم الBox *</label><input type="text" id="boxName" required></div>
      <div class="form-group"><label>المدرس *</label><input type="text" id="boxTeacher" placeholder="اسم المدرس أو ID"></div>
      <div class="form-group"><label>المادة *</label><input type="text" id="boxSubject" required></div>
      <div class="form-group"><label>الوصف</label><textarea id="boxDesc" rows="3"></textarea></div>
      <div class="form-group"><label>رابط صورة الBox</label>
        <input type="url" id="boxImageUrl" placeholder="https://example.com/box.jpg (اختياري)">
        <div class="hint">ممكن ترفع الصورة على Imgur أو Google Drive وتاخد الرابط</div>
      </div>
      <div class="form-group"><label>أو ارفع صورة من جهازك</label>
        <input type="file" id="boxImageFile" accept="image/*" onchange="previewBoxImage(this)">
        <div id="boxImagePreview" style="margin-top:10px; max-width:200px; display:none;">
          <img id="boxPreviewImg" style="width:100%; border-radius:8px; border:1px solid var(--surface-3);">
        </div>
      </div>
      <div class="form-group"><label>الحالة</label>
        <select id="boxStatus"><option value="active">متاح</option><option value="inactive">غير متاح</option></select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="saveNewBox()">حفظ</button>
    </div>
  `;
  openModal();
}

function previewBoxImage(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('boxPreviewImg').src = e.target.result;
    document.getElementById('boxImagePreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

async function saveNewBox() {
  const btn = document.querySelector('.modal-footer .btn-primary');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div> جاري الحفظ...';

  try {
    let imageUrl = document.getElementById('boxImageUrl').value.trim();
    const fileInput = document.getElementById('boxImageFile');

    if (fileInput && fileInput.files && fileInput.files[0]) {
      imageUrl = await VIPDB.uploadImage(fileInput.files[0], 400);
    }

    const data = {
      name: document.getElementById('boxName').value.trim(),
      teacherId: document.getElementById('boxTeacher').value.trim(),
      subject: document.getElementById('boxSubject').value.trim(),
      description: document.getElementById('boxDesc').value.trim(),
      imageUrl: imageUrl || null,
      status: document.getElementById('boxStatus').value,
      booksCount: 0,
      bookIds: []
    };

    if (!data.name || !data.subject) { 
      showToast('يرجى ملء الحقول المطلوبة', 'error'); 
      btn.disabled = false; btn.innerHTML = 'حفظ';
      return; 
    }

    await VIPDB.createBox(data);
    closeModal(); showToast('تم إضافة الBox', 'success');
    loadAdminLibrary();
  } catch (e) { 
    console.error(e);
    showToast('خطأ أثناء الحفظ', 'error'); 
    btn.disabled = false; btn.innerHTML = 'حفظ';
  }
}

async function deleteBookItem(id) {
  if (!confirm('حذف الكتاب؟')) return;
  try { await VIPDB.deleteBook(id); showToast('تم الحذف', 'success'); loadAdminLibrary(); }
  catch (e) { showToast('خطأ', 'error'); }
}

async function deleteBoxItem(id) {
  if (!confirm('حذف الBox؟')) return;
  try { await VIPDB.deleteBox(id); showToast('تم الحذف', 'success'); loadAdminLibrary(); }
  catch (e) { showToast('خطأ', 'error'); }
}

// Admin Exams & Notifications (preserved)
async function renderAdminExams() {
  mainArea.innerHTML = `
    <div class="page-header"><h1>📝 الامتحانات</h1><p>إدارة الامتحانات</p></div>
    <div class="card"><p>قسم الامتحانات - يمكنك إضافة/تعديل الامتحانات هنا</p></div>
  `;
}

async function renderAdminNotifications() {
  mainArea.innerHTML = `
    <div class="page-header"><h1>🔔 الإشعارات</h1><p>إدارة الإشعارات</p></div>
    <div class="card"><p>قسم الإشعارات - يمكنك إرسال إشعارات للطلاب</p></div>
  `;
}

/* ============================================
   STUDENT PAGES
   ============================================ */

function renderStudentPage(path) {
  switch (path) {
    case '/student/dashboard': renderStudentDashboard(); break;
    case '/student/exams': renderStudentExams(); break;
    case '/student/lessons': renderStudentLessons(); break;
    case '/student/library': renderStudentLibrary(); break;
    case '/student/rankings': renderStudentRankings(); break;
    case '/student/profile': renderStudentProfile(); break;
    default: renderStudentDashboard();
  }
}

async function renderStudentDashboard() {
  const user = VIPDB.getCurrentUser();
  mainArea.innerHTML = `
    <div class="page-header">
      <h1>🏠 مرحبًا، ${user?.fullName || 'طالبنا العزيز'}</h1>
      <p>لوحة التحكم الخاصة بك</p>
    </div>
    <div class="grid grid-3">
      <div class="card feature-card" onclick="navigate('#/student/exams')" style="cursor: pointer;">
        <div class="ico">📝</div><h3>الامتحانات</h3><p>أدِ الامتحانات وتابع نتائجك</p>
      </div>
      <div class="card feature-card" onclick="navigate('#/student/videos')" style="cursor: pointer;">
        <div class="ico">🎬</div><h3>المحاضرات</h3><p>شاهد محاضراتك المفضلة</p>
      </div>
      <div class="card feature-card" onclick="navigate('#/student/library')" style="cursor: pointer;">
        <div class="ico">📚</div><h3>المكتبة</h3><p>تصفح الكتب والBoxات التعليمية</p>
      </div>
    </div>
  `;
}

async function renderStudentExams() {
  mainArea.innerHTML = `
    <div class="page-header"><h1>📝 الامتحانات</h1><p>قائمة الامتحانات المتاحة</p></div>
    <div id="studentExams">جاري التحميل...</div>
  `;
  try {
    const exams = await VIPDB.getExams();
    document.getElementById('studentExams').innerHTML = exams.length === 0 ?
      '<p style="color: var(--text-3);">لا توجد امتحانات متاحة حاليًا</p>' :
      `<div class="grid grid-3">${exams.map(e => `
        <div class="card">
          <h3 style="font-family: var(--font-head); margin-bottom: 8px;">${e.title}</h3>
          <p style="color: var(--text-3); font-size: 14px;">المادة: ${e.subject || '-'} | المدة: ${e.duration || '-'} دقيقة</p>
          <button class="btn btn-primary mt-2">بدء الامتحان</button>
        </div>
      `).join('')}</div>`;
  } catch (e) { document.getElementById('studentExams').innerHTML = '<p style="color: var(--danger);">خطأ في التحميل</p>'; }
}

async function renderStudentVideos() {
  mainArea.innerHTML = `
    <div class="page-header"><h1>🎬 المحاضرات</h1><p>شاهد محاضراتك</p></div>
    <div class="card"><p>قسم المحاضرات - قائمة الفيديوهات المتاحة</p></div>
  `;
}

async function renderStudentLibrary() {
  mainArea.innerHTML = `
    <div class="page-header"><h1>📚 المكتبة</h1><p>الكتب والBoxات التعليمية المتاحة</p></div>
    <div id="studentLibrary">جاري التحميل...</div>
  `;

  try {
    const [books, boxes] = await Promise.all([
      VIPDB.getBooks({ status: 'active' }),
      VIPDB.getBoxes({ status: 'active' })
    ]);

    document.getElementById('studentLibrary').innerHTML = `
      <h3 style="margin-bottom: 20px; font-family: var(--font-head);">📖 الكتب</h3>
      ${books.length === 0 ? '<p style="color: var(--text-3); margin-bottom: 32px;">لا توجد كتب متاحة</p>' :
        `<div class="grid grid-4" style="margin-bottom: 40px;">${books.map(b => `
          <div class="card library-card">
            <div class="lib-img" style="${b.imageUrl ? 'background-image: url(' + JSON.stringify(b.imageUrl) + ');' : 'background: linear-gradient(135deg, var(--green-700), var(--green-500));'} background-size: cover; background-position: center;"></div>
            <div class="lib-body">
              <h4>${b.name}</h4>
              <p>${b.description || ''}</p>
              <div class="lib-meta">
                <span class="lib-tag teacher-tag">${b.teacherName || b.teacherId || 'VIP'}</span>
                <span class="lib-tag">${b.subject || ''}</span>
                <span class="lib-tag">${b.grade || ''}</span>
              </div>
              <button class="btn btn-sm btn-outline mt-2" style="width: 100%;">عرض التفاصيل</button>
            </div>
          </div>
        `).join('')}</div>`
      }

      <h3 style="margin-bottom: 20px; font-family: var(--font-head);">📦 الBoxات</h3>
      ${boxes.length === 0 ? '<p style="color: var(--text-3);">لا توجد Boxات متاحة</p>' :
        `<div class="grid grid-4">${boxes.map(b => `
          <div class="card library-card">
            <div class="lib-img" style="${b.imageUrl ? 'background-image: url(' + JSON.stringify(b.imageUrl) + ');' : 'background: linear-gradient(135deg, var(--info), var(--green-600));'} background-size: cover; background-position: center;"></div>
            <div class="lib-body">
              <h4>${b.name}</h4>
              <p>${b.description || ''}</p>
              <div class="lib-meta">
                <span class="lib-tag teacher-tag">${b.teacherName || b.teacherId || 'VIP'}</span>
                <span class="lib-tag">${b.subject || ''}</span>
                <span class="lib-tag">${b.booksCount || 0} كتاب</span>
              </div>
              <button class="btn btn-sm btn-outline mt-2" style="width: 100%;">عرض التفاصيل</button>
            </div>
          </div>
        `).join('')}</div>`
      }
    `;
  } catch (e) {
    document.getElementById('studentLibrary').innerHTML = '<p style="color: var(--danger);">خطأ في التحميل</p>';
  }
}

async function renderStudentRankings() {
  mainArea.innerHTML = `
    <div class="page-header"><h1>🏆 الترتيب</h1><p>ترتيبك بين زملائك</p></div>
    <div class="card"><p>قسم الترتيب - سيتم عرض الترتيب هنا</p></div>
  `;
}

async function renderStudentProfile() {
  const user = VIPDB.getCurrentUser();
  mainArea.innerHTML = `
    <div class="page-header"><h1>👤 الملف الشخصي</h1><p>بياناتك الشخصية</p></div>
    <div class="card" style="max-width: 600px;">
      <div style="display: grid; gap: 16px;">
        <div><label style="color: var(--text-3); font-size: 13px;">الاسم</label><div style="font-weight: 700; font-size: 18px;">${user?.fullName || '-'}</div></div>
        <div><label style="color: var(--text-3); font-size: 13px;">الهاتف</label><div style="font-weight: 600;">${user?.phone || '-'}</div></div>
        <div><label style="color: var(--text-3); font-size: 13px;">المحافظة</label><div style="font-weight: 600;">${user?.governorate || '-'}</div></div>
        <div><label style="color: var(--text-3); font-size: 13px;">المدرسة</label><div style="font-weight: 600;">${user?.school || '-'}</div></div>
        <div><label style="color: var(--text-3); font-size: 13px;">الصف</label><div style="font-weight: 600;">${user?.grade || '-'}</div></div>
        <div><label style="color: var(--text-3); font-size: 13px;">الشعبة</label><div style="font-weight: 600;">${user?.section || '-'}</div></div>
      </div>
    </div>
  `;
}


/* ============================================
   ADMIN VIDEO MANAGEMENT
   ============================================ */

async function renderAdminVideos() {
  mainArea.innerHTML = `
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
      <div>
        <h1>🎬 إدارة الفيديوهات</h1>
        <p>ربط الفيديوهات بالدروس داخل المنصة</p>
      </div>
      <div style="display: flex; gap: 12px;">
        <button class="btn btn-primary" onclick="showUploadVideoModal()">⬆️ رفع فيديو جديد</button>
        <button class="btn btn-outline" onclick="showLinkVideoModal()">🔗 ربط فيديو بدرس</button>
      </div>
    </div>

    <div class="filter-bar">
      <input type="text" id="videoSearch" placeholder="🔍 ابحث باسم الفيديو أو ID..." onkeyup="loadAdminVideosList()">
      <select id="videoFilterSubject" onchange="loadAdminVideosList()">
        <option value="">كل المواد</option>
      </select>
      <select id="videoFilterGrade" onchange="loadAdminVideosList()">
        <option value="">كل الصفوف</option>
        <option value="الثالث الثانوي">الثالث الثانوي</option>
        <option value="الثاني الثانوي">الثاني الثانوي</option>
        <option value="الأول الثانوي">الأول الثانوي</option>
      </select>
    </div>

    <h3 style="margin-bottom: 20px; font-family: var(--font-head);">📹 الفيديوهات المرفوعة</h3>
    <div id="adminVideosList">جاري التحميل...</div>

    <h3 style="margin: 40px 0 20px; font-family: var(--font-head);">🔗 الروابط الحالية (فيديو ← درس)</h3>
    <div id="adminLessonLinks">جاري التحميل...</div>
  `;

  await loadAdminVideosList();
  await loadAdminLessonLinks();
}

async function loadAdminVideosList() {
  const container = document.getElementById('adminVideosList');
  const search = document.getElementById('videoSearch')?.value || '';
  const subject = document.getElementById('videoFilterSubject')?.value || '';
  const grade = document.getElementById('videoFilterGrade')?.value || '';

  try {
    const data = await VIPDB.fetchVideosFromServer({ search, subject, grade });
    const videos = data.videos || [];

    container.innerHTML = videos.length === 0 ?
      '<p style="color: var(--text-3);">لا توجد فيديوهات. ارفع فيديو جديد أولًا.</p>' :
      `<div class="grid grid-4">${videos.map(v => `
        <div class="card library-card">
          <div class="lib-img" style="background: linear-gradient(135deg, #1e3a5f, #0E7C4A); display: flex; align-items: center; justify-content: center; font-size: 48px;">🎬</div>
          <div class="lib-body">
            <h4>${v.title}</h4>
            <p style="font-size: 12px; color: var(--text-3); font-family: monospace;">ID: ${v.id}</p>
            <div class="lib-meta">
              <span class="lib-tag">${v.subject || 'غير محدد'}</span>
              <span class="lib-tag">${v.grade || 'غير محدد'}</span>
              <span class="status-badge ${v.status === 'ready' ? 'status-active' : v.status === 'processing' ? 'status-pending' : 'status-expired'}">${v.status === 'ready' ? 'جاهز' : v.status === 'processing' ? 'قيد المعالجة' : 'فشل'}</span>
            </div>
            <div style="margin-top: 12px; display: flex; gap: 8px;">
              <button class="btn btn-sm btn-primary" onclick="previewVideo('${v.id}')">▶️ معاينة</button>
              <button class="btn btn-sm btn-ghost" onclick="showLinkExistingVideo('${v.id}', '${v.title}')">🔗 ربط</button>
            </div>
          </div>
        </div>
      `).join('')}</div>`;
  } catch (e) {
    console.error(e);
    container.innerHTML = `
      <div class="card" style="border-color: var(--warning);">
        <p style="color: var(--warning);">⚠️ لا يمكن الاتصال بسيرفر الفيديوهات</p>
        <p style="color: var(--text-3); font-size: 13px; margin-top: 8px;">
          تأكد من تشغيل سيرفر الفيديوهات:<br>
          <code style="background: var(--surface-2); padding: 4px 8px; border-radius: 6px;">cd video-server && npm start</code>
        </p>
      </div>
    `;
  }
}

async function loadAdminLessonLinks() {
  const container = document.getElementById('adminLessonLinks');
  try {
    const links = await VIPDB.getLessonVideos();
    const teachers = await VIPDB.getTeachers();
    const teacherMap = {};
    teachers.forEach(t => teacherMap[t.id] = t.name);

    container.innerHTML = links.length === 0 ?
      '<p style="color: var(--text-3);">لا توجد روابط. اربط فيديو بدرس أولًا.</p>' :
      `<div class="table-wrap"><table>
        <thead>
          <tr>
            <th>الفيديو</th>
            <th>الدرس</th>
            <th>المدرس</th>
            <th>المادة</th>
            <th>الصف</th>
            <th>الحالة</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${links.map(l => `
            <tr>
              <td style="font-family: monospace; font-size: 12px;">${l.videoId}</td>
              <td style="font-weight: 700;">${l.lessonTitle || l.lessonId}</td>
              <td>${teacherMap[l.teacherId] || l.teacherId || '-'}</td>
              <td>${l.subject || '-'}</td>
              <td>${l.grade || '-'}</td>
              <td><span class="status-badge ${l.status === 'active' ? 'status-active' : 'status-inactive'}">${l.status === 'active' ? 'مفعل' : 'غير مفعل'}</span></td>
              <td>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-sm btn-ghost" onclick="previewLinkedVideo('${l.videoId}')">▶️</button>
                  <button class="btn btn-sm btn-danger" onclick="unlinkVideo('${l.id}')">🗑️ فك الربط</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table></div>`;
  } catch (e) {
    container.innerHTML = '<p style="color: var(--danger);">خطأ في تحميل الروابط</p>';
  }
}

/* ============================================
   UPLOAD VIDEO MODAL
   ============================================ */

function showUploadVideoModal() {
  modalBody.innerHTML = `
    <div class="modal-header"><h3>⬆️ رفع فيديو جديد</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-group">
        <label>ملف الفيديو *</label>
        <input type="file" id="uploadVideoFile" accept="video/*" onchange="checkVideoFile(this)">
        <div class="hint">MP4, WebM, MOV — الحد الأقصى 500MB</div>
        <div id="videoFileInfo" style="margin-top: 8px; color: var(--green-400); font-size: 13px; display: none;"></div>
      </div>
      <div class="form-group"><label>عنوان الفيديو *</label><input type="text" id="uploadVideoTitle" required placeholder="مثال: شرح قانون أوم"></div>
      <div class="form-group"><label>المدرس *</label><input type="text" id="uploadVideoTeacher" required placeholder="اسم المدرس أو ID"></div>
      <div class="form-group"><label>المادة *</label><input type="text" id="uploadVideoSubject" required placeholder="مثال: فيزياء"></div>
      <div class="form-group"><label>الصف *</label>
        <select id="uploadVideoGrade" required>
          <option value="">اختر الصف</option>
          <option value="الثالث الثانوي">الثالث الثانوي</option>
          <option value="الثاني الثانوي">الثاني الثانوي</option>
          <option value="الأول الثانوي">الأول الثانوي</option>
        </select>
      </div>
      <div class="form-group"><label>وصف الفيديو</label><textarea id="uploadVideoDesc" rows="3" placeholder="وصف مختصر..."></textarea></div>
      <div id="uploadProgress" style="display: none;">
        <div style="background: var(--surface-2); height: 8px; border-radius: 4px; overflow: hidden; margin-top: 12px;">
          <div id="uploadProgressBar" style="background: linear-gradient(90deg, var(--green-700), var(--green-500)); height: 100%; width: 0%; border-radius: 4px; transition: width 0.3s;"></div>
        </div>
        <p id="uploadProgressText" style="text-align: center; font-size: 12px; color: var(--text-3); margin-top: 6px;">جاري الرفع...</p>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="uploadVideoBtn" onclick="uploadVideo()">رفع الفيديو</button>
    </div>
  `;
  openModal();
}

function checkVideoFile(input) {
  const file = input.files[0];
  if (!file) return;
  const info = document.getElementById('videoFileInfo');
  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  info.style.display = 'block';
  info.innerHTML = `✅ ${file.name} — ${sizeMB} MB — ${file.type}`;
}

async function uploadVideo() {
  const btn = document.getElementById('uploadVideoBtn');
  const fileInput = document.getElementById('uploadVideoFile');
  const progress = document.getElementById('uploadProgress');
  const bar = document.getElementById('uploadProgressBar');
  const text = document.getElementById('uploadProgressText');

  if (!fileInput.files || !fileInput.files[0]) {
    showToast('يرجى اختيار ملف الفيديو', 'error'); return;
  }

  const title = document.getElementById('uploadVideoTitle').value.trim();
  if (!title) { showToast('يرجى كتابة عنوان الفيديو', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div> جاري الرفع...';
  progress.style.display = 'block';

  try {
    const formData = new FormData();
    formData.append('video', fileInput.files[0]);
    formData.append('title', title);
    formData.append('description', document.getElementById('uploadVideoDesc').value.trim());
    formData.append('teacherId', document.getElementById('uploadVideoTeacher').value.trim());
    formData.append('subject', document.getElementById('uploadVideoSubject').value.trim());
    formData.append('grade', document.getElementById('uploadVideoGrade').value);

    // Simulate progress
    let p = 0;
    const interval = setInterval(() => {
      p = Math.min(p + 10, 90);
      bar.style.width = p + '%';
    }, 300);

    const result = await VIPDB.uploadVideoToServer(formData);
    clearInterval(interval);
    bar.style.width = '100%';
    text.textContent = '✅ تم الرفع!';

    setTimeout(() => {
      closeModal();
      showToast('تم رفع الفيديو بنجاح! ID: ' + result.video.id, 'success');
      renderAdminVideos();
    }, 800);

  } catch (e) {
    console.error(e);
    showToast('فشل الرفع. تأكد من تشغيل سيرفر الفيديوهات.', 'error');
    btn.disabled = false;
    btn.innerHTML = 'رفع الفيديو';
  }
}

/* ============================================
   LINK VIDEO TO LESSON
   ============================================ */

function showLinkVideoModal() {
  modalBody.innerHTML = `
    <div class="modal-header"><h3>🔗 ربط فيديو بدرس</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 10px; padding: 12px; margin-bottom: 16px;">
        <p style="color: var(--green-400); font-size: 13px; margin: 0;">💡 تقدم تستخدم رابط خارجي (YouTube, Google Drive) بدون Video Server!</p>
      </div>
      <div class="form-group">
        <label>Video ID أو رابط خارجي *</label>
        <input type="text" id="linkVideoId" required placeholder="video_123456 أو رابط YouTube" style="font-family: monospace;">
        <div class="hint">
          اكتب ID من Video Server أو الصق رابط YouTube/Google Drive مباشرة<br>
          مثال: https://youtube.com/watch?v=ABC123
        </div>
      </div>
      <div class="form-group"><label>عنوان الدرس *</label><input type="text" id="linkLessonTitle" required placeholder="مثال: قانون أوم"></div>
      <div class="form-group"><label>ID الدرس *</label><input type="text" id="linkLessonId" required placeholder="lesson_001" style="font-family: monospace;"></div>
      <div class="form-group"><label>المدرس *</label><input type="text" id="linkTeacherId" required placeholder="ID المدرس"></div>
      <div class="form-group"><label>المادة *</label><input type="text" id="linkSubject" required placeholder="فيزياء"></div>
      <div class="form-group"><label>الصف *</label>
        <select id="linkGrade" required>
          <option value="">اختر الصف</option>
          <option value="الثالث الثانوي">الثالث الثانوي</option>
          <option value="الثاني الثانوي">الثاني الثانوي</option>
          <option value="الأول الثانوي">الأول الثانوي</option>
        </select>
      </div>
      <div class="form-group"><label>الوحدة / الدرس</label><input type="text" id="linkUnit" placeholder="مثال: الكهرباء - الدرس الأول"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="linkVideoToLessonSubmit()">ربط الفيديو</button>
    </div>
  `;
  openModal();
}

function showLinkExistingVideo(videoId, videoTitle) {
  modalBody.innerHTML = `
    <div class="modal-header"><h3>🔗 ربط: ${videoTitle}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-group">
        <label>Video ID</label>
        <input type="text" id="linkVideoId" value="${videoId}" readonly style="font-family: monospace; background: var(--surface-2);">
      </div>
      <div class="form-group"><label>عنوان الدرس *</label><input type="text" id="linkLessonTitle" required placeholder="مثال: قانون أوم"></div>
      <div class="form-group"><label>ID الدرس *</label><input type="text" id="linkLessonId" required placeholder="lesson_001" style="font-family: monospace;"></div>
      <div class="form-group"><label>المدرس *</label><input type="text" id="linkTeacherId" required placeholder="ID المدرس"></div>
      <div class="form-group"><label>المادة *</label><input type="text" id="linkSubject" required placeholder="فيزياء"></div>
      <div class="form-group"><label>الصف *</label>
        <select id="linkGrade" required>
          <option value="">اختر الصف</option>
          <option value="الثالث الثانوي">الثالث الثانوي</option>
          <option value="الثاني الثانوي">الثاني الثانوي</option>
          <option value="الأول الثانوي">الأول الثانوي</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="linkVideoToLessonSubmit()">ربط الفيديو</button>
    </div>
  `;
  openModal();
}

async function linkVideoToLessonSubmit() {
  const data = {
    videoId: document.getElementById('linkVideoId').value.trim(),
    lessonId: document.getElementById('linkLessonId').value.trim(),
    lessonTitle: document.getElementById('linkLessonTitle').value.trim(),
    teacherId: document.getElementById('linkTeacherId').value.trim(),
    subject: document.getElementById('linkSubject').value.trim(),
    grade: document.getElementById('linkGrade').value,
    unit: document.getElementById('linkUnit')?.value?.trim() || ''
  };

  if (!data.videoId || !data.lessonId || !data.lessonTitle || !data.teacherId || !data.subject || !data.grade) {
    showToast('يرجى ملء جميع الحقول المطلوبة', 'error'); return;
  }

  try {
    await VIPDB.linkVideoToLesson(data);
    closeModal();
    showToast('تم ربط الفيديو بالدرس بنجاح!', 'success');
    renderAdminVideos();
  } catch (e) {
    console.error(e);
    showToast('خطأ أثناء الربط', 'error');
  }
}

async function unlinkVideo(linkId) {
  if (!confirm('فك الربط بين الفيديو والدرس؟')) return;
  try {
    await VIPDB.deleteLessonVideo(linkId);
    showToast('تم فك الربط', 'success');
    renderAdminVideos();
  } catch (e) { showToast('خطأ', 'error'); }
}

function previewVideo(videoId) {
  const streamUrl = VIPDB.getVideoStreamUrl(videoId);
  modalBody.innerHTML = `
    <div class="modal-header"><h3>▶️ معاينة الفيديو</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body" style="padding: 0;">
      <video controls autoplay style="width: 100%; border-radius: 0; display: block;" poster="">
        <source src="${streamUrl}" type="video/mp4">
        متصفحك لا يدعم تشغيل الفيديو
      </video>
    </div>
  `;
  openModal();
}

function previewLinkedVideo(videoId) {
  previewVideo(videoId);
}

/* ============================================
   STUDENT LESSONS & VIDEO PLAYER
   ============================================ */

async function renderStudentLessons() {
  mainArea.innerHTML = `
    <div class="page-header">
      <h1>📖 الدروس</h1>
      <p>شاهد دروسك المرتبة حسب المادة والوحدة</p>
    </div>
    <div id="studentLessonsList">جاري التحميل...</div>
  `;

  try {
    const links = await VIPDB.getLessonVideos({ status: 'active' });
    const teachers = await VIPDB.getTeachers();
    const teacherMap = {};
    teachers.forEach(t => teacherMap[t.id] = t.name);

    // Group by subject
    const bySubject = {};
    links.forEach(l => {
      const sub = l.subject || 'غير مصنف';
      if (!bySubject[sub]) bySubject[sub] = [];
      bySubject[sub].push(l);
    });

    const container = document.getElementById('studentLessonsList');

    if (links.length === 0) {
      container.innerHTML = '<p style="color: var(--text-3);">لا توجد دروس متاحة حاليًا.</p>';
      return;
    }

    container.innerHTML = Object.entries(bySubject).map(([subject, lessons]) => `
      <div style="margin-bottom: 32px;">
        <h3 style="font-family: var(--font-head); font-size: 20px; margin-bottom: 16px; color: var(--green-400);">📚 ${subject}</h3>
        <div class="grid grid-3">
          ${lessons.map(l => `
            <div class="card" style="cursor: pointer; transition: transform 0.2s;" onclick="openLessonVideo('${l.lessonId}', '${l.videoId}')" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
              <div style="background: linear-gradient(135deg, #1e3a5f, #0E7C4A); height: 140px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 48px; margin-bottom: 16px;">🎬</div>
              <h4 style="font-family: var(--font-head); font-size: 16px; margin-bottom: 6px;">${l.lessonTitle}</h4>
              <p style="color: var(--text-3); font-size: 13px; margin-bottom: 8px;">${l.unit || ''}</p>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <span class="lib-tag teacher-tag">${teacherMap[l.teacherId] || l.teacherId || 'VIP'}</span>
                <span class="lib-tag">${l.grade || ''}</span>
              </div>
              <div style="margin-top: 12px; display: flex; align-items: center; gap: 6px; color: var(--green-400); font-weight: 700; font-size: 14px;">
                <span>▶️</span> شاهد الدرس
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

  } catch (e) {
    console.error(e);
    document.getElementById('studentLessonsList').innerHTML = '<p style="color: var(--danger);">خطأ في تحميل الدروس</p>';
  }
}

async function openLessonVideo(lessonId, videoId) {
  // Show loading
  mainArea.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 20px;">
      <div class="spinner" style="width: 48px; height: 48px; border-width: 4px;"></div>
      <p style="color: var(--text-3); font-size: 16px;">جاري تحميل الدرس...</p>
    </div>
  `;

  try {
    // Get lesson data from Firestore
    const link = await VIPDB.getLessonVideoByLesson(lessonId);
    if (!link) {
      mainArea.innerHTML = '<div class="page-header"><h1>خطأ</h1><p>الدرس غير موجود</p></div>';
      return;
    }

    // Check if videoId is an external URL
    const isExternalUrl = videoId && (videoId.startsWith('http://') || videoId.startsWith('https://'));
    const embedUrl = isExternalUrl ? VIPDB.getEmbedUrl(videoId) : VIPDB.getVideoStreamUrl(videoId);
    const isDirect = isExternalUrl ? VIPDB.isDirectVideo(videoId) : true;

    // Get video data from server (only for internal videos)
    let videoData = null;
    if (!isExternalUrl) {
      try { videoData = await VIPDB.fetchVideoById(videoId); }
      catch (e) { console.warn('Video server error:', e); }
    }
    const teachers = await VIPDB.getTeachers();
    const teacherMap = {};
    teachers.forEach(t => teacherMap[t.id] = t.name);

    mainArea.innerHTML = `
      <div class="page-header">
        <button class="btn btn-ghost btn-sm" onclick="navigate('#/student/lessons')">← العودة للدروس</button>
        <h1 style="margin-top: 12px;">📖 ${link.lessonTitle}</h1>
        <p>${link.subject} — ${link.grade} — ${teacherMap[link.teacherId] || link.teacherId || 'VIP'}</p>
      </div>

      <div style="background: var(--surface-1); border: 1px solid var(--surface-3); border-radius: var(--radius); overflow: hidden; margin-bottom: 24px;">
        <div style="position: relative; padding-bottom: 56.25%; background: #000;">
          ${isExternalUrl && !isDirect ? `
            <iframe 
              src="${embedUrl}" 
              style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
              allowfullscreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            ></iframe>
          ` : `
            <video 
              id="lessonVideoPlayer"
              controls 
              autoplay
              playsinline
              style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain;"
              poster=""
              onerror="handleVideoError(this)"
            >
              <source src="${embedUrl}" type="video/mp4">
              متصفحك لا يدعم تشغيل الفيديو
            </video>
          `}
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <h3 style="font-family: var(--font-head); margin-bottom: 12px;">📋 تفاصيل الدرس</h3>
          <div style="display: grid; gap: 10px; color: var(--text-2); font-size: 14px;">
            <div><span style="color: var(--text-3);">المادة:</span> ${link.subject}</div>
            <div><span style="color: var(--text-3);">الصف:</span> ${link.grade}</div>
            <div><span style="color: var(--text-3);">الوحدة:</span> ${link.unit || 'غير محدد'}</div>
            <div><span style="color: var(--text-3);">المدرس:</span> ${teacherMap[link.teacherId] || link.teacherId || 'VIP'}</div>
          </div>
        </div>
        <div class="card">
          <h3 style="font-family: var(--font-head); margin-bottom: 12px;">🎬 معلومات الفيديو</h3>
          <div style="display: grid; gap: 10px; color: var(--text-2); font-size: 14px;">
            <div><span style="color: var(--text-3);">العنوان:</span> ${videoData?.video?.title || link.lessonTitle}</div>
            <div><span style="color: var(--text-3);">الحالة:</span> <span class="status-badge ${videoData?.video?.status === 'ready' ? 'status-active' : 'status-pending'}">${videoData?.video?.status === 'ready' ? 'جاهز' : 'قيد المعالجة'}</span></div>
            <div><span style="color: var(--text-3);">المدة:</span> ${videoData?.video?.duration ? videoData.video.duration + ' دقيقة' : 'غير محدد'}</div>
          </div>
        </div>
      </div>
    `;

  } catch (e) {
    console.error(e);
    mainArea.innerHTML = `
      <div class="page-header">
        <button class="btn btn-ghost btn-sm" onclick="navigate('#/student/lessons')">← العودة للدروس</button>
        <h1>⚠️ خطأ في تحميل الدرس</h1>
      </div>
      <div class="card" style="border-color: var(--warning);">
        <p style="color: var(--warning);">تعذر تحميل الفيديو. قد يكون السبب:</p>
        <ul style="color: var(--text-3); margin-top: 10px; padding-right: 20px; line-height: 2;">
          <li>سيرفر الفيديوهات متوقف</li>
          <li>الفيديو قيد المعالجة</li>
          <li>مشكلة في الاتصال</li>
        </ul>
      </div>
    `;
  }
}

function handleVideoError(video) {
  video.parentElement.innerHTML = `
    <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--surface-1); gap: 16px;">
      <div style="font-size: 48px;">⚠️</div>
      <p style="color: var(--text-3); font-size: 16px;">تعذر تشغيل الفيديو</p>
      <button class="btn btn-primary" onclick="location.reload()">🔄 إعادة المحاولة</button>
    </div>
  `;
}

/* ============================================
   UI HELPERS
   ============================================ */

function openModal() { modalOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal() { modalOverlay.classList.remove('active'); document.body.style.overflow = ''; }

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span style="font-size: 20px;">${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
    <span style="font-weight: 600;">${message}</span>
  `;
  toastWrap.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.4s ease-out reverse forwards';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

/* ============================================
   PWA & THEME
   ============================================ */

function toggleTheme() {
  const html = document.documentElement;
  const icon = document.querySelector('.theme-icon');
  // Simple toggle (can be expanded)
  showToast('الوضع الليلي مفعل', 'info');
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
  } else {
    showToast('أضف الموقع للشاشة الرئيسية من قائمة المتصفح', 'info');
  }
}

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* ============================================
   EXPORTS
   ============================================ */

window.navigate = navigate;
window.toggleFaq = toggleFaq;
window.handleLogin = handleLogin;
window.handleStudentRegistration = handleStudentRegistration;
window.showCreateCodeModal = showCreateCodeModal;
window.createNewCode = createNewCode;
window.suspendCode = suspendCode;
window.activateCode = activateCode;
window.extendCode = extendCode;
window.deleteCode = deleteCode;
window.loadStudents = loadStudents;
window.showAddBookModal = showAddBookModal;
window.saveNewBook = saveNewBook;
window.showAddBoxModal = showAddBoxModal;
window.saveNewBox = saveNewBox;
window.deleteBookItem = deleteBookItem;
window.deleteBoxItem = deleteBoxItem;
window.closeModal = closeModal;
window.toggleTheme = toggleTheme;
window.installApp = installApp;
window.showUploadVideoModal = showUploadVideoModal;
window.uploadVideo = uploadVideo;
window.checkVideoFile = checkVideoFile;
window.showLinkVideoModal = showLinkVideoModal;
window.showLinkExistingVideo = showLinkExistingVideo;
window.linkVideoToLessonSubmit = linkVideoToLessonSubmit;
window.unlinkVideo = unlinkVideo;
window.previewVideo = previewVideo;
window.previewLinkedVideo = previewLinkedVideo;
window.openLessonVideo = openLessonVideo;
window.handleVideoError = handleVideoError;
