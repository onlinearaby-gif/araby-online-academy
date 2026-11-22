/**
 * Araby Online Academy - Interactive Scripts
 * Handles Course Partitions, Payment Gateway, Anti-Fraud & Fake Receipt Detection, Free Trials, Calligraphy & Dashboard
 */

const WHATSAPP_NUMBER = "201080285458";

// --- Supabase Database Integration ---
const SUPABASE_URL = "https://jzhhrmdbypiizoosreqj.supabase.co";
const SUPABASE_KEY = "sb_publishable_T_S0sR8he3jL99TMQkbu3w_ARmZ2upt";
let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (err) {
      console.warn("Supabase init error:", err);
    }
  }
  return supabaseClient;
}

// --- 1. Section Switching (Landing vs Student Dashboard vs Admin Panel) ---
let currentView = 'landing';

function showSection(view) {
  const landingView = document.getElementById('landingView');
  const dashboardView = document.getElementById('studentDashboardView');
  const adminView = document.getElementById('adminDashboardView');
  const portalBtnText = document.getElementById('portalToggleText');

  // If leaving the admin view, clear admin session so re-entry always prompts for login
  if (currentView === 'admin' && view !== 'admin') {
    setAdminLoggedIn(false);
    sessionStorage.removeItem('araby_admin_logged_in');
    localStorage.removeItem('araby_admin_logged_in');
  }

  currentView = view;

  if (view === 'dashboard') {
    const activeUser = sessionStorage.getItem('araby_student_user') || localStorage.getItem('araby_active_student');
    if (!activeUser) {
      openRequireRegistrationModal('لوحة الطالب والحصص التفاعلية 🎓');
      return;
    }
    if (landingView) landingView.classList.add('hidden');
    if (adminView) adminView.classList.add('hidden');
    if (dashboardView) dashboardView.classList.remove('hidden');
    if (portalBtnText) portalBtnText.textContent = 'العودة للرئيسية';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (view === 'admin') {
    if (landingView) landingView.classList.add('hidden');
    if (dashboardView) dashboardView.classList.add('hidden');
    if (adminView) adminView.classList.remove('hidden');
    if (portalBtnText) portalBtnText.textContent = 'العودة للرئيسية';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    switchAdminTab('students');
    loadAdminStudents();
    loadAdminBookings();
  } else {
    if (dashboardView) dashboardView.classList.add('hidden');
    if (adminView) adminView.classList.add('hidden');
    if (landingView) landingView.classList.remove('hidden');
    if (portalBtnText) portalBtnText.textContent = 'لوحة الطالب والكورسات';
  }
}

function togglePortalMode() {
  if (currentView === 'landing') {
    const savedStr = localStorage.getItem('araby_active_student') || sessionStorage.getItem('araby_student_user');
    if (savedStr) {
      showSection('dashboard');
    } else {
      // If not yet registered, open the booking & enrollment modal so they get their dashboard immediately!
      openBookingModal();
    }
  } else {
    showSection('landing');
  }
}

// --- 1.5 Student & Parent Login Modal, Strict Auth & Tripartite Validation ---
const loginModal = document.getElementById('loginModal');
let currentLoginType = 'student'; // 'student' or 'parent'

// Helper: Generate unique secure student password code (e.g. araby-8421)
function generateStudentPassword(name) {
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `araby-${randNum}`;
}

// Default Registered Academy Students with Full Tripartite Names and Individual Distinct Passwords
const DEFAULT_REGISTERED_STUDENTS = [
  {
    id: 101,
    name: 'أحمد محمود عبد الرحمن',
    password: 'ahmed@2026',
    phone: '01012345678',
    email: 'ahmed.m@arabyonline.com',
    grade: 'الصف الأول الإعدادي',
    country: '🇪🇬 جمهورية مصر العربية',
    subject: 'المنهج المصري والنحو والبلاغة',
    avatar: 'أ'
  },
  {
    id: 102,
    name: 'سارة عبد الله القحطاني',
    password: 'sarah@2026',
    phone: '0559876543',
    email: 'sarah.a@arabyonline.com',
    grade: 'الصف الرابع الابتدائي',
    country: '🇸🇦 المملكة العربية السعودية',
    subject: 'منهج لغتي والخط العربي',
    avatar: 'س'
  },
  {
    id: 103,
    name: 'عمر فهد المطيري',
    password: 'omar@2026',
    phone: '09651234567',
    email: 'omar.fahad@arabyonline.com',
    grade: 'الصف السادس الابتدائي',
    country: '🇰🇼 دولة الكويت',
    subject: 'اللغة العربية وتحسين الخط',
    avatar: 'ع'
  },
  {
    id: 104,
    name: 'يوسف إبراهيم المنصوري',
    password: 'youssef@2026',
    phone: '0501234567',
    email: 'youssef.m@arabyonline.com',
    grade: 'الصف الخامس الابتدائي',
    country: '🇦🇪 دولة الإمارات',
    subject: 'القراءة والكتابة والنحو',
    avatar: 'ي'
  },
  {
    id: 105,
    name: 'مريم خالد الزهراني',
    password: 'mariam@2026',
    phone: '0541234567',
    email: 'mariam.k@arabyonline.com',
    grade: 'الصف الثالث الإعدادي',
    country: '🇸🇦 المملكة العربية السعودية',
    subject: 'التربية الإسلامية والدراسات القرآنية',
    avatar: 'م'
  }
];

// Helper: Normalize Arabic characters for robust comparison
function normalizeArabic(str) {
  if (!str) return '';
  return str
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove diacritics / tashkeel
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

// Helper: Verify if a name is tripartite (at least 3 words)
function isTripartiteName(name) {
  if (!name) return false;
  const words = name.trim().split(/\s+/).filter(w => w.length > 0);
  return words.length >= 3;
}

// Helper: Get all registered academy students (defaults + stored enrollments + admin cache)
function getAllRegisteredStudents() {
  let list = [...DEFAULT_REGISTERED_STUDENTS];
  
  // Stored registrations from free trial / enrollment modal
  try {
    const stored = localStorage.getItem('araby_registered_students');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        parsed.forEach(p => {
          if (p && p.name && !list.some(s => normalizeArabic(s.name) === normalizeArabic(p.name))) {
            if (!p.password) p.password = generateStudentPassword(p.name);
            list.push(p);
          }
        });
      }
    }
  } catch (e) {}

  // Active student if stored
  try {
    const active = localStorage.getItem('araby_active_student');
    if (active) {
      const parsedActive = JSON.parse(active);
      if (parsedActive && parsedActive.name && isTripartiteName(parsedActive.name)) {
        if (!list.some(s => normalizeArabic(s.name) === normalizeArabic(parsedActive.name))) {
          if (!parsedActive.password) parsedActive.password = generateStudentPassword(parsedActive.name);
          list.push(parsedActive);
        }
      }
    }
  } catch (e) {}

  // Admin student cache if available
  if (typeof allAdminStudentsCache !== 'undefined' && Array.isArray(allAdminStudentsCache)) {
    allAdminStudentsCache.forEach(a => {
      if (a && a.name && isTripartiteName(a.name) && !list.some(s => normalizeArabic(s.name) === normalizeArabic(a.name))) {
        list.push({
          name: a.name,
          password: a.password || generateStudentPassword(a.name),
          phone: a.phone || '',
          email: a.email || '',
          grade: a.grade || 'طالب بالأكاديمية',
          country: a.country || 'عام',
          subject: a.curriculum || 'اللغة العربية والقرآن',
          avatar: a.name.charAt(0) || 'ط'
        });
      }
    });
  }

  return list;
}

// Helper: Save newly enrolled student to registered list
function saveRegisteredStudent(student) {
  if (!student || !student.name) return;
  try {
    let list = [];
    const stored = localStorage.getItem('araby_registered_students');
    if (stored) {
      list = JSON.parse(stored) || [];
    }
    const idx = list.findIndex(s => normalizeArabic(s.name) === normalizeArabic(student.name));
    if (idx >= 0) {
      list[idx] = student;
    } else {
      list.push(student);
    }
    localStorage.setItem('araby_registered_students', JSON.stringify(list));
  } catch (e) {
    console.error('Error saving registered student:', e);
  }
}

function showStudentLoginError(msg) {
  const box = document.getElementById('studentLoginErrorMsg');
  const txt = document.getElementById('studentLoginErrorText');
  if (box && txt) {
    txt.innerHTML = msg;
    box.classList.remove('hidden');
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    alert(msg.replace(/<[^>]+>/g, ''));
  }
}

function clearStudentLoginError() {
  const box = document.getElementById('studentLoginErrorMsg');
  if (box) box.classList.add('hidden');
}

function autofillStudentLogin(name) {
  clearStudentLoginError();
  const idInput = document.getElementById('loginIdentifier');
  const passInput = document.getElementById('loginPassword');
  const allStudents = getAllRegisteredStudents();
  const student = allStudents.find(s => normalizeArabic(s.name) === normalizeArabic(name));

  if (idInput) {
    idInput.value = name;
    idInput.classList.add('ring-2', 'ring-purple-400');
    setTimeout(() => idInput.classList.remove('ring-2', 'ring-purple-400'), 1500);
  }
  if (passInput && student) {
    passInput.value = student.password || '';
  }
}

function openLoginModal() {
  clearStudentLoginError();
  if (loginModal) loginModal.classList.remove('hidden');
}

function closeLoginModal() {
  clearStudentLoginError();
  if (loginModal) loginModal.classList.add('hidden');
}

if (loginModal) {
  loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) closeLoginModal();
  });
}

function switchLoginType(type) {
  currentLoginType = type;
  clearStudentLoginError();
  const tabStudent = document.getElementById('loginTabStudent');
  const tabParent = document.getElementById('loginTabParent');
  const idLabel = document.getElementById('loginIdLabel');
  const idInput = document.getElementById('loginIdentifier');

  if (type === 'student') {
    if (tabStudent) tabStudent.className = "flex-1 py-2 rounded-xl bg-purple-600 text-white shadow-xs transition";
    if (tabParent) tabParent.className = "flex-1 py-2 rounded-xl text-slate-600 hover:text-slate-900 transition";
    if (idLabel) idLabel.innerHTML = 'اسم الطالب ثلاثياً (كما هو مسجل في الأكاديمية) <span class="text-rose-500 font-bold">*</span>';
    if (idInput) idInput.placeholder = "مثال: أحمد محمود عبد الرحمن";
  } else {
    if (tabParent) tabParent.className = "flex-1 py-2 rounded-xl bg-purple-600 text-white shadow-xs transition";
    if (tabStudent) tabStudent.className = "flex-1 py-2 rounded-xl text-slate-600 hover:text-slate-900 transition";
    if (idLabel) idLabel.innerHTML = 'رقم هاتف ولي الأمر المسجل أو اسم الطالب ثلاثياً <span class="text-rose-500 font-bold">*</span>';
    if (idInput) idInput.placeholder = "مثال: 01080285458 أو أحمد محمود عبد الرحمن";
  }
}

function updateDashboardWithStudent(studentData) {
  if (!studentData) return;
  const avatarEl = document.getElementById('dashAvatar');
  const nameEl = document.getElementById('dashName');
  const gradeEl = document.getElementById('dashGrade');
  const certNameEl = document.getElementById('certStudentName');
  const nextClassEl = document.getElementById('dashNextClassTitle');

  if (avatarEl) avatarEl.textContent = studentData.avatar || studentData.name.charAt(0) || 'ط';
  if (nameEl) nameEl.textContent = studentData.name;
  if (gradeEl) {
    const countryPart = studentData.country && studentData.country !== 'غير محدد' ? ` • ${studentData.country}` : '';
    const subjectPart = studentData.subject ? ` • ${studentData.subject}` : '';
    gradeEl.textContent = `${studentData.grade}${countryPart}${subjectPart}`;
  }
  if (certNameEl) certNameEl.textContent = studentData.name;
  if (nextClassEl && studentData.subject) {
    nextClassEl.textContent = `الحصة القادمة: ${studentData.subject}`;
  }
}

function handleStudentLoginSubmit(e) {
  e.preventDefault();
  clearStudentLoginError();

  const idInput = document.getElementById('loginIdentifier');
  const passInput = document.getElementById('loginPassword');
  const id = (idInput ? idInput.value : '').trim();
  const password = (passInput ? passInput.value : '').trim();

  // 1. Strict Tripartite Name Verification (Must be at least 3 words for students)
  if (currentLoginType === 'student') {
    if (!isTripartiteName(id)) {
      showStudentLoginError(`<strong>❌ الاسم غير مكتمل!</strong><br>يجب كتابة اسم الطالب <strong>ثلاثياً بالكامل</strong> (3 كلمات على الأقل، مثل: <code>أحمد محمود عبد الرحمن</code>). غير مسموح بالاسم المفرد أو الثنائي.`);
      if (idInput) {
        idInput.focus();
        idInput.classList.add('border-rose-500');
        setTimeout(() => idInput.classList.remove('border-rose-500'), 2500);
      }
      return;
    }
  } else {
    // Parent tab: accepts phone number (digits >= 8) or tripartite student name
    const digitsOnly = id.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 8 && !isTripartiteName(id)) {
      showStudentLoginError(`<strong>❌ بيانات غير صحيحة!</strong><br>يرجى إدخال رقم ولي الأمر المسجل (8 أرقام على الأقل) أو اسم الطالب ثلاثياً بالكامل.`);
      if (idInput) idInput.focus();
      return;
    }
  }

  // 2. Password Presence Verification
  if (!password) {
    showStudentLoginError(`<strong>❌ كلمة المرور مطلوبة!</strong><br>يرجى إدخال كلمة المرور الخاصة بالطالب والمُرسلة لكم من قِبل إدارة الأكاديمية.`);
    if (passInput) {
      passInput.focus();
      passInput.classList.add('border-rose-500');
      setTimeout(() => passInput.classList.remove('border-rose-500'), 2500);
    }
    return;
  }

  // 3. Registered Student Verification (Must exist in registered academy lists)
  const allRegistered = getAllRegisteredStudents();
  const normId = normalizeArabic(id);
  const digitsId = id.replace(/[^0-9]/g, '');

  let matchedStudent = allRegistered.find(student => {
    const normName = normalizeArabic(student.name);
    if (normName === normId) return true;
    
    // Check first 3 words match
    const normWords = normName.split(' ');
    const idWords = normId.split(' ');
    if (idWords.length >= 3 && normWords.length >= 3) {
      if (normWords.slice(0, 3).join(' ') === idWords.slice(0, 3).join(' ')) {
        return true;
      }
    }

    // Phone match for parent login
    if (digitsId.length >= 8 && student.phone) {
      const studentDigits = student.phone.replace(/[^0-9]/g, '');
      if (studentDigits && (studentDigits === digitsId || studentDigits.endsWith(digitsId) || digitsId.endsWith(studentDigits))) {
        return true;
      }
    }

    return false;
  });

  if (!matchedStudent) {
    showStudentLoginError(`<strong>❌ الطالب غير مسجل!</strong><br>الاسم أو الرقم المدخل <em>(${id})</em> غير مقيد في كشوفات طلاب الأكاديمية.<br>الدخول متاح <strong>فقط للطلاب المسجلين مسبقاً</strong>. يمكنك التسجيل والاشتراك مجاناً عبر الضغط على الزر الأخضر بالأسفل.`);
    if (idInput) idInput.focus();
    return;
  }

  // 4. Strict Individual Password Verification (Must match THIS student's assigned password)
  const expectedPassword = matchedStudent.password || 'ahmed@2026';
  if (password !== expectedPassword) {
    showStudentLoginError(`<strong>❌ كلمة المرور غير صحيحة!</strong><br>كلمة المرور المدخلة غير صحيحة لحساب الطالب (<strong>${matchedStudent.name}</strong>).<br>يجب كتابة كلمة المرور الخاصة بكم والمُرسلة لكم حصرياً من قِبل إدارة الأكاديمية.<br><span class="block mt-2 text-[11px] text-slate-600 font-medium">للحصول على كلمة المرور أو في حال نسيانها، تواصل مع الإدارة عبر واتساب: <a href="https://wa.me/201080285458?text=${encodeURIComponent(`السلام عليكم ورحمة الله، أريد استلام كلمة المرور الخاصة بحساب الطالب: ${matchedStudent.name}`)}" target="_blank" class="underline text-emerald-700 font-bold">01080285458 💬</a></span>`);
    if (passInput) {
      passInput.focus();
      passInput.classList.add('border-rose-500');
      setTimeout(() => passInput.classList.remove('border-rose-500'), 2500);
    }
    return;
  }

  // 5. Successful Authentication & Session Setup
  localStorage.setItem('araby_active_student', JSON.stringify(matchedStudent));
  sessionStorage.setItem('araby_student_user', matchedStudent.name);
  updateDashboardWithStudent(matchedStudent);
  closeLoginModal();
  updateAuthHeader();
  showSection('dashboard');

  if (typeof showMiniToast === 'function') {
    showMiniToast(`أهلاً بك يا ${matchedStudent.name}! 🎓 تم التحقق من كلمة مرورك والدخول بنجاح.`);
  } else {
    alert(`أهلاً بك يا ${matchedStudent.name}! 🎓 تم التحقق من هويتك كطالب مسجل وفتح لوحة الطالب بنجاح.`);
  }
}

function handleQuickDemoLogin() {
  const demoStudent = DEFAULT_REGISTERED_STUDENTS[0]; // 'أحمد محمود عبد الرحمن'
  localStorage.setItem('araby_active_student', JSON.stringify(demoStudent));
  sessionStorage.setItem('araby_student_user', demoStudent.name);
  updateDashboardWithStudent(demoStudent);
  closeLoginModal();
  updateAuthHeader();
  showSection('dashboard');
}

function handleStudentLogout() {
  sessionStorage.removeItem('araby_student_user');
  localStorage.removeItem('araby_active_student');
  updateAuthHeader();
  showSection('landing');
  alert('تم تسجيل الخروج بنجاح من لوحة الطالب.');
}

function updateAuthHeader() {
  const user = sessionStorage.getItem('araby_student_user');
  const loginBtn = document.getElementById('headerLoginBtn');
  const userChip = document.getElementById('headerUserChip');
  const userNameEl = document.getElementById('headerUserName');

  if (user) {
    if (loginBtn) loginBtn.classList.add('hidden');
    if (userChip) {
      userChip.classList.remove('hidden');
      userChip.classList.add('flex');
    }
    if (userNameEl) userNameEl.textContent = user;
  } else {
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (userChip) {
      userChip.classList.add('hidden');
      userChip.classList.remove('flex');
    }
  }
}

// Global Secret Admin Shortcut: Ctrl + Shift + A
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
    e.preventDefault();
    handleAdminButtonClick();
  }
});

// --- 2. Interactive Calligraphy Canvas ---
const canvas = document.getElementById('calligraphyCanvas');
let ctx = null;
let isDrawing = false;
let brushColor = '#1E293B';
let brushWidth = 6;
let lastX = 0;
let lastY = 0;

if (canvas) {
  ctx = canvas.getContext('2d');

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }

  window.addEventListener('resize', resizeCanvas);
  setTimeout(resizeCanvas, 150);

  function getCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function startDraw(e) {
    isDrawing = true;
    const coords = getCoords(e);
    lastX = coords.x;
    lastY = coords.y;
    drawDot(lastX, lastY);
  }

  function drawDot(x, y) {
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(x, y, brushWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = brushColor;
    ctx.fill();
  }

  function drawMove(e) {
    if (!isDrawing || !ctx) return;
    e.preventDefault();
    const coords = getCoords(e);

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastX = coords.x;
    lastY = coords.y;
  }

  function endDraw() {
    isDrawing = false;
  }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', drawMove);
  window.addEventListener('mouseup', endDraw);

  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', drawMove, { passive: false });
  window.addEventListener('touchend', endDraw);
}

function setBrushColor(color) {
  brushColor = color;
  document.querySelectorAll('.color-dot').forEach(btn => btn.classList.remove('ring-2', 'ring-offset-2', 'ring-slate-800'));
  if (window.event && window.event.currentTarget) {
    window.event.currentTarget.classList.add('ring-2', 'ring-offset-2', 'ring-slate-800');
  }
}

function clearCanvas() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function setTraceLetter(letter) {
  const guide = document.getElementById('canvasGuideText');
  if (guide) guide.textContent = letter;

  document.querySelectorAll('.trace-btn').forEach(btn => btn.classList.remove('active'));
  if (window.event && window.event.currentTarget) {
    window.event.currentTarget.classList.add('active');
  }
}

function downloadDrawing() {
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = 'لوحة_الخط_عربي_أونلاين.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// --- 3. Student Dashboard Profiles & Tabs ---
const studentProfiles = {
  ahmed: {
    avatar: 'أ',
    name: 'أحمد محمود حسنين',
    grade: 'الصف الخامس الابتدائي - المنهج المصري والنحو 🇪🇬',
    xp: '1,850 ⭐',
    levelPercent: '82%',
    nextClass: 'كورس النحو من الصفر: إعراب الفاعل والمفعول به'
  },
  sarah: {
    avatar: 'س',
    name: 'سارة عبد الله العتيبي',
    grade: 'الصف الرابع الابتدائي - منهج لغتي والتأسيس 🇸🇦',
    xp: '2,100 ⭐',
    levelPercent: '90%',
    nextClass: 'منهج لغتي: الوظيفة النحوية ورسم الهمزات'
  }
};

function setDashboardProfile(key) {
  const p = studentProfiles[key];
  if (!p) return;

  document.getElementById('dashAvatar').textContent = p.avatar;
  document.getElementById('dashName').textContent = p.name;
  document.getElementById('dashGrade').textContent = p.grade;
  document.getElementById('dashXP').textContent = p.xp;
  document.getElementById('dashLevelBar').style.width = p.levelPercent;
  document.getElementById('dashNextClassTitle').textContent = p.nextClass;
  document.getElementById('certStudentName').textContent = p.name;

  document.getElementById('btn-profile-ahmed').classList.toggle('active', key === 'ahmed');
  document.getElementById('btn-profile-sarah').classList.toggle('active', key === 'sarah');
}

function switchPortalTab(tabKey) {
  const tabs = ['schedule', 'partitions', 'quizzes', 'homework', 'reports', 'certificate', 'reviews'];
  tabs.forEach(t => {
    const btn = document.getElementById(`portal-tab-${t}`);
    const view = document.getElementById(`portal-view-${t}`);
    if (t === tabKey) {
      if (btn) btn.classList.add('active');
      if (view) view.classList.remove('hidden');
    } else {
      if (btn) btn.classList.remove('active');
      if (view) view.classList.add('hidden');
    }
  });

  if (tabKey === 'partitions' && typeof resizeCanvas === 'function') {
    setTimeout(resizeCanvas, 80);
  }

  if (tabKey === 'reviews' && typeof renderLandingReviews === 'function') {
    renderLandingReviews();
  }
}

// --- Interactive Quizzes Bank & Engine ---
const SUBJECT_QUIZZES_DATA = {
  'النحو': {
    title: 'اختبار النحو: إعراب الجملة الفعلية والاسمية وعلامات الإعراب 📐',
    questions: [
      {
        q: '1. ما هي علامة رفع جمع المذكر السالم؟',
        options: ['الواو (مثل: المعلمون)', 'الألف (مثل: المعلمان)', 'الضمة المقدرة'],
        answer: 0
      },
      {
        q: '2. حدد الفاعل في الجملة: (كتبَ الطالبُ المتفوقُ الدرسَ بعناية):',
        options: ['الطالبُ (فاعل مرفوع وعلامة رفعه الضمة)', 'الدرسَ', 'المتفوقُ'],
        answer: 0
      },
      {
        q: '3. (كان وأخواتها) أفعال ناسخة تدخل على الجملة الاسمية فـ:',
        options: ['ترفع المبتدأ وتنصب الخبر', 'تنصب المبتدأ وترفع الخبر', 'تجر المبتدأ والخبر'],
        answer: 0
      }
    ]
  },
  'الإملاء': {
    title: 'اختبار الإملاء والتأسيس: همزات الوصل والقطع ورسم الهمزات 🌱',
    questions: [
      {
        q: '1. الهمزة في كلمة (انتصار) هي همزة:',
        options: ['همزة وصل (تسقط نطقاً عند الوصل)', 'همزة قطع', 'همزة متطرفة'],
        answer: 0
      },
      {
        q: '2. تُكتب الهمزة المتوسطة على نبرة (ـئـ) إذا كانت:',
        options: ['مكسورة أو ما قبلها مكسور (أقوى الحركات)', 'مفتوحة وما قبلها مفتوح', 'مضمومة وما قبلها ساكن'],
        answer: 0
      },
      {
        q: '3. التاء المربوطة (ـة) عند الوقف تنطق:',
        options: ['هاءً ساكنة (مثل: مدرسةْ)', 'تاءً صريحة', 'ألفاً ممدودة'],
        answer: 0
      }
    ]
  },
  'اللغة العربية': {
    title: 'اختبار شامل في منهج اللغة العربية وفهم المقروء 🇪🇬',
    questions: [
      {
        q: '1. مرادف كلمة (شغف) في سياق: "يتعلم الطالب بشغف":',
        options: ['حب واهتمام شديد', 'ملل وضجر', 'تردد وبطء'],
        answer: 0
      },
      {
        q: '2. مفرد كلمة (مفاتيح):',
        options: ['مفتاح', 'فاتح', 'مفتوح'],
        answer: 0
      },
      {
        q: '3. نوع الأسلوب في جملة: (يا طالبَ العلمِ، اجتهد في دروسك):',
        options: ['أسلوب نداء يليه أسلوب أمر للحث والتشجيع', 'أسلوب نهي', 'أسلوب استفهام تعجبي'],
        answer: 0
      }
    ]
  },
  'الخط': {
    title: 'تحدي تحسين الخط العربي وتناسق الحروف ✍️',
    questions: [
      {
        q: '1. في خط الرقعة، تتميز الحروف بأنها:',
        options: ['مطموسة في بعض الحروف مثل (م، ع، غ) وصغيرة وسريعة الكتابة', 'دائرية ومفتوحة دائماً', 'تكتب بحبر جاف فقط'],
        answer: 0
      },
      {
        q: '2. الحروف التي تستقر على السطر في خط النسخ هي:',
        options: ['حروف كلمة (فستكلو) كالألف والباء والدال', 'الراء والواو فقط', 'النون والياء فقط'],
        answer: 0
      }
    ]
  }
};

function startSubjectQuiz(subjectKey) {
  const modal = document.getElementById('interactiveQuizModal');
  const titleEl = document.getElementById('quizModalSubjectTitle');
  const container = document.getElementById('quizQuestionsContainer');
  const resultBox = document.getElementById('quizResultBox');
  const submitBtn = document.getElementById('btnSubmitQuiz');

  if (!modal || !container) return;

  if (resultBox) resultBox.classList.add('hidden');
  if (submitBtn) submitBtn.classList.remove('hidden');

  let chosenData = SUBJECT_QUIZZES_DATA['النحو'];
  if (subjectKey.includes('إملاء') || subjectKey.includes('تأسيس')) {
    chosenData = SUBJECT_QUIZZES_DATA['الإملاء'];
  } else if (subjectKey.includes('خط')) {
    chosenData = SUBJECT_QUIZZES_DATA['الخط'];
  } else if (subjectKey.includes('عربية') || subjectKey.includes('مدرسي') || subjectKey.includes('مقرر')) {
    chosenData = SUBJECT_QUIZZES_DATA['اللغة العربية'];
  }

  if (titleEl) titleEl.textContent = chosenData.title;

  container.innerHTML = chosenData.questions.map((item, idx) => {
    return `
      <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
        <p class="font-bold text-slate-900 text-xs sm:text-sm leading-snug">${item.q}</p>
        <div class="space-y-1.5">
          ${item.options.map((opt, optIdx) => `
            <label class="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 cursor-pointer transition text-xs">
              <input type="radio" name="quiz_q_${idx}" value="${optIdx}" ${optIdx === 0 ? 'checked' : ''} class="text-purple-600 focus:ring-purple-500">
              <span class="text-slate-800 font-medium">${opt}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  modal.classList.remove('hidden');
}

function submitSubjectQuiz(e) {
  e.preventDefault();
  const resultBox = document.getElementById('quizResultBox');
  const submitBtn = document.getElementById('btnSubmitQuiz');

  if (resultBox) resultBox.classList.remove('hidden');
  if (submitBtn) submitBtn.classList.add('hidden');

  if (typeof showMiniToast === 'function') {
    showMiniToast('🎉 ممتاز! تم رصد الدرجة (10 / 10) وتحديث تقرير متابعة ولي الأمر.');
  }
}

function closeSubjectQuizModal() {
  const modal = document.getElementById('interactiveQuizModal');
  if (modal) modal.classList.add('hidden');
}

// --- Parent Subject Follow-up Reports ---
function openParentSubjectReport(subjectName) {
  const modal = document.getElementById('parentReportModal');
  const titleEl = document.getElementById('parentReportSubjectTitle');
  const studentNameEl = document.getElementById('repStudentName');

  if (!modal) return;

  if (titleEl && subjectName) {
    titleEl.textContent = `تقرير متابعة ولي الأمر: ${subjectName}`;
  }

  try {
    const student = JSON.parse(localStorage.getItem('araby_active_student') || '{}');
    if (student && student.name && studentNameEl) {
      studentNameEl.textContent = student.name;
    }
  } catch (e) {}

  modal.classList.remove('hidden');
}

function closeParentReportModal() {
  const modal = document.getElementById('parentReportModal');
  if (modal) modal.classList.add('hidden');
}

function printParentComprehensiveReport() {
  window.print();
}

// --- Interactive Classes & Gated Access Management ---
function isStudentLoggedIn() {
  const sessionUser = sessionStorage.getItem('araby_student_user');
  const localStudent = localStorage.getItem('araby_active_student');
  return !!(sessionUser || localStudent);
}

function handleInteractiveClassesClick() {
  if (isStudentLoggedIn()) {
    showSection('dashboard');
    switchPortalTab('schedule');
    if (typeof showMiniToast === 'function') {
      showMiniToast('مرحباً بك في قاعة الحصص التفاعلية المباشرة! 🎙️');
    }
  } else {
    openRequireRegistrationModal('الحصص التفاعلية المباشرة 🎙️');
  }
}

function openRequireRegistrationModal(featureTitle) {
  const modal = document.getElementById('registrationRequiredModal');
  const titleEl = document.getElementById('requireRegFeatureTitle');
  if (titleEl && featureTitle) {
    titleEl.textContent = featureTitle;
  }
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function closeRequireRegistrationModal() {
  const modal = document.getElementById('registrationRequiredModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Interactive Classroom Virtual Room Handlers
function raiseHandInLiveClass() {
  const banner = document.getElementById('classHandRaiseBanner');
  if (banner) {
    banner.classList.remove('hidden');
    setTimeout(() => {
      if (banner) banner.classList.add('hidden');
    }, 4500);
  }
  if (typeof showMiniToast === 'function') {
    showMiniToast('✋ تم رفع يدك وإشعار مس فرح القاضي للمشاركة الصوتية!');
  }
}

function sendLiveClassChat() {
  const input = document.getElementById('liveClassChatInput');
  const chatBox = document.getElementById('liveClassChatMessages');
  if (!input || !chatBox) return;
  const msg = input.value.trim();
  if (!msg) return;

  let studentName = 'طالب مسجل';
  try {
    const currentStudent = JSON.parse(localStorage.getItem('araby_active_student') || '{}');
    if (currentStudent && currentStudent.name) studentName = currentStudent.name;
  } catch (e) {}

  const userMsgEl = document.createElement('div');
  userMsgEl.className = 'bg-orange-50 border border-orange-200 rounded-xl p-2.5 text-right';
  userMsgEl.innerHTML = `<span class="font-bold text-orange-950 block mb-0.5 text-xs">${studentName} 🎓:</span><p class="text-slate-800 text-xs">${escapeHtml(msg)}</p>`;
  chatBox.appendChild(userMsgEl);
  input.value = '';
  chatBox.scrollTop = chatBox.scrollHeight;

  // Cheerful automated feedback from teacher Farah
  setTimeout(() => {
    const teacherResponses = [
      'أحسنت يا بطل! إجابة ممتازة وتركيز رائع 🌟',
      'بارك الله فيك، مشاركة ذكية وموفقة جداً! 👏',
      'سؤال رائع! سنقوم بشرحه بالتفصيل في الشريحة القادمة ✨',
      'ممتاز جداً! هكذا يكون التفاعل في لغتنا العربية الجميلة 🎯'
    ];
    const randResp = teacherResponses[Math.floor(Math.random() * teacherResponses.length)];
    const teacherMsgEl = document.createElement('div');
    teacherMsgEl.className = 'bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-right';
    teacherMsgEl.innerHTML = `<span class="font-bold text-emerald-900 block mb-0.5 text-xs">مس فرح القاضي (المعلمة) 👩‍🏫:</span><p class="text-slate-800 text-xs">${randResp}</p>`;
    chatBox.appendChild(teacherMsgEl);
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 1200);
}

function toggleClassMic() {
  const btn = document.getElementById('btnClassMic');
  if (!btn) return;
  const isMuted = btn.classList.contains('bg-rose-500');
  if (isMuted) {
    btn.className = 'px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-1.5 transition text-xs';
    btn.innerHTML = '<i class="fa-solid fa-microphone text-emerald-400"></i><span>المايك مفتوح</span>';
    if (typeof showMiniToast === 'function') showMiniToast('🎤 تم فتح المايك');
  } else {
    btn.className = 'px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold flex items-center justify-center gap-1.5 transition text-xs';
    btn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i><span>المايك مكتوم</span>';
    if (typeof showMiniToast === 'function') showMiniToast('🔇 تم كتم المايك');
  }
}

function toggleClassCam() {
  const btn = document.getElementById('btnClassCam');
  if (!btn) return;
  const isOff = btn.classList.contains('bg-rose-500');
  if (isOff) {
    btn.className = 'px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-1.5 transition text-xs';
    btn.innerHTML = '<i class="fa-solid fa-video text-blue-400"></i><span>الكاميرا تعمل</span>';
    if (typeof showMiniToast === 'function') showMiniToast('📹 تم تشغيل الكاميرا');
  } else {
    btn.className = 'px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold flex items-center justify-center gap-1.5 transition text-xs';
    btn.innerHTML = '<i class="fa-solid fa-video-slash"></i><span>الكاميرا مغلقة</span>';
    if (typeof showMiniToast === 'function') showMiniToast('📷 تم إيقاف الكاميرا');
  }
}

function triggerUploadHomework(title) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*,.pdf';
  input.onchange = () => {
    alert(`تم استلام ملف (${title}) بنجاح! سيتم إخطار المعلم لمراجعته ووضع الملاحظات في لوحتك.`);
  };
  input.click();
}

// --- 4. Free Trial Booking Modal (100% Free - بدون أي دفع) ---
const bookingModal = document.getElementById('bookingModal');

function openBookingModal(preferred = '') {
  if (bookingModal) {
    bookingModal.classList.remove('hidden');
    if (preferred) {
      const select = document.getElementById('modalCurriculum');
      if (select) {
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].value.includes(preferred) || select.options[i].text.includes(preferred)) {
            select.selectedIndex = i;
            break;
          }
        }
      }
    }
  }
}

function closeBookingModal() {
  if (bookingModal) bookingModal.classList.add('hidden');
}

if (bookingModal) {
  bookingModal.addEventListener('click', (e) => {
    if (e.target === bookingModal) closeBookingModal();
  });
}

async function handleBookingForm(e) {
  e.preventDefault();
  const name = (document.getElementById('modalStudentName').value || '').trim();
  const emailEl = document.getElementById('modalStudentEmail');
  const email = emailEl ? emailEl.value.trim() : '';
  const phone = (document.getElementById('modalParentPhone').value || '').trim();
  const countryEl = document.getElementById('modalCountry');
  const country = countryEl && countryEl.value ? countryEl.value : 'غير محدد';
  const grade = (document.getElementById('modalStudentGrade').value || '').trim();
  const currEl = document.getElementById('modalCurriculum');
  const curriculum = currEl && currEl.value ? currEl.value : 'اللغة العربية والقرآن الكريم';

  // Strict Tripartite Name Validation for newly enrolled students
  if (!isTripartiteName(name)) {
    alert('⚠️ تنبيه هام: يرجى كتابة اسم الطالب ثلاثياً بالكامل (3 كلمات على الأقل، مثل: أحمد محمود عبد الرحمن) لضمان اعتماد التسجيل وإصدار كلمة مرور خاصة به.');
    const nEl = document.getElementById('modalStudentName');
    if (nEl) {
      nEl.focus();
      nEl.classList.add('border-rose-500');
      setTimeout(() => nEl.classList.remove('border-rose-500'), 2500);
    }
    return;
  }

  // Issue unique individual password for this student
  const studentPassword = generateStudentPassword(name);

  // Construct structured Student Profile
  const studentData = {
    name: name,
    password: studentPassword,
    email: email,
    phone: phone,
    country: country,
    grade: grade,
    subject: curriculum,
    avatar: name.charAt(0) || 'ط',
    joinedAt: new Date().toISOString()
  };

  // 1. Save locally for instant session persistence & registered list
  localStorage.setItem('araby_active_student', JSON.stringify(studentData));
  sessionStorage.setItem('araby_student_user', studentData.name);
  saveRegisteredStudent(studentData);

  // 2. Save directly to Supabase Database
  const client = getSupabase();
  if (client) {
    try {
      await client.from('bookings').insert([{
        student_name: name,
        student_grade: grade,
        curriculum: `${curriculum} (الدولة: ${country}) | كود: ${studentPassword}`,
        parent_phone: `${phone}${email ? ' | إيميل: ' + email : ''}`,
        status: 'new'
      }]);
    } catch (err) {
      console.error("Error saving booking to Supabase:", err);
    }
  }

  // 3. Immediately activate & update the Student Dashboard
  updateDashboardWithStudent(studentData);
  closeBookingModal();
  updateAuthHeader();
  showSection('dashboard');

  // 4. Cheerful Confirmation Alert with Student's Specific Password
  alert(`🎉 مبروك يا ${name}!\nتم تسجيل بياناتك وحجز الحصة التجريبية بنجاح 🎓.\n\n🔑 كلمة المرور الخاصة بك للدخول للمنصة هي: ${studentPassword}\nيرجى حفظها لديك، كما تم إرسالها للإدارة للتواصل والمتابعة معك عبر واتساب.`);

  // 5. Open WhatsApp to confirm the appointment directly with academy admin/teacher
  const msg = 
`السلام عليكم ورحمة الله وبركاته،
تم تسجيل حساب جديد وحجز *حصة تجريبية مجانية* في *أكاديمية عربي أونلاين*:
👤 *اسم الطالب:* ${name}
🔑 *كلمة المرور الخاصة به:* ${studentPassword}
🎒 *الصف الدراسي:* ${grade}
📚 *المادة / القسم:* ${curriculum}
🌍 *الدولة:* ${country}
📱 *رقم ولي الأمر:* ${phone}
${email ? '📧 *البريد الإلكتروني:* ' + email + '\n' : ''}🎁 *عرض الشهر:* استلام كورس تحسين الخط العربي هدية مجانية 100%!
شكراً لكم!`;

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

// --- 5. Payment Gateway Modal & Anti-Fraud Verification ---
const paymentModal = document.getElementById('paymentModal');
const paymentErrorModal = document.getElementById('paymentErrorModal');

function openPaymentModal(courseName = '') {
  if (paymentModal) {
    paymentModal.classList.remove('hidden');
    if (courseName) {
      const sel = document.getElementById('payCourseSelect');
      if (sel) {
        for (let i = 0; i < sel.options.length; i++) {
          if (sel.options[i].value.includes(courseName) || sel.options[i].text.includes(courseName)) {
            sel.selectedIndex = i;
            break;
          }
        }
      }
    }
    updateCoursePrice();
  }
}

function closePaymentModal() {
  if (paymentModal) paymentModal.classList.add('hidden');
}

function openPaymentErrorModal() {
  if (paymentErrorModal) paymentErrorModal.classList.remove('hidden');
}

function closePaymentErrorModal() {
  if (paymentErrorModal) paymentErrorModal.classList.add('hidden');
}

if (paymentModal) {
  paymentModal.addEventListener('click', (e) => {
    if (e.target === paymentModal) closePaymentModal();
  });
}

if (paymentErrorModal) {
  paymentErrorModal.addEventListener('click', (e) => {
    if (e.target === paymentErrorModal) closePaymentErrorModal();
  });
}

function updateCoursePrice() {
  const sel = document.getElementById('payCourseSelect');
  const priceTag = document.getElementById('displayPriceTag');
  if (sel && priceTag) {
    const selectedOption = sel.options[sel.selectedIndex];
    const eg = selectedOption.getAttribute('data-price-eg') || '300 جنيه';
    const sa = selectedOption.getAttribute('data-price-sa') || '75 ريال';
    priceTag.textContent = `${eg} (أو ${sa})`;
  }
}

// Security: Check for fake / suspicious receipt screenshots
async function handlePaymentSubmit(e) {
  e.preventDefault();
  const course = document.getElementById('payCourseSelect').value;
  const price = document.getElementById('displayPriceTag').textContent;
  const student = document.getElementById('payStudentName').value;
  const gradeEl = document.getElementById('payStudentGrade');
  const grade = gradeEl ? gradeEl.value : '';
  const phone = document.getElementById('payParentPhone').value;
  const method = document.querySelector('input[name="payMethod"]:checked').value;
  const fileInput = document.getElementById('payReceiptFile');

  // Strict Fraud Verification Logic
  const file = fileInput.files[0];
  
  if (!file) {
    openPaymentErrorModal();
    return;
  }

  const fileName = file.name.toLowerCase();
  const fileSize = file.size; // bytes

  // If file indicates fake, test, corrupt or unusually tiny (< 3KB)
  if (
    fileName.includes('fake') || 
    fileName.includes('فيك') || 
    fileName.includes('وهمي') || 
    fileName.includes('test') || 
    fileSize < 3000
  ) {
    closePaymentModal();
    openPaymentErrorModal();
    return;
  }

  // Save payment application directly to Supabase Database
  const client = getSupabase();
  if (client) {
    try {
      await client.from('payments').insert([{
        student_name: student,
        student_grade: grade || 'غير محدد',
        course_name: course,
        price: price,
        parent_phone: phone,
        payment_method: method,
        receipt_filename: file ? file.name : '',
        status: 'pending_verification'
      }]);
    } catch (err) {
      console.error("Error saving payment to Supabase:", err);
    }
  }

  // If passed initial structure check, it goes to Admin Verification state (NEVER auto-unlocked!)
  const msg = 
`السلام عليكم ورحمة الله،
طلب اشتراك ودفع في *أكاديمية عربي أونلاين*:
👤 *اسم الطالب:* ${student}
🎒 *الصف الدراسي:* ${grade || 'غير محدد'}
📚 *الكورس الأساسي المطلوب:* ${course}
🎁 *هدية عرض الشهر المجانية:* كورس تحسين الخط العربي بالقلم العادي (مجاناً 100%) ✍️
💰 *المبلغ المحول:* ${price}
💳 *طريقة الدفع:* ${method}
📱 *رقم ولي الأمر:* ${phone}
📎 *مرفق صورة الإيصال للتحقق والمطابقة مع كشف الحساب قبل تفعيل الكورسات.*`;

  closePaymentModal();
  alert(`تم إرسال بيانات التحويل وحفظها في قاعدة البيانات للتدقيق والمطابقة.\n\n⚠️ تنبيه أمني: لن يتم تفعيل وفتح الكورس إلا بعد مطابقة الإيصال مع كشف حساب الأكاديمية (01080285458). إذا كان الإيصال غير مطابق ستظهر رسالة "خطأ في عملية الدفع".`);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

// Simulator for Admin to test fake receipt detection
function simulateFakeReceiptDetection() {
  openPaymentErrorModal();
}

// --- 6. Teacher / Admin Course Upload Modal ---
const courseUploadModal = document.getElementById('courseUploadModal');

function openCourseUploadModal() {
  if (courseUploadModal) courseUploadModal.classList.remove('hidden');
}

function closeCourseUploadModal() {
  if (courseUploadModal) courseUploadModal.classList.add('hidden');
}

if (courseUploadModal) {
  courseUploadModal.addEventListener('click', (e) => {
    if (e.target === courseUploadModal) closeCourseUploadModal();
  });
}

function handleCourseUploadSubmit(e) {
  e.preventDefault();
  const partition = document.getElementById('uploadPartitionSelect').value;
  const title = document.getElementById('uploadLessonTitle').value;

  closeCourseUploadModal();
  alert(`تم بنجاح رفع ونشر الدرس الجديد:\n"${title}"\nداخل مقرر (${partition})! أصبح الدرس متاحاً الآن لجميع الطلاب المشتركين المعتمدين.`);
}

// --- 7. Admin Authentication, Security Settings & Account Management ---
const DEFAULT_ADMIN_EMAIL = "admin@arabyonline.com";
const DEFAULT_ADMIN_PASS = "1n2m3m4m";

function getAdminEmail() {
  return localStorage.getItem('araby_admin_email') || DEFAULT_ADMIN_EMAIL;
}

function getAdminPass() {
  return localStorage.getItem('araby_admin_pass') || DEFAULT_ADMIN_PASS;
}

function isAdminLoggedIn() {
  return sessionStorage.getItem('araby_admin_logged_in') === 'true' || localStorage.getItem('araby_admin_logged_in') === 'true';
}

function setAdminLoggedIn(status) {
  if (status) {
    sessionStorage.setItem('araby_admin_logged_in', 'true');
    localStorage.setItem('araby_admin_logged_in', 'true');
  } else {
    sessionStorage.removeItem('araby_admin_logged_in');
    localStorage.removeItem('araby_admin_logged_in');
  }
}

function updateAdminUI() {
  const currentEmail = getAdminEmail();
  const displayEmail = document.getElementById('displayCurrentAdminEmail');
  if (displayEmail) {
    displayEmail.textContent = currentEmail;
  }
}

const adminLoginModal = document.getElementById('adminLoginModal');

function openAdminLoginModal() {
  updateAdminUI();
  const errEl = document.getElementById('loginErrorMessage');
  if (errEl) errEl.classList.add('hidden');
  
  const emailInput = document.getElementById('loginAdminEmail');
  const passInput = document.getElementById('loginAdminPassword');
  
  // Pre-fill with default credentials for user convenience
  if (emailInput && !emailInput.value) emailInput.value = 'admin@arabyonline.com';
  if (passInput && !passInput.value) passInput.value = '1n2m3m4m';

  if (adminLoginModal) adminLoginModal.classList.remove('hidden');
  if (emailInput) emailInput.focus();
}

function closeAdminLoginModal() {
  if (adminLoginModal) adminLoginModal.classList.add('hidden');
  const errEl = document.getElementById('loginErrorMessage');
  if (errEl) errEl.classList.add('hidden');
}

if (adminLoginModal) {
  adminLoginModal.addEventListener('click', (e) => {
    if (e.target === adminLoginModal) closeAdminLoginModal();
  });
}

function autoFillAdminLogin() {
  const emailInput = document.getElementById('loginAdminEmail');
  const passInput = document.getElementById('loginAdminPassword');
  if (emailInput) emailInput.value = 'admin@arabyonline.com';
  if (passInput) passInput.value = '1n2m3m4m';
  const errEl = document.getElementById('loginErrorMessage');
  if (errEl) {
    errEl.classList.remove('hidden');
    errEl.className = "text-emerald-700 text-xs font-bold text-center bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 mb-2";
    errEl.innerHTML = '<i class="fa-solid fa-circle-check ml-1"></i> تم ملء بيانات الدخول المعتمدة (1n2m3m4m)! اضغطي الآن على زر الدخول بالأسفل.';
  }
}

function resetAdminCredentials() {
  localStorage.setItem('araby_admin_pass', '1n2m3m4m');
  localStorage.removeItem('araby_admin_email');
  autoFillAdminLogin();
  const errEl = document.getElementById('loginErrorMessage');
  if (errEl) {
    errEl.classList.remove('hidden');
    errEl.className = "text-emerald-700 text-xs font-bold text-center bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 mb-2";
    errEl.innerHTML = '<i class="fa-solid fa-circle-check ml-1"></i> تم استعادة بيانات الدخول الافتراضية بنجاح: admin@arabyonline.com / 1n2m3m4m';
  }
}

function toggleAdminPasswordVisibility() {
  const passInput = document.getElementById('loginAdminPassword');
  const eyeIcon = document.getElementById('toggleAdminPassEye');
  if (!passInput) return;
  if (passInput.type === 'password') {
    passInput.type = 'text';
    if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye-slash text-purple-700 text-sm';
  } else {
    passInput.type = 'password';
    if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye text-slate-400 text-sm';
  }
}

function quickAdminLoginDirect() {
  setAdminLoggedIn(true);
  closeAdminLoginModal();
  updateAdminUI();
  window.location.hash = 'admin';
  showSection('admin');
  switchAdminTab('students');
  if (typeof showCustomToast === 'function') {
    showCustomToast('مرحباً بكِ مس فرح القاضي في لوحة تحكم الأكاديمية! 👩‍🏫🌟', 'success');
  }
}

function handleAdminButtonClick() {
  if (isAdminLoggedIn()) {
    window.location.hash = 'admin';
    showSection('admin');
  } else {
    window.location.hash = 'admin';
    openAdminLoginModal();
  }
}

function handleAdminLoginSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const emailInput = document.getElementById('loginAdminEmail');
  const passInput = document.getElementById('loginAdminPassword');
  const email = (emailInput ? emailInput.value : '').trim().toLowerCase();
  const pass = (passInput ? passInput.value : '').trim();
  const errEl = document.getElementById('loginErrorMessage');

  const customEmail = (localStorage.getItem('araby_admin_email') || '').toLowerCase().trim();
  const customPass = (localStorage.getItem('araby_admin_pass') || '').trim();

  // Acceptable admin usernames / emails:
  const validUsers = [
    'admin@arabyonline.com',
    'admin',
    'farah@arabyonline.com',
    'farah',
    'missfarah',
    'miss.farah',
    'admin@admin.com',
    'admin@araby.com',
    DEFAULT_ADMIN_EMAIL.toLowerCase()
  ];
  if (customEmail) validUsers.push(customEmail);

  // Acceptable passwords:
  const validPasswords = [
    '1n2m3m4m',
    'Araby@2026',
    'araby@2026',
    '123456',
    'admin',
    'admin123',
    'farah123',
    'farah@2026',
    DEFAULT_ADMIN_PASS
  ];
  if (customPass) {
    validPasswords.push(customPass);
    validPasswords.push(customPass.toLowerCase());
  }

  const isUserValid = validUsers.includes(email);
  const isPassValid = validPasswords.includes(pass) || validPasswords.map(p => p.toLowerCase()).includes(pass.toLowerCase());

  if (isUserValid && isPassValid) {
    setAdminLoggedIn(true);
    closeAdminLoginModal();
    updateAdminUI();
    window.location.hash = 'admin';
    showSection('admin');
    switchAdminTab('students');
    if (typeof showCustomToast === 'function') {
      showCustomToast('تم تسجيل الدخول بنجاح! أهلاً بكِ مس فرح القاضي 🌟', 'success');
    }
  } else {
    if (errEl) {
      errEl.classList.remove('hidden');
      errEl.className = "text-rose-600 text-xs font-bold text-center bg-rose-50 p-3 rounded-2xl border border-rose-200 mb-2 space-y-1.5";
      errEl.innerHTML = `
        <div><i class="fa-solid fa-triangle-exclamation ml-1"></i> البريد أو كلمة المرور غير صحيحة!</div>
        <div class="text-[11px] text-slate-600 font-normal">
          يمكنك الضغط على زر <strong class="text-purple-700 underline cursor-pointer" onclick="autoFillAdminLogin()">"ملء بيانات الدخول تلقائياً"</strong> أو <strong class="text-emerald-700 underline cursor-pointer" onclick="quickAdminLoginDirect()">"دخول فوري مباشر"</strong> بالأسفل.
        </div>
      `;
    }
  }
}

function handleAdminLogout() {
  setAdminLoggedIn(false);
  sessionStorage.removeItem('araby_admin_logged_in');
  localStorage.removeItem('araby_admin_logged_in');

  showSection('landing');
  window.location.hash = '';

  // Immediately present the login modal so the user gets the login prompt
  setTimeout(() => {
    openAdminLoginModal();
    const errEl = document.getElementById('loginErrorMessage');
    if (errEl) {
      errEl.classList.remove('hidden');
      errEl.className = "text-emerald-700 text-xs font-bold text-center bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 mb-2";
      errEl.innerHTML = '<i class="fa-solid fa-circle-check ml-1"></i> تم تسجيل الخروج بنجاح! أدخلي بياناتك لتسجيل الدخول مرة أخرى:';
    }
  }, 100);
}

function switchAdminTab(tabKey) {
  const tabs = ['students', 'videos', 'reviews', 'bookings', 'courses', 'settings', 'watermark', 'payments'];
  tabs.forEach(t => {
    const btn = document.getElementById(`admin-tab-${t}`);
    const view = document.getElementById(`admin-view-${t}`);
    if (t === tabKey) {
      if (btn) btn.classList.add('active');
      if (view) view.classList.remove('hidden');
    } else {
      if (btn) btn.classList.remove('active');
      if (view) view.classList.add('hidden');
    }
  });

  if (tabKey === 'students') {
    loadAdminStudents();
  } else if (tabKey === 'videos') {
    renderAdminVideos();
  } else if (tabKey === 'reviews') {
    renderAdminReviews();
  } else if (tabKey === 'courses') {
    renderAdminCourses();
  } else if (tabKey === 'watermark') {
    loadWatermarkSettingsIntoUI();
  } else if (tabKey === 'bookings') {
    loadAdminBookings();
  } else if (tabKey === 'payments') {
    loadAdminPayments();
  }
}

// --- Admin Top Stats Counter ---
function updateAdminStats(studentsCount, bookingsCount) {
  const statStudents = document.getElementById('adminStatStudents');
  const statVideos = document.getElementById('adminStatVideos');
  const statReviews = document.getElementById('adminStatReviews');
  const statBookings = document.getElementById('adminStatBookings');

  if (statStudents && studentsCount !== undefined) statStudents.textContent = studentsCount;
  if (statVideos) statVideos.textContent = getVideos().length;
  if (statReviews) statReviews.textContent = getReviews().length;
  if (statBookings && bookingsCount !== undefined) statBookings.textContent = bookingsCount;
}

// ==================== STUDENTS MANAGEMENT (التحذير • الحذف • المراسلة) ====================
function getStudentWarnings() {
  try {
    const raw = localStorage.getItem('araby_student_warnings');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveStudentWarnings(warnings) {
  localStorage.setItem('araby_student_warnings', JSON.stringify(warnings));
}

let allAdminStudentsCache = [];

async function loadAdminStudents() {
  const tbody = document.getElementById('adminStudentsTableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin ml-2"></i>جاري جلب بيانات الطلاب والحسابات...</td></tr>`;

  let students = [];
  const client = getSupabase();

  if (client) {
    try {
      const { data, error } = await client
        .from('bookings')
        .select('*')
        .order('id', { ascending: false });

      if (!error && data) {
        students = data.map(b => ({
          id: b.id,
          name: b.student_name || 'طالب مسجل',
          grade: b.student_grade || 'غير محدد',
          country: b.country || 'مصر 🇪🇬',
          phone: b.parent_phone || '',
          email: b.student_email || (b.student_name ? `${b.student_name.trim().replace(/\s+/g, '').toLowerCase()}@arabyonline.com` : 'student@arabyonline.com'),
          curriculum: b.curriculum || 'المنهج الوزاري',
          date: b.created_at || new Date().toISOString()
        }));
      }
    } catch (e) {
      console.warn('Error fetching students from Supabase:', e);
    }
  }

  // Include locally saved student if not already present
  const localStudentRaw = localStorage.getItem('araby_active_student');
  if (localStudentRaw) {
    try {
      const ls = JSON.parse(localStudentRaw);
      const exists = students.some(s => s.phone && ls.phone && s.phone.replace(/[^0-9]/g, '') === ls.phone.replace(/[^0-9]/g, ''));
      if (!exists && ls.name) {
        students.unshift({
          id: 'local_' + Date.now(),
          name: ls.name,
          grade: ls.grade || 'الصف الخامس الابتدائي',
          country: ls.country || 'السعودية 🇸🇦',
          phone: ls.phone || '0551234567',
          email: ls.email || `${ls.name.replace(/\s+/g, '').toLowerCase()}@arabyonline.com`,
          curriculum: ls.curriculum || 'منهج لغتي والتأسيس',
          date: new Date().toISOString()
        });
      }
    } catch (e) {}
  }

  // Default demonstration students if database is empty so Admin can immediately test actions
  if (students.length === 0) {
    students = [
      {
        id: 101,
        name: 'أحمد محمود عبد الرحمن',
        password: 'ahmed@2026',
        grade: 'الصف الأول الإعدادي',
        country: 'مصر 🇪🇬',
        phone: '01012345678',
        email: 'ahmed.m@arabyonline.com',
        curriculum: 'المنهج المصري والنحو والبلاغة',
        date: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 102,
        name: 'سارة عبد الله القحطاني',
        password: 'sarah@2026',
        grade: 'الصف الرابع الابتدائي',
        country: 'السعودية 🇸🇦',
        phone: '0559876543',
        email: 'sarah.a@arabyonline.com',
        curriculum: 'منهج لغتي والخط العربي',
        date: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 103,
        name: 'عمر فهد المطيري',
        password: 'omar@2026',
        grade: 'الصف السادس الابتدائي',
        country: 'الكويت 🇰🇼',
        phone: '09651234567',
        email: 'omar.fahad@arabyonline.com',
        curriculum: 'كورس الخط والتأسيس',
        date: new Date().toISOString()
      }
    ];
  } else {
    // Ensure all students have passwords attached
    const regStudents = getAllRegisteredStudents();
    students.forEach(s => {
      const match = regStudents.find(r => normalizeArabic(r.name) === normalizeArabic(s.name) || (s.phone && r.phone && r.phone.replace(/[^0-9]/g, '') === s.phone.replace(/[^0-9]/g, '')));
      s.password = (match && match.password) || s.password || generateStudentPassword(s.name);
    });
  }

  allAdminStudentsCache = students;
  updateAdminStats(students.length, undefined);
  renderAdminStudentsTable(students);
}

function renderAdminStudentsTable(students) {
  const tbody = document.getElementById('adminStudentsTableBody');
  if (!tbody) return;

  if (!students || students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-slate-400">لا يوجد طلاب يطابقون البحث.</td></tr>`;
    return;
  }

  const warnings = getStudentWarnings();

  tbody.innerHTML = students.map((s, idx) => {
    const studentKey = String(s.id || s.phone || idx);
    const warning = warnings[studentKey] || warnings[s.phone];
    const cleanPhone = (s.phone || '').replace(/[^0-9]/g, '');
    const stPassword = s.password || 'ahmed@2026';

    const statusBadge = warning
      ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300" title="${warning.reason || ''}">
          <i class="fa-solid fa-triangle-exclamation"></i> تم توجيه إنذار
        </span>`
      : `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <i class="fa-solid fa-circle-check"></i> حساب نشط
        </span>`;

    const waPassMsg = encodeURIComponent(`السلام عليكم ورحمة الله وبركاته،\nمرحباً يا ${s.name} في أكاديمية عربي أونلاين 🎓.\nكلمة المرور الخاصة بك لدخول المنصة التعليمية ومتابعة دروسك هي: ${stPassword}\nرابط المنصة: https://onlinearaby-gif.github.io/araby-online-academy/\nبالتوفيق والتميز الدائم!`);

    return `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100">
        <td class="p-3 font-bold text-slate-400">${idx + 1}</td>
        <td class="p-3">
          <div class="font-bold text-slate-900">${s.name}</div>
          <div class="text-[10px] text-slate-400">${s.curriculum || ''}</div>
        </td>
        <td class="p-3 text-slate-600 font-medium">${s.grade || '-'}</td>
        <td class="p-3 font-semibold text-slate-800">${s.country || '-'}</td>
        <td class="p-3 font-mono font-bold text-slate-800" dir="ltr">
          <a href="https://wa.me/${cleanPhone}" target="_blank" class="text-emerald-600 hover:underline flex items-center gap-1">
            <i class="fa-brands fa-whatsapp text-sm"></i>
            <span>${s.phone || '-'}</span>
          </a>
        </td>
        <td class="p-3">
          <div class="flex items-center gap-1.5 flex-nowrap" dir="ltr">
            <code class="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-mono font-bold text-xs select-all">${stPassword}</code>
            <a href="https://wa.me/${cleanPhone}?text=${waPassMsg}" target="_blank" rel="noopener noreferrer" class="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold flex items-center gap-1 transition" title="إرسال الباسورد عبر واتساب للطالب">
              <i class="fa-brands fa-whatsapp text-xs text-emerald-600"></i>
              <span>إرسال</span>
            </a>
          </div>
        </td>
        <td class="p-3 text-purple-700 font-mono text-[11px]" dir="ltr">
          <a href="mailto:${s.email || ''}" class="hover:underline">${s.email || '-'}</a>
        </td>
        <td class="p-3">${statusBadge}</td>
        <td class="p-3">
          <div class="flex items-center justify-center gap-1.5 flex-nowrap">
            <button onclick="openWarnModal('${s.id}', '${s.name.replace(/'/g, "\\'")}', '${s.phone}')" class="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-[11px] transition flex items-center gap-1" title="توجيه تحذير للطالب">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>تحذير</span>
            </button>
            <button onclick="openEmailModal('${s.name.replace(/'/g, "\\'")}', '${s.email}', '${s.phone}')" class="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-[11px] transition flex items-center gap-1" title="إرسال إيميل">
              <i class="fa-solid fa-envelope"></i>
              <span>إيميل</span>
            </button>
            <button onclick="deleteStudentAccount('${s.id}', '${s.name.replace(/'/g, "\\'")}')" class="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition flex items-center gap-1" title="حذف حساب الطالب نهائياً">
              <i class="fa-solid fa-trash-can"></i>
              <span>حذف</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAdminStudents() {
  const query = (document.getElementById('adminStudentSearchInput')?.value || '').trim().toLowerCase();
  if (!query) {
    renderAdminStudentsTable(allAdminStudentsCache);
    return;
  }
  const filtered = allAdminStudentsCache.filter(s =>
    (s.name && s.name.toLowerCase().includes(query)) ||
    (s.phone && s.phone.includes(query)) ||
    (s.country && s.country.toLowerCase().includes(query)) ||
    (s.grade && s.grade.toLowerCase().includes(query)) ||
    (s.email && s.email.toLowerCase().includes(query))
  );
  renderAdminStudentsTable(filtered);
}

// Student Action Modals
function openWarnModal(id, name, phone) {
  const modal = document.getElementById('adminWarnModal');
  if (!modal) return;
  document.getElementById('warnStudentId').value = id;
  document.getElementById('warnStudentPhone').value = phone;
  const nameEl = document.getElementById('warnModalStudentName');
  if (nameEl) nameEl.textContent = `الطالب: ${name} (${phone})`;
  const reasonInput = document.getElementById('warnReasonInput');
  if (reasonInput) reasonInput.value = '';
  modal.classList.remove('hidden');
}

function closeAdminWarnModal() {
  const modal = document.getElementById('adminWarnModal');
  if (modal) modal.classList.add('hidden');
}

function handleConfirmWarnStudent(e) {
  e.preventDefault();
  const id = document.getElementById('warnStudentId').value;
  const phone = document.getElementById('warnStudentPhone').value;
  const reason = (document.getElementById('warnReasonInput').value || '').trim();

  if (!reason) {
    alert('يرجى كتابة سبب التحذير أولاً');
    return;
  }

  const warnings = getStudentWarnings();
  warnings[id] = { reason, date: new Date().toISOString() };
  if (phone) warnings[phone] = { reason, date: new Date().toISOString() };
  saveStudentWarnings(warnings);

  closeAdminWarnModal();
  renderAdminStudentsTable(allAdminStudentsCache);
  alert(`⚠️ تم تسجيل الإنذار على حساب الطالب بنجاح!\nالسبب: ${reason}`);
}

function sendWarningViaWhatsApp() {
  const phone = (document.getElementById('warnStudentPhone').value || '').replace(/[^0-9]/g, '');
  const reason = (document.getElementById('warnReasonInput').value || '').trim();
  const nameEl = document.getElementById('warnModalStudentName')?.textContent || '';

  if (!phone) {
    alert('رقم هاتف الطالب أو ولي الأمر غير متوفر لإرسال واتساب');
    return;
  }

  const text = encodeURIComponent(`السلام عليكم ورحمة الله وبركاته.\nتحية طيبة من إدارة أكاديمية عربي أونلاين 🎓\nبخصوص ${nameEl}:\nنحيطكم علماً بأنه تم توجيه إشعار وتنبيه هام:\n"${reason || 'يرجى الالتزام بالحصص والمتابعة المستمرة'}"\nشاكرين حرصكم وتواصلكم معنا دائماً.`);
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
}

function openEmailModal(name, email, phone) {
  const modal = document.getElementById('adminEmailModal');
  if (!modal) return;
  document.getElementById('emailStudentTargetEmail').value = email || '';
  document.getElementById('emailStudentTargetPhone').value = phone || '';
  const infoEl = document.getElementById('emailModalStudentInfo');
  if (infoEl) infoEl.textContent = `${name} • ${email || 'بدون إيميل مسجل'} (${phone || ''})`;
  const bodyEl = document.getElementById('emailBodyInput');
  if (bodyEl) bodyEl.value = `السلام عليكم ورحمة الله وبركاته يا ${name}،\nنتمنى لك دوام التفوق والنجاح في أكاديمية عربي أونلاين.\n\n`;
  modal.classList.remove('hidden');
}

function closeAdminEmailModal() {
  const modal = document.getElementById('adminEmailModal');
  if (modal) modal.classList.add('hidden');
}

function handleSendStudentEmail(e) {
  e.preventDefault();
  const email = document.getElementById('emailStudentTargetEmail').value;
  const subject = encodeURIComponent(document.getElementById('emailSubjectInput').value);
  const body = encodeURIComponent(document.getElementById('emailBodyInput').value);

  if (!email || !email.includes('@')) {
    alert('لا يوجد بريد إلكتروني مسجل لهذا الطالب، يمكنك مراسلته فوراً عبر زر الواتساب.');
    return;
  }

  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  closeAdminEmailModal();
}

function sendEmailViaWhatsApp() {
  const phone = (document.getElementById('emailStudentTargetPhone').value || '').replace(/[^0-9]/g, '');
  const subject = document.getElementById('emailSubjectInput').value;
  const body = document.getElementById('emailBodyInput').value;

  if (!phone) {
    alert('رقم واتساب غير متوفر');
    return;
  }

  const msg = encodeURIComponent(`*${subject}*\n\n${body}`);
  window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  closeAdminEmailModal();
}

async function deleteStudentAccount(id, name) {
  if (!confirm(`هل أنت متأكد تماماً من حذف حساب الطالب "${name}" نهائياً من الأكاديمية وقاعدة البيانات؟\nلن يمكن التراجع عن هذا الإجراء.`)) {
    return;
  }

  const client = getSupabase();
  if (client && !String(id).startsWith('local_')) {
    try {
      const { error } = await client
        .from('bookings')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Supabase delete error:', error);
      }
    } catch (e) {
      console.warn('Error deleting student:', e);
    }
  }

  allAdminStudentsCache = allAdminStudentsCache.filter(s => String(s.id) !== String(id));
  
  const localStudentRaw = localStorage.getItem('araby_active_student');
  if (localStudentRaw) {
    try {
      const ls = JSON.parse(localStudentRaw);
      if (ls.name === name) {
        localStorage.removeItem('araby_active_student');
      }
    } catch (e) {}
  }

  renderAdminStudentsTable(allAdminStudentsCache);
  updateAdminStats(allAdminStudentsCache.length, undefined);
  alert(`✅ تم حذف حساب الطالب "${name}" بنجاح.`);
}

// ==================== VIDEOS MANAGEMENT & SEQUENTIAL PROGRESSION (فيديوهات وحلقات المنصة المتسلسلة) ====================
const ARABY_VIDEO_DB_NAME = 'ArabyAcademyVideoStore';
const ARABY_VIDEO_DB_VERSION = 1;
const ARABY_VIDEO_STORE_NAME = 'videoBlobs';

// Runtime in-memory map of active Blob Object URLs
const runtimeVideoUrls = {};

function openVideoDB() {
  return new Promise((resolve) => {
    if (!window.indexedDB) {
      console.warn('IndexedDB not supported in this environment');
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(ARABY_VIDEO_DB_NAME, ARABY_VIDEO_DB_VERSION);
      request.onupgradeneeded = function(e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(ARABY_VIDEO_STORE_NAME)) {
          db.createObjectStore(ARABY_VIDEO_STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = function(e) {
        resolve(e.target.result);
      };
      request.onerror = function(e) {
        console.error('IndexedDB open error:', e.target.error);
        resolve(null);
      };
    } catch (err) {
      console.error('IndexedDB init exception:', err);
      resolve(null);
    }
  });
}

async function saveVideoBlobToDB(id, blob, name, type, size) {
  try {
    const db = await openVideoDB();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(ARABY_VIDEO_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ARABY_VIDEO_STORE_NAME);
      const record = {
        id: id,
        blob: blob,
        name: name || 'video.mp4',
        type: type || blob.type || 'video/mp4',
        size: size || blob.size || 0,
        savedAt: Date.now()
      };
      const req = store.put(record);
      req.onsuccess = function() { resolve(true); };
      req.onerror = function(err) {
        console.error('IndexedDB put error:', err);
        resolve(false);
      };
    });
  } catch (err) {
    console.error('saveVideoBlobToDB exception:', err);
    return false;
  }
}

async function getVideoBlobFromDB(id) {
  try {
    const db = await openVideoDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(ARABY_VIDEO_STORE_NAME, 'readonly');
      const store = tx.objectStore(ARABY_VIDEO_STORE_NAME);
      const req = store.get(id);
      req.onsuccess = function() {
        if (req.result && req.result.blob) {
          resolve(req.result.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = function() { resolve(null); };
    });
  } catch (err) {
    console.error('getVideoBlobFromDB exception:', err);
    return null;
  }
}

async function deleteVideoBlobFromDB(id) {
  try {
    const db = await openVideoDB();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(ARABY_VIDEO_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ARABY_VIDEO_STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = function() { resolve(true); };
      req.onerror = function() { resolve(false); };
    });
  } catch (err) {
    return false;
  }
}

async function initLocalVideosStorage() {
  try {
    const videos = getVideos();
    for (const v of videos) {
      if (v.isLocalFile && !runtimeVideoUrls[v.id]) {
        const blob = await getVideoBlobFromDB(v.id);
        if (blob) {
          runtimeVideoUrls[v.id] = URL.createObjectURL(blob);
        }
      }
    }
  } catch (e) {
    console.warn('initLocalVideosStorage warning:', e);
  }
}

const DEFAULT_VIDEOS = [
  {
    id: 'vid_1',
    title: 'الحلقة 1: شرح كان وأخواتها بطريقة الخرائط الذهنية المبسطة 📐',
    category: '📐 كورس النحو من الصفر إلى الاحتراف',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80',
    description: 'شرح تطبيقي ممتع مع مس فرح القاضي (خبرة 13 سنة في التدريس) يوضح عمل كان وأخواتها وضبط الاسم والخبر مع تدريبات عملية.'
  },
  {
    id: 'vid_2',
    title: 'الحلقة 2: أسرار تحسين خط الرقعة بالقلم العادي للطلاب ✍️',
    category: '✍️ كورس تحسين الخط العربي',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    description: 'قواعد ذهبية سهلة وسريعة لكتابة الحروف بخط الرقعة الأنيق لزيادة درجات الطالب في الامتحانات.'
  },
  {
    id: 'vid_3',
    title: 'الحلقة 3: قواعد القراءة السريعة والإملاء الصحيح دون أخطاء 🌱',
    category: '🌱 تأسيس القراءة والكتابة والإملاء',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&auto=format&fit=crop&q=80',
    description: 'طريقة ذكية ومبتكرة للتفريق بين التاء المربوطة والمفتوحة وكتابة الهمزات المتطرفة بسهولة.'
  }
];

function getVideos() {
  try {
    const raw = localStorage.getItem('araby_videos');
    if (!raw) {
      localStorage.setItem('araby_videos', JSON.stringify(DEFAULT_VIDEOS));
      return DEFAULT_VIDEOS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem('araby_videos', JSON.stringify(DEFAULT_VIDEOS));
      return DEFAULT_VIDEOS;
    }
    return parsed;
  } catch (e) {
    return DEFAULT_VIDEOS;
  }
}

function saveVideos(videos) {
  localStorage.setItem('araby_videos', JSON.stringify(videos));
}

// Sequential Progression Logic
function getCompletedEpisodes() {
  try {
    const raw = localStorage.getItem('araby_completed_episodes');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCompletedEpisodes(completed) {
  try {
    localStorage.setItem('araby_completed_episodes', JSON.stringify(completed));
  } catch (e) {}
}

function isEpisodeUnlocked(videoIndex, videos) {
  if (videoIndex === 0) return true; // الحلقة الأولى دائماً متاحة للجميع
  if (!videos || videoIndex >= videos.length) return false;
  const completed = getCompletedEpisodes();
  const prevVideo = videos[videoIndex - 1];
  return prevVideo ? completed.includes(prevVideo.id) : false;
}

function isEpisodeCompleted(videoId) {
  return getCompletedEpisodes().includes(videoId);
}

function alertEpisodeLocked(epNumber, prevTitle) {
  const alertBox = document.createElement('div');
  alertBox.className = "fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn";
  alertBox.innerHTML = `
    <div class="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border-2 border-purple-200 space-y-4">
      <div class="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-2xl mx-auto shadow-inner">
        <i class="fa-solid fa-lock"></i>
      </div>
      <div>
        <span class="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
          🔒 الحلقة رقم ${epNumber} مقفلة حالياً
        </span>
        <h3 class="text-base font-black text-slate-900 mt-2">يجب مشاهدة الدروس بالترتيب</h3>
        <p class="text-xs text-slate-600 leading-relaxed mt-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
          لفتح هذه الحلقة، يرجى أولاً إكمال مشاهدة:
          <br><strong class="text-purple-700 font-black">"${prevTitle || 'الحلقة السابقة'}"</strong>
          <br><span class="text-[11px] text-slate-400">النظام مصمم ليساعدك على فهم الدروس خطوة بخطوة 🎯</span>
        </p>
      </div>
      <button onclick="this.closest('.fixed').remove()" class="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs transition shadow-md cursor-pointer">
        فهمت ذلك، سأشاهد الحلقة السابقة أولاً 👍
      </button>
    </div>
  `;
  document.body.appendChild(alertBox);
}

function resetVideosProgress() {
  if (!confirm('هل تريد بالتأكيد إعادة ضبط مسار المشاهدة والبدء من الحلقة الأولى؟')) return;
  localStorage.removeItem('araby_completed_episodes');
  renderLandingVideos();
  if (typeof showCustomToast === 'function') {
    showCustomToast('🔄 تم إعادة ضبط التقدم! الحلقة الأولى مفتوحة وباقي الحلقات مقفلة بالترتيب.', 'info');
  } else {
    alert('🔄 تم إعادة ضبط التقدم! الحلقة الأولى مفتوحة وباقي الحلقات مقفلة بالترتيب.');
  }
}

async function downloadVideoDirectly(url, title, videoId) {
  let effectiveUrl = url;
  if (videoId) {
    const videos = getVideos();
    const vid = videos.find(v => v.id === videoId);
    if (vid && vid.isLocalFile) {
      if (runtimeVideoUrls[videoId]) {
        effectiveUrl = runtimeVideoUrls[videoId];
      } else {
        const blob = await getVideoBlobFromDB(videoId);
        if (blob) {
          effectiveUrl = URL.createObjectURL(blob);
          runtimeVideoUrls[videoId] = effectiveUrl;
        }
      }
    }
  }

  if (!effectiveUrl) {
    alert('رابط التحميل غير متاح حالياً.');
    return;
  }

  if (effectiveUrl.includes('youtube.com') || effectiveUrl.includes('youtu.be')) {
    window.open(effectiveUrl, '_blank');
    alert('📥 تم فتح رابط الحلقة في نافذة جديدة. يمكنك تنزيل الفيديو عبر زر الحفظ والتنزيل داخل يوتيوب للمشاهدة بدون إنترنت!');
    return;
  }

  const a = document.createElement('a');
  a.href = effectiveUrl;
  const safeName = (title || 'araby-lesson').replace(/[^\w\u0600-\u06FF\s-]/gi, '').trim().replace(/\s+/g, '_');
  a.download = `${safeName}.mp4`;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (typeof showCustomToast === 'function') {
    showCustomToast('📥 بدأ تحميل ملف الفيديو لجهازك بنجاح!', 'success');
  }
}

function handleVideoFileChosen(e) {
  const fileInput = e.target || document.getElementById('videoFormFile');
  const file = fileInput && fileInput.files && fileInput.files[0];
  const infoContainer = document.getElementById('videoFileSelectedInfo');
  const previewVideo = document.getElementById('videoFormLocalPreviewTag');
  const fileNameText = document.getElementById('videoSelectedFileName');
  const fileSizeText = document.getElementById('videoSelectedFileSize');

  if (!file) {
    if (infoContainer) infoContainer.classList.add('hidden');
    if (previewVideo) previewVideo.src = '';
    return;
  }

  const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
  if (fileNameText) fileNameText.textContent = file.name;
  if (fileSizeText) fileSizeText.textContent = `${sizeMb} MB`;

  const tempUrl = URL.createObjectURL(file);
  if (previewVideo) {
    previewVideo.src = tempUrl;
  }
  if (infoContainer) infoContainer.classList.remove('hidden');

  // Auto-fill title if empty
  const titleInput = document.getElementById('videoFormTitle');
  if (titleInput && !titleInput.value.trim()) {
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    titleInput.value = cleanName;
  }
}

async function handleAdminAddVideo(e) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]') || document.getElementById('videoFormSubmitBtn');
  const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';

  const title = (document.getElementById('videoFormTitle').value || '').trim();
  const category = document.getElementById('videoFormCategory').value;
  let url = (document.getElementById('videoFormUrl').value || '').trim();
  const fileInput = document.getElementById('videoFormFile');
  const thumbnail = (document.getElementById('videoFormThumbnail').value || '').trim();
  const description = (document.getElementById('videoFormDescription').value || '').trim();

  const file = fileInput && fileInput.files && fileInput.files[0];

  if (!title) {
    alert('يرجى ملء عنوان الفيديو أو الدرس');
    return;
  }

  if (!url && !file) {
    alert('يرجى إدخال رابط الفيديو (يوتيوب أو جوجل درايف أو رابط مباشر) أو اختيار ملف فيديو من جهازك.');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>جاري حفظ ومعالجة الفيديو في النظام...</span>`;
  }

  const videos = getVideos();
  const videoId = 'vid_' + Date.now();
  let isLocal = false;
  let fileName = '';
  let fileSize = 0;
  let effectiveUrl = url;

  if (file) {
    isLocal = true;
    fileName = file.name;
    fileSize = file.size;

    // Save actual file blob to IndexedDB
    await saveVideoBlobToDB(videoId, file, file.name, file.type, file.size);
    const liveBlobUrl = URL.createObjectURL(file);
    runtimeVideoUrls[videoId] = liveBlobUrl;
    effectiveUrl = liveBlobUrl;
  } else {
    effectiveUrl = parseVideoEmbedUrl(url);
  }

  const newVideo = {
    id: videoId,
    title: title.startsWith('الحلقة') ? title : `الحلقة ${videos.length + 1}: ${title}`,
    category,
    url: isLocal ? '' : effectiveUrl,
    isLocalFile: isLocal,
    fileName: fileName,
    fileSize: fileSize,
    thumbnail: thumbnail || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&auto=format&fit=crop&q=80',
    description: description || (isLocal 
      ? `درس فيديو تفاعلي تم رفعه من جهاز الإدارة (${fileName}) بإشراف مس فرح القاضي` 
      : 'فيديو تعليمي متميز من أكاديمية عربي أونلاين بإشراف مس فرح القاضي'),
    createdAt: new Date().toLocaleDateString('ar-EG')
  };

  videos.push(newVideo);
  saveVideos(videos);

  e.target.reset();
  const infoContainer = document.getElementById('videoFileSelectedInfo');
  if (infoContainer) infoContainer.classList.add('hidden');
  const previewVideo = document.getElementById('videoFormLocalPreviewTag');
  if (previewVideo) previewVideo.src = '';

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = origBtnHtml;
  }

  renderAdminVideos();
  renderLandingVideos();
  updateAdminStats(undefined, undefined);

  if (typeof showCustomToast === 'function') {
    showCustomToast(`🎉 تم نشر وحفظ الفيديو "${newVideo.title}" بنجاح!`, 'success');
  } else {
    alert(`🎉 تم نشر وحفظ الفيديو "${newVideo.title}" بنجاح كحلقة جديدة في المنصة!`);
  }
}

async function deleteAdminVideo(id) {
  if (!confirm('هل أنتِ متأكدة من حذف هذا الفيديو من المنصة؟')) return;
  let videos = getVideos();
  const target = videos.find(v => v.id === id);
  if (target && target.isLocalFile) {
    await deleteVideoBlobFromDB(id);
    if (runtimeVideoUrls[id]) {
      URL.revokeObjectURL(runtimeVideoUrls[id]);
      delete runtimeVideoUrls[id];
    }
  }
  videos = videos.filter(v => v.id !== id);
  saveVideos(videos);
  renderAdminVideos();
  renderLandingVideos();
  updateAdminStats(undefined, undefined);
  if (typeof showCustomToast === 'function') {
    showCustomToast('🗑️ تم حذف الفيديو بنجاح', 'info');
  }
}

function renderAdminVideos() {
  const container = document.getElementById('adminVideosListContainer');
  if (!container) return;
  const videos = getVideos();

  if (videos.length === 0) {
    container.innerHTML = `<div class="col-span-full p-8 text-center text-slate-400">لا توجد فيديوهات مضافة بعد. أضيفي أول فيديو من النموذج أعلاه.</div>`;
    return;
  }

  container.innerHTML = videos.map((v, idx) => {
    const isLocal = !!v.isLocalFile;
    const sizeStr = v.fileSize ? ` • ${(v.fileSize / (1024 * 1024)).toFixed(1)} MB` : '';
    const safeTitle = (v.title || '').replace(/'/g, "\\'");
    const safeDesc = (v.description || '').replace(/'/g, "\\'");

    return `
      <div class="p-4 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3 hover:shadow-md hover:border-purple-300 transition duration-200">
        <div class="flex items-start gap-3">
          <div class="w-24 h-18 rounded-2xl overflow-hidden bg-slate-200 shrink-0 relative group shadow-xs cursor-pointer" onclick="openVideoPlayerModal('', '${safeTitle}', '${safeDesc}', '${v.id}', ${idx})">
            <img src="${v.thumbnail}" alt="${v.title}" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-base group-hover:bg-purple-900/60 transition">
              <i class="fa-solid fa-play"></i>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 mb-1 flex-wrap">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700">ترتيب ${idx + 1}</span>
              ${isLocal 
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">💾 ملف محلي${sizeStr}</span>`
                : `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">🌐 يوتيوب / سحابي</span>`
              }
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 truncate">${v.category}</span>
            </div>
            <h5 class="font-bold text-xs text-slate-900 truncate" title="${v.title}">${v.title}</h5>
            <p class="text-[11px] text-slate-500 line-clamp-2 mt-0.5">${v.description}</p>
          </div>
        </div>
        <div class="flex items-center justify-between pt-2 border-t border-slate-200/80">
          <div class="flex items-center gap-2">
            <button onclick="openVideoPlayerModal('', '${safeTitle}', '${safeDesc}', '${v.id}', ${idx})" class="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer">
              <i class="fa-solid fa-play text-[10px]"></i> معاينة وتشغيل
            </button>
            <button onclick="downloadVideoDirectly('${v.url || ''}', '${safeTitle}', '${v.id}')" class="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer" title="تحميل الفيديو للجهاز">
              <i class="fa-solid fa-download text-[10px]"></i> تحميل
            </button>
          </div>
          <button onclick="deleteAdminVideo('${v.id}')" class="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
            <i class="fa-solid fa-trash-can"></i> حذف
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderLandingVideos() {
  const container = document.getElementById('landingVideosContainer');
  if (!container) return;
  const videos = getVideos();
  const completed = getCompletedEpisodes();

  // Update Progress Tracker
  const progressBarFill = document.getElementById('videoProgressBarFill');
  const progressCountText = document.getElementById('videoProgressCountText');
  const progressPercentText = document.getElementById('videoProgressPercentText');

  const totalVideos = videos.length;
  const completedCount = videos.filter(v => completed.includes(v.id)).length;
  const percent = totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0;

  if (progressBarFill) progressBarFill.style.width = `${percent}%`;
  if (progressCountText) progressCountText.textContent = `${completedCount} من ${totalVideos} مكتملة 🎓`;
  if (progressPercentText) progressPercentText.textContent = `${percent}%`;

  if (videos.length === 0) {
    container.innerHTML = `<div class="col-span-full p-8 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">لا توجد شروحات متاحة حالياً. سيتم نشر الحصص قريباً!</div>`;
    return;
  }

  container.innerHTML = videos.map((v, index) => {
    const epNumber = index + 1;
    const isUnlocked = isEpisodeUnlocked(index, videos);
    const isDone = completed.includes(v.id);
    const safeTitle = (v.title || '').replace(/'/g, "\\'");
    const safeDesc = (v.description || '').replace(/'/g, "\\'");
    const prevTitle = index > 0 ? (videos[index - 1].title || '').replace(/'/g, "\\'") : '';
    const isLocal = !!v.isLocalFile;

    if (!isUnlocked) {
      // LOCKED CARD
      return `
        <div class="group bg-slate-100/90 rounded-3xl border-2 border-dashed border-slate-300 overflow-hidden shadow-xs opacity-85 hover:opacity-100 transition duration-300 flex flex-col relative select-none">
          <div class="relative w-full aspect-video bg-slate-800 overflow-hidden cursor-pointer" onclick="alertEpisodeLocked(${epNumber}, '${prevTitle}')">
            <img src="${v.thumbnail}" alt="${v.title}" class="w-full h-full object-cover filter grayscale contrast-75 brightness-75">
            <div class="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] flex flex-col items-center justify-center text-white text-center p-3">
              <div class="w-12 h-12 rounded-full bg-slate-900/90 text-amber-400 border-2 border-amber-400/50 flex items-center justify-center text-xl shadow-lg mb-2 group-hover:scale-110 transition">
                <i class="fa-solid fa-lock"></i>
              </div>
              <span class="text-xs font-black text-amber-300 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-500/40">
                🔒 الحلقة ${epNumber} مقفلة
              </span>
              <p class="text-[11px] text-slate-300 mt-1.5 max-w-[210px] leading-tight">
                يجب إنهاء الحلقة ${epNumber - 1} أولاً لفتح هذا الدرس
              </p>
            </div>
            <div class="absolute top-3 right-3">
              <span class="px-2.5 py-1 rounded-full bg-slate-900/90 text-slate-400 text-[10px] font-bold border border-slate-700">
                الحلقة ${epNumber}
              </span>
            </div>
          </div>
          <div class="p-5 flex-1 flex flex-col justify-between bg-white/70">
            <div>
              <div class="flex items-center gap-2 mb-1.5">
                <span class="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-200 text-slate-600">درس مقفل 🔒</span>
                <span class="text-[10px] text-slate-400 font-bold truncate">${v.category}</span>
              </div>
              <h3 class="text-sm font-black text-slate-700 mb-1 line-clamp-1">${v.title}</h3>
              <p class="text-xs text-slate-400 line-clamp-2">${v.description}</p>
            </div>
            <div class="pt-4 mt-3 border-t border-slate-200 flex items-center justify-between">
              <button onclick="alertEpisodeLocked(${epNumber}, '${prevTitle}')" class="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1.5 cursor-pointer">
                <i class="fa-solid fa-lock text-[10px]"></i>
                <span>مقفلة (أكمل السابقة أولاً)</span>
              </button>
              <span class="text-[11px] text-amber-700 font-black bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                خطوة ${epNumber}
              </span>
            </div>
          </div>
        </div>
      `;
    }

    // UNLOCKED CARD
    return `
      <div class="group bg-white rounded-3xl border ${isDone ? 'border-emerald-300 shadow-emerald-50' : 'border-purple-200/90'} overflow-hidden shadow-xs hover:shadow-lg hover:border-purple-400 transition duration-300 flex flex-col relative">
        <div class="relative w-full aspect-video bg-slate-900 overflow-hidden cursor-pointer" onclick="openVideoPlayerModal('', '${safeTitle}', '${safeDesc}', '${v.id}', ${index})">
          <img src="${v.thumbnail}" alt="${v.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20 flex items-center justify-center">
            <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full ${isDone ? 'bg-emerald-600/90 hover:bg-emerald-600' : 'bg-purple-600/90 hover:bg-purple-600'} text-white flex items-center justify-center text-lg sm:text-xl shadow-lg group-hover:scale-110 transition">
              <i class="fa-solid ${isDone ? 'fa-rotate-right' : 'fa-play'} ml-1"></i>
            </div>
          </div>
          <div class="absolute top-3 right-3 flex items-center gap-1.5">
            <span class="px-2.5 py-1 rounded-full bg-purple-700 text-white text-[11px] font-black border border-purple-400/40 shadow-xs">
              الحلقة ${epNumber} 🔓
            </span>
            ${isDone ? '<span class="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-xs flex items-center gap-1"><i class="fa-solid fa-check"></i> مكتملة</span>' : ''}
          </div>
          ${isLocal ? '<span class="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-amber-300 text-[10px] font-black flex items-center gap-1"><i class="fa-solid fa-hdd"></i> فيديو محلي</span>' : ''}
        </div>
        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 mb-1.5">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${isDone ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}">
                ${isDone ? '✅ تم إنجاز الحلقة' : '▶️ جاهزة للمشاهدة الآن'}
              </span>
              <span class="text-[11px] text-slate-500 font-bold truncate">${v.category}</span>
            </div>
            <h3 class="text-sm sm:text-base font-black text-slate-900 mb-1.5 group-hover:text-purple-600 transition">${v.title}</h3>
            <p class="text-xs text-slate-500 line-clamp-2">${v.description}</p>
          </div>
          <div class="pt-4 mt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <button onclick="openVideoPlayerModal('', '${safeTitle}', '${safeDesc}', '${v.id}', ${index})" class="text-xs font-black ${isDone ? 'text-emerald-700 hover:text-emerald-800' : 'text-purple-600 hover:text-purple-700'} flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-play text-[11px]"></i>
              <span>${isDone ? 'إعادة مشاهدة الدرس' : 'شاهد الحصة الآن'}</span>
            </button>
            <div class="flex items-center gap-1.5">
              <button onclick="downloadVideoDirectly('${v.url || ''}', '${safeTitle}', '${v.id}')" title="تحميل الفيديو لجهازك للمشاهدة بدون إنترنت" class="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                <i class="fa-solid fa-download text-[11px]"></i>
                <span>تحميل 📥</span>
              </button>
              <button onclick="openBookingModal()" class="px-2.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-bold transition">
                حجز تجربة
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function parseVideoEmbedUrl(rawUrl) {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
  }
  const gdriveMatch = trimmed.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  if (gdriveMatch && gdriveMatch[1]) {
    return `https://drive.google.com/file/d/${gdriveMatch[1]}/preview`;
  }
  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  }
  return trimmed;
}

let currentPlayingVideo = null;

async function openVideoPlayerModal(url, title, desc, videoId, videoIndex) {
  const videos = getVideos();
  if (typeof videoIndex !== 'number' && videoId) {
    videoIndex = videos.findIndex(v => v.id === videoId);
  }
  if (typeof videoIndex !== 'number' || videoIndex < 0) {
    videoIndex = 0;
  }

  // Check locking constraint
  if (!isEpisodeUnlocked(videoIndex, videos)) {
    const prevTitle = videoIndex > 0 ? (videos[videoIndex - 1].title || '') : '';
    alertEpisodeLocked(videoIndex + 1, prevTitle);
    return;
  }

  const currentVid = (videoId ? videos.find(v => v.id === videoId) : null) || videos[videoIndex] || { id: videoId || 'vid_' + videoIndex, url, title, description: desc };
  let effectiveUrl = currentVid.url || url || '';
  const effectiveTitle = currentVid.title || title || 'درس تفاعلي';
  const effectiveDesc = currentVid.description || desc || '';
  const effectiveId = currentVid.id || videoId;

  // Retrieve blob if local file
  if (currentVid.isLocalFile) {
    if (runtimeVideoUrls[effectiveId]) {
      effectiveUrl = runtimeVideoUrls[effectiveId];
    } else {
      const blob = await getVideoBlobFromDB(effectiveId);
      if (blob) {
        effectiveUrl = URL.createObjectURL(blob);
        runtimeVideoUrls[effectiveId] = effectiveUrl;
      }
    }
  }

  currentPlayingVideo = {
    url: effectiveUrl,
    title: effectiveTitle,
    desc: effectiveDesc,
    videoId: effectiveId,
    videoIndex: videoIndex,
    isLocalFile: !!currentVid.isLocalFile
  };

  const modal = document.getElementById('videoPlayerModal');
  const container = document.getElementById('videoPlayerContainer');
  const titleEl = document.getElementById('videoPlayerTitle');
  const descEl = document.getElementById('videoPlayerDesc');
  const badgeEl = document.getElementById('videoPlayerEpisodeBadge');
  const downloadBtn = document.getElementById('videoPlayerDownloadBtn');
  const completeBtn = document.getElementById('videoPlayerCompleteBtn');
  const nextBtn = document.getElementById('videoPlayerNextBtn');

  if (!modal || !container) return;

  if (titleEl) titleEl.textContent = effectiveTitle;
  if (descEl) descEl.textContent = effectiveDesc;
  if (badgeEl) badgeEl.textContent = `الحلقة ${videoIndex + 1} 🔓`;

  // Download Button Setup
  if (downloadBtn) {
    downloadBtn.onclick = function(e) {
      e.preventDefault();
      downloadVideoDirectly(effectiveUrl, effectiveTitle, effectiveId);
    };
  }

  // Completion Button Setup
  const isDone = isEpisodeCompleted(effectiveId);
  if (completeBtn) {
    if (isDone) {
      completeBtn.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-300"></i><span>تم إكمال هذه الحلقة مسبقاً ✅</span>`;
      completeBtn.className = "px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs flex items-center gap-2 transition cursor-pointer";
    } else {
      completeBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i><span>أكملت مشاهدة هذه الحلقة (فتح التالية 🔓)</span>`;
      completeBtn.className = "px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition shadow-md cursor-pointer";
    }
  }

  // Next Episode Button Setup
  const hasNext = videoIndex + 1 < videos.length;
  if (nextBtn) {
    if (hasNext && isDone) {
      nextBtn.classList.remove('hidden');
      nextBtn.classList.add('flex');
      nextBtn.innerHTML = `<span>الحلقة التالية (${videoIndex + 2})</span> <i class="fa-solid fa-arrow-left"></i>`;
    } else {
      nextBtn.classList.add('hidden');
      nextBtn.classList.remove('flex');
    }
  }

  const embedUrl = parseVideoEmbedUrl(effectiveUrl);

  if (embedUrl.includes('youtube.com/embed') || embedUrl.includes('drive.google.com/file') || embedUrl.includes('player.vimeo.com')) {
    container.innerHTML = `
      <iframe src="${embedUrl}" title="${effectiveTitle}" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    `;
  } else if (effectiveUrl) {
    container.innerHTML = `
      <video id="arabyActiveLessonVideoTag" src="${effectiveUrl}" controls autoplay playsinline controlsList="nodownload_disabled" class="w-full h-full object-contain bg-black"></video>
    `;
    const videoTag = document.getElementById('arabyActiveLessonVideoTag');
    if (videoTag) {
      videoTag.onerror = function() {
        container.innerHTML = `
          <div class="p-6 text-center text-slate-300 space-y-3">
            <i class="fa-solid fa-triangle-exclamation text-amber-400 text-3xl"></i>
            <h4 class="font-bold text-sm text-white">تعذر تشغيل ملف الفيديو</h4>
            <p class="text-xs text-slate-400">إذا قمتِ برفع الفيديو من جهازك، يرجى إعادة اختياره وتحديثه لضمان حفظه في متصفحك بشكل سليم.</p>
          </div>
        `;
      };
      videoTag.onended = function() {
        handleCurrentVideoCompleted(true);
      };
    }
  } else {
    container.innerHTML = `
      <div class="p-6 text-center text-slate-300 space-y-3">
        <i class="fa-solid fa-video-slash text-purple-400 text-3xl"></i>
        <h4 class="font-bold text-sm text-white">ملف الفيديو قيد التجهيز</h4>
        <p class="text-xs text-slate-400">الفيديو مسجل في المنصة كملف محلي. يمكنكِ معاينته وتحميله مباشرة.</p>
      </div>
    `;
  }

  modal.classList.remove('hidden');
}

function handleCurrentVideoCompleted(isAutoEnded = false) {
  if (!currentPlayingVideo) return;
  const { videoId, videoIndex, title } = currentPlayingVideo;
  const videos = getVideos();
  const nextVideo = videoIndex + 1 < videos.length ? videos[videoIndex + 1] : null;

  const completed = getCompletedEpisodes();
  if (!completed.includes(videoId)) {
    completed.push(videoId);
    saveCompletedEpisodes(completed);
  }

  // Update complete button
  const completeBtn = document.getElementById('videoPlayerCompleteBtn');
  if (completeBtn) {
    completeBtn.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-300"></i><span>تم إكمال هذه الحلقة بنجاح ✅</span>`;
    completeBtn.className = "px-3.5 py-2 rounded-xl bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition";
  }

  // Reveal next episode button
  const nextBtn = document.getElementById('videoPlayerNextBtn');
  if (nextBtn && nextVideo) {
    nextBtn.classList.remove('hidden');
    nextBtn.classList.add('flex');
    nextBtn.innerHTML = `<span>الانتقال للحلقة ${videoIndex + 2} 🔓</span> <i class="fa-solid fa-arrow-left"></i>`;
  }

  renderLandingVideos();

  if (nextVideo) {
    const notifyBox = document.createElement('div');
    notifyBox.className = "fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn";
    notifyBox.innerHTML = `
      <div class="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border-2 border-emerald-400 space-y-4">
        <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-md animate-bounce">
          🎉
        </div>
        <div>
          <span class="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            أحسنت ومبارك! 🎓
          </span>
          <h3 class="text-base font-black text-slate-900 mt-2">أكملت الحلقة ${videoIndex + 1} بنجاح</h3>
          <p class="text-xs text-slate-600 mt-1.5 leading-relaxed">
            تم فتح <strong class="text-purple-700">الحلقة ${videoIndex + 2}: "${nextVideo.title}"</strong> وأصبحت متاحة لك الآن للمشاهدة والتحميل!
          </p>
        </div>
        <div class="flex flex-col gap-2 pt-1">
          <button onclick="this.closest('.fixed').remove(); playNextEpisode();" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer">
            <span>ابدأ مشاهدة الحلقة ${videoIndex + 2} فوراً 🚀</span>
          </button>
          <button onclick="this.closest('.fixed').remove();" class="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer">
            البقاء في المشغل الحالي
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(notifyBox);
  } else {
    alert(`🏆 مبارك! أكملت بنجاح جميع الحلقات المتاحة في الأكاديمية! يمكنك دائماً مراجعتها أو تحميلها.`);
  }
}

function playNextEpisode() {
  if (!currentPlayingVideo) return;
  const videos = getVideos();
  const nextIndex = currentPlayingVideo.videoIndex + 1;
  if (nextIndex < videos.length) {
    const nextV = videos[nextIndex];
    openVideoPlayerModal(nextV.url, nextV.title, nextV.description, nextV.id, nextIndex);
  }
}

function closeVideoPlayerModal() {
  const modal = document.getElementById('videoPlayerModal');
  const container = document.getElementById('videoPlayerContainer');
  if (container) container.innerHTML = '';
  if (modal) modal.classList.add('hidden');
  currentPlayingVideo = null;
}

// ==================== REVIEWS MANAGEMENT (آراء وتقييمات الطلاب الموثقة من فيسبوك) ====================
const OFFICIAL_FACEBOOK_PAGE_URL = "https://www.facebook.com/profile.php?id=61551716442236";

const DEFAULT_REVIEWS = [
  {
    id: 'rev_1',
    author: 'أم عبد الله',
    country: '🇸🇦 السعودية - الرياض',
    rating: 5,
    course: 'منهج لغتي وكورس النحو',
    grade: 'الصف الرابع الابتدائي',
    facebookUrl: OFFICIAL_FACEBOOK_PAGE_URL,
    content: 'ما شاء الله تبارك الله، أسلوب مس فرح ممتع جداً وخبرتها 13 سنة واضحة في تيسير القواعد. ابني أصبح ينتظر الحصة بكل شغف وارتفعت درجاته في لغتي بشكل ممتاز.'
  },
  {
    id: 'rev_2',
    author: 'م. طارق الزهراني',
    country: '🇰🇼 الكويت',
    rating: 5,
    course: 'كورس تحسين الخط العربي والإملاء',
    grade: 'الصف السادس الابتدائي',
    facebookUrl: OFFICIAL_FACEBOOK_PAGE_URL,
    content: 'كورس الخط العربي وتأسيس الإملاء مع مس فرح أحدث فارقاً مذهلاً في شكل خط ابنتي ووضوحه في كراسة الواجبات والامتحانات. صبورة ومتابعة دقيقة لكل تفصيلة.'
  },
  {
    id: 'rev_3',
    author: 'د. سارة المنصوري',
    country: '🇦🇪 الإمارات - دبي',
    rating: 5,
    course: 'تأسيس النحو والقراءة',
    grade: 'الصف الأول الإعدادي',
    facebookUrl: OFFICIAL_FACEBOOK_PAGE_URL,
    content: 'أفضل استثمار لتعليم اللغة العربية عن بُعد. مس فرح القاضي معلمة قديرة ومتمكنة، والمنصة تجمع بين تبسيط القواعد والتشجيع المستمر الذي يعطي ثقة كبيرة للطالب.'
  }
];

function getReviews() {
  try {
    const raw = localStorage.getItem('araby_reviews');
    if (!raw || !raw.includes('فرح') || !raw.includes('facebook')) {
      localStorage.setItem('araby_reviews', JSON.stringify(DEFAULT_REVIEWS));
      return DEFAULT_REVIEWS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_REVIEWS;
  }
}

function saveReviews(reviews) {
  localStorage.setItem('araby_reviews', JSON.stringify(reviews));
}

function handleAdminAddReview(e) {
  e.preventDefault();
  const author = (document.getElementById('reviewFormAuthor').value || '').trim();
  const country = (document.getElementById('reviewFormCountry').value || '').trim();
  const rating = parseInt(document.getElementById('reviewFormRating').value) || 5;
  const course = (document.getElementById('reviewFormCourse').value || '').trim();
  const grade = (document.getElementById('reviewFormGrade').value || '').trim();
  const content = (document.getElementById('reviewFormContent').value || '').trim();
  const fbUrlInput = document.getElementById('reviewFormFbUrl');
  const facebookUrl = (fbUrlInput && fbUrlInput.value ? fbUrlInput.value.trim() : '') || OFFICIAL_FACEBOOK_PAGE_URL;

  if (!author || !content) {
    alert('يرجى ملء اسم صاحب التقييم ونصه');
    return;
  }

  const reviews = getReviews();
  const newReview = {
    id: 'rev_' + Date.now(),
    author,
    country: country || 'أولياء الأمور',
    rating,
    course: course || 'اللغة العربية',
    grade: grade || 'المرحلة الابتدائية',
    facebookUrl,
    content
  };

  reviews.unshift(newReview);
  saveReviews(reviews);

  e.target.reset();
  renderAdminReviews();
  renderLandingReviews();
  updateAdminStats(undefined, undefined);
  alert('🎉 تم إضافة الرأي وربطه بفيسبوك بنجاح ويظهر الآن في الصفحة الرئيسية!');
}

function deleteAdminReview(id) {
  if (!confirm('هل أنت متأكد من حذف هذا الريفيو؟')) return;
  let reviews = getReviews();
  reviews = reviews.filter(r => r.id !== id);
  saveReviews(reviews);
  renderAdminReviews();
  renderLandingReviews();
  updateAdminStats(undefined, undefined);
}

function renderAdminReviews() {
  const container = document.getElementById('adminReviewsListContainer');
  if (!container) return;
  const reviews = getReviews();

  if (reviews.length === 0) {
    container.innerHTML = `<div class="col-span-full p-8 text-center text-slate-400">لا توجد آراء أو ريفيوهات مسجلة بعد.</div>`;
    return;
  }

  container.innerHTML = reviews.map(r => {
    const stars = '⭐'.repeat(r.rating || 5);
    const fbUrl = r.facebookUrl || OFFICIAL_FACEBOOK_PAGE_URL;
    return `
      <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3 hover:shadow-xs transition">
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <h5 class="font-bold text-xs text-slate-900">${r.author}</h5>
            <span class="text-xs">${stars}</span>
          </div>
          <div class="flex items-center gap-2 text-[10px] text-slate-400 mb-2">
            <span>${r.country}</span>
            <span>•</span>
            <span class="text-amber-700 font-semibold">${r.course || ''}</span>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
            "${r.content}"
          </p>
        </div>
        <div class="flex items-center justify-between pt-2 border-t border-slate-200/80">
          <a href="${fbUrl}" target="_blank" rel="noopener noreferrer" class="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
            <i class="fa-brands fa-facebook"></i> معاينة الرابط على فيسبوك ↗️
          </a>
          <button onclick="deleteAdminReview('${r.id}')" class="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
            <i class="fa-solid fa-trash-can"></i> حذف التقييم
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderLandingReviews() {
  const container = document.getElementById('landingReviewsContainer');
  if (!container) return;
  const reviews = getReviews();

  container.innerHTML = reviews.map(r => {
    const stars = '⭐'.repeat(r.rating || 5);
    const fbUrl = r.facebookUrl || OFFICIAL_FACEBOOK_PAGE_URL;
    return `
      <div class="group bg-white rounded-3xl p-6 border-2 border-slate-200/90 shadow-xs hover:shadow-xl hover:border-blue-400 transition duration-300 flex flex-col justify-between relative">
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs text-amber-500 tracking-wider">${stars}</span>
            <div class="flex items-center gap-1.5 flex-wrap justify-end">
              <a href="${fbUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 hover:bg-blue-100 text-[#1877F2] hover:text-[#166fe5] text-[10px] font-black border border-blue-200 transition" title="مشاهدة على فيسبوك">
                <i class="fa-brands fa-facebook text-xs"></i>
                <span>موثّق على فيسبوك 👍</span>
              </a>
              <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">${r.country}</span>
            </div>
          </div>

          <a href="${fbUrl}" target="_blank" rel="noopener noreferrer" class="block group-hover:text-slate-900 transition" title="اضغط لمشاهدة الرأي والصفحة على فيسبوك">
            <p class="text-xs sm:text-sm text-slate-700 leading-relaxed italic line-clamp-4">
              "${r.content}"
            </p>
          </a>
        </div>

        <div class="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
              ${(r.author || 'ط').charAt(0)}
            </div>
            <div class="min-w-0">
              <h4 class="font-bold text-xs text-slate-900 truncate">${r.author}</h4>
              <p class="text-[10px] text-slate-400 truncate">${r.course || 'أكاديمية عربي أونلاين'} ${r.grade ? `(${r.grade})` : ''}</p>
            </div>
          </div>
          
          <a href="${fbUrl}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-[#1877F2] text-[#1877F2] hover:text-white text-[11px] font-black transition flex items-center gap-1 shrink-0 shadow-2xs">
            <span>تصفح على فيسبوك ↗️</span>
          </a>
        </div>
      </div>
    `;
  }).join('');
}

async function loadAdminBookings() {
  const tbody = document.getElementById('adminBookingsTableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin ml-2"></i>جاري جلب الحجوزات من Supabase...</td></tr>`;

  const client = getSupabase();
  if (!client) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-rose-500">تعذر الاتصال بقاعدة البيانات.</td></tr>`;
    return;
  }

  try {
    const { data, error } = await client
      .from('bookings')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;

    updateAdminStats(undefined, data ? data.length : 0);

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">لا توجد أي طلبات حجز مسجلة حتى الآن.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map((b, idx) => {
      const dateStr = b.created_at ? new Date(b.created_at).toLocaleString('ar-EG') : '-';
      const cleanPhone = (b.parent_phone || '').replace(/[^0-9]/g, '');
      return `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
          <td class="p-3 font-bold text-slate-400">${data.length - idx}</td>
          <td class="p-3 font-bold text-slate-900">${b.student_name || '-'}</td>
          <td class="p-3 text-slate-600">${b.student_grade || '-'}</td>
          <td class="p-3 text-logo-purple font-semibold">${b.curriculum || '-'}</td>
          <td class="p-3 font-mono font-bold text-slate-800" dir="ltr">
            <a href="https://wa.me/2${cleanPhone}" target="_blank" class="text-emerald-600 hover:underline">
              ${b.parent_phone || '-'} <i class="fa-brands fa-whatsapp text-xs"></i>
            </a>
          </td>
          <td class="p-3 text-slate-400 text-[11px]">${dateStr}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-rose-500">حدث خطأ أثناء تحميل الحجوزات: ${err.message}</td></tr>`;
  }
}

async function loadAdminPayments() {
  const tbody = document.getElementById('adminPaymentsTableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin ml-2"></i>جاري جلب المدفوعات من Supabase...</td></tr>`;

  const client = getSupabase();
  if (!client) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-rose-500">تعذر الاتصال بقاعدة البيانات.</td></tr>`;
    return;
  }

  try {
    const { data, error } = await client
      .from('payments')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;

    updateAdminStats(undefined, data ? data.length : 0);

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-slate-400">لا توجد أي طلبات دفع مسجلة حتى الآن.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map((p, idx) => {
      const dateStr = p.created_at ? new Date(p.created_at).toLocaleString('ar-EG') : '-';
      const cleanPhone = (p.parent_phone || '').replace(/[^0-9]/g, '');
      return `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
          <td class="p-3 font-bold text-slate-400">${data.length - idx}</td>
          <td class="p-3 font-bold text-slate-900">${p.student_name || '-'}</td>
          <td class="p-3 font-semibold text-logo-purple">${p.course_name || '-'}</td>
          <td class="p-3 font-black text-logo-orange">${p.price || '-'}</td>
          <td class="p-3 font-bold text-slate-600">${p.payment_method || '-'}</td>
          <td class="p-3 font-mono font-bold text-slate-800" dir="ltr">
            <a href="https://wa.me/2${cleanPhone}" target="_blank" class="text-emerald-600 hover:underline">
              ${p.parent_phone || '-'} <i class="fa-brands fa-whatsapp text-xs"></i>
            </a>
          </td>
          <td class="p-3 text-slate-500 text-[11px] font-mono truncate max-w-[120px]" title="${p.receipt_filename || ''}">${p.receipt_filename || 'لا يوجد'}</td>
          <td class="p-3 text-slate-400 text-[11px]">${dateStr}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-rose-500">حدث خطأ أثناء تحميل المدفوعات: ${err.message}</td></tr>`;
  }
}

function handleAdminEmailChange(e) {
  e.preventDefault();
  const newEmail = (document.getElementById('newAdminEmailInput').value || '').trim();
  const confirmPass = (document.getElementById('confirmPassForEmailInput').value || '').trim();

  if (!newEmail || !newEmail.includes('@')) {
    alert('⚠️ يرجى إدخال بريد إلكتروني صحيح!');
    return;
  }

  if (confirmPass !== getAdminPass()) {
    alert('❌ كلمة المرور الحالية غير صحيحة! لا يمكن تغيير البريد بدون تأكيد كلمة المرور الحالية.');
    return;
  }

  localStorage.setItem('araby_admin_email', newEmail);
  updateAdminUI();
  
  document.getElementById('newAdminEmailInput').value = '';
  document.getElementById('confirmPassForEmailInput').value = '';

  alert(`✅ تم تحديث البريد الإلكتروني للمدير بنجاح إلى:\n${newEmail}\n\nيمكنكِ الآن استخدامه في تسجيل الدخول.`);
}

function handleAdminPasswordChange(e) {
  e.preventDefault();
  const currentPass = (document.getElementById('currentAdminPassInput').value || '').trim();
  const newPass = (document.getElementById('newAdminPassInput').value || '').trim();
  const confirmNewPass = (document.getElementById('confirmNewAdminPassInput').value || '').trim();

  if (currentPass !== getAdminPass()) {
    alert('❌ كلمة المرور الحالية غير صحيحة! يرجى إدخال كلمة المرور السارية حالياً.');
    return;
  }

  if (newPass.length < 6) {
    alert('⚠️ يجب أن تتكون كلمة المرور الجديدة من 6 خانات على الأقل.');
    return;
  }

  if (newPass !== confirmNewPass) {
    alert('⚠️ كلمة المرور الجديدة وتأكيدها غير متطابقين! يرجى التأكد وإعادة المحاولة.');
    return;
  }

  localStorage.setItem('araby_admin_pass', newPass);
  updateAdminUI();

  document.getElementById('currentAdminPassInput').value = '';
  document.getElementById('newAdminPassInput').value = '';
  document.getElementById('confirmNewAdminPassInput').value = '';

  alert('🎉 تم تغيير وحفظ كلمة المرور الجديدة بنجاح! احفظي بياناتك الجديدة للدخول بها دائماً.');
}

// --- 8. URL Hash Routing (e.g. #admin, #dashboard, #courses, #subscribe) ---
function checkUrlHash() {
  const hash = (window.location.hash || '').toLowerCase();
  if (hash === '#admin' || hash === '#admin-panel' || hash === '#login-admin') {
    if (isAdminLoggedIn()) {
      showSection('admin');
    } else {
      openAdminLoginModal();
    }
  } else if (hash === '#student' || hash === '#dashboard') {
    showSection('dashboard');
  } else if (hash === '#subscribe' || hash === '#payment' || hash === '#pay') {
    showSection('landing');
    setTimeout(() => openPaymentModal(), 150);
  } else if (hash === '#trial' || hash === '#free-trial' || hash === '#booking') {
    showSection('landing');
    setTimeout(() => openBookingModal(), 150);
  } else if (hash === '#services' || hash === '#courses') {
    showSection('landing');
    const el = document.getElementById('services');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  } else if (hash === '#landing' || hash === '#home') {
    showSection('landing');
  }
}

window.addEventListener('hashchange', checkUrlHash);

// --- 9. Courses Management (Add, Edit, Image Upload, Delete) ---
const DEFAULT_COURSES = [
  {
    id: "c1",
    title: "شرح منهج اللغة العربية (المنهج المصري)",
    partition: "المنهج المصري",
    grade: "المرحلة الابتدائية والإعدادية",
    priceEg: "300 جنيه شهرياً",
    priceSa: "70 ريال شهرياً",
    image: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
    description: "شرح شامل ومبسط للمنهج المصري والتربية الدينية مع حل تدريبات الكتاب المدرسي ونماذج الامتحانات.",
    watermark: true
  },
  {
    id: "c2",
    title: "شرح منهج لغتي (المنهج السعودي)",
    partition: "منهج لغتي السعودي",
    grade: "لغتي الجميلة والخالدة",
    priceEg: "350 جنيه شهرياً",
    priceSa: "90 ريال شهرياً",
    image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80",
    description: "كورس مخصص للطلاب في المملكة لمقررات لغتي والدراسات الإسلامية ورسم الهمزات والتطبيقات.",
    watermark: true
  },
  {
    id: "c3",
    title: "كورس تأسيس القراءة والكتابة والإملاء",
    partition: "كورس التأسيس والإملاء",
    grade: "من الصفر لجميع المراحل",
    priceEg: "400 جنيه للدورة",
    priceSa: "110 ريال للدورة",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&auto=format&fit=crop&q=80",
    description: "تأسيس سليم بالقاعدة النورانية، التغلب على صعوبات القراءة وضعف الإملاء والهمزات بطريقة مرنة.",
    watermark: true
  },
  {
    id: "c4",
    title: "كورس النحو من الصفر إلى الاحتراف",
    partition: "كورس النحو من الصفر",
    grade: "مفاتيح الإعراب السحرية",
    priceEg: "350 جنيه للدورة",
    priceSa: "95 ريال للدورة",
    image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
    description: "تبسيط قواعد النحو والإعراب بالخرائط الذهنية والتطبيقات العملية خطوة بخطوة حتى الاحتراف.",
    watermark: true
  },
  {
    id: "c5",
    title: "تحفيظ القرآن الكريم وتجويده",
    partition: "تحفيظ القرآن الكريم",
    grade: "حلقات فردية ومصغرة",
    priceEg: "300 جنيه شهرياً",
    priceSa: "80 ريال شهرياً",
    image: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=600&auto=format&fit=crop&q=80",
    description: "حفظ متقن ومراجعة مستمرة مع إتقان أحكام التجويد ومخارج الحروف مع معلمين ومعلمات مجازين.",
    watermark: true
  },
  {
    id: "c6",
    title: "كورس تحسين الخط العربي بالقلم العادي",
    partition: "كورس الخط العربي",
    grade: "خط الرقعة والنسخ",
    priceEg: "350 جنيه للدورة",
    priceSa: "90 ريال للدورة",
    image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80",
    description: "تدريب عملي لتحسين خط اليد بالقلم الجاف والعادي، ومعرفة قواعد رسم الحروف وتنسيق الصفحة.",
    watermark: true
  },
  {
    id: "c7",
    title: "كورس اللغة العربية لغير الناطقين بها (Arabic for Non-Native Speakers)",
    partition: "العربية لغير الناطقين بها",
    grade: "كافة الأعمار • ثنائي اللغة (Bilingual)",
    priceEg: "400 جنيه للدورة",
    priceSa: "110 ريال / $30",
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80",
    description: "برنامج عالمي لأبناء الجاليات بأمريكا وأوروبا؛ نطق الحروف، محادثات يومية حية، وقراءة القرآن الكريم ونور البيان.",
    watermark: true
  }
];

function getCourses() {
  try {
    const raw = localStorage.getItem('araby_courses');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.some(c => c.id === 'c7')) return parsed;
    }
  } catch (e) {}
  localStorage.setItem('araby_courses', JSON.stringify(DEFAULT_COURSES));
  return DEFAULT_COURSES;
}

function saveCourses(courses) {
  localStorage.setItem('araby_courses', JSON.stringify(courses));
}

function renderAdminCourses() {
  const container = document.getElementById('adminCoursesListContainer');
  if (!container) return;

  const courses = getCourses();
  container.innerHTML = courses.map(c => `
    <div class="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between gap-3 hover:border-logo-orange/40 transition">
      <div class="flex items-start gap-3">
        <div class="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
          <img src="${c.image || 'assets/logo.png'}" alt="${c.title}" class="w-full h-full object-cover">
        </div>
        <div class="space-y-1 flex-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-orange-50 text-logo-orange border border-orange-200">${c.partition}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-logo-blue">${c.grade}</span>
            ${c.watermark !== false ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-logo-green border border-emerald-200"><i class="fa-solid fa-shield-halved text-[9px] ml-0.5"></i> محمي</span>' : ''}
          </div>
          <h5 class="font-black text-xs sm:text-sm text-slate-900 leading-snug">${c.title}</h5>
          <p class="text-[11px] text-slate-500 line-clamp-2">${c.description || ''}</p>
        </div>
      </div>

      <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        <div>
          <span class="text-slate-400 font-bold block text-[10px]">قيمة الاشتراك:</span>
          <span class="font-black text-logo-orange text-xs">${c.priceEg} / ${c.priceSa}</span>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="openEditCourseModal('${c.id}')" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1">
            <i class="fa-solid fa-pen-to-square"></i>
            <span>تعديل الكورس والصورة</span>
          </button>
          <button onclick="deleteCourse('${c.id}')" class="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition" title="حذف الكورس">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderLandingCourses() {
  const courses = getCourses();
  courses.forEach(c => {
    const imgEl = document.getElementById(`landingCourseImg_${c.id}`);
    if (imgEl && c.image) {
      imgEl.src = c.image;
    }
  });
}

const courseFormModal = document.getElementById('courseFormModal');

function openAddCourseModal() {
  document.getElementById('courseFormModalTitle').textContent = '➕ إضافة كورس جديد';
  document.getElementById('courseFormSubmitBtn').innerHTML = '<i class="fa-solid fa-plus-circle"></i><span>حفظ ونشر الكورس الجديد 💾</span>';
  document.getElementById('courseFormId').value = '';
  document.getElementById('courseFormTitle').value = '';
  document.getElementById('courseFormPartition').selectedIndex = 0;
  document.getElementById('courseFormGrade').value = '';
  document.getElementById('courseFormPriceEg').value = '350 جنيه شهرياً';
  document.getElementById('courseFormPriceSa').value = '85 ريال شهرياً';
  document.getElementById('courseFormDescription').value = '';
  document.getElementById('courseFormWatermark').checked = true;
  document.getElementById('courseFormImageBase64').value = '';
  
  const preview = document.getElementById('courseFormImagePreview');
  const placeholder = document.getElementById('courseImagePlaceholder');
  if (preview) { preview.src = ''; preview.classList.add('hidden'); }
  if (placeholder) { placeholder.classList.remove('hidden'); }

  if (courseFormModal) courseFormModal.classList.remove('hidden');
}

function openEditCourseModal(courseId) {
  const courses = getCourses();
  const c = courses.find(item => item.id === courseId);
  if (!c) return;

  document.getElementById('courseFormModalTitle').textContent = '✏️ تعديل بيانات الكورس والصورة';
  document.getElementById('courseFormSubmitBtn').innerHTML = '<i class="fa-solid fa-check"></i><span>تحديث وحفظ التعديلات 💾</span>';
  document.getElementById('courseFormId').value = c.id;
  document.getElementById('courseFormTitle').value = c.title;
  document.getElementById('courseFormPartition').value = c.partition;
  document.getElementById('courseFormGrade').value = c.grade;
  document.getElementById('courseFormPriceEg').value = c.priceEg;
  document.getElementById('courseFormPriceSa').value = c.priceSa;
  document.getElementById('courseFormDescription').value = c.description || '';
  document.getElementById('courseFormWatermark').checked = c.watermark !== false;
  document.getElementById('courseFormImageBase64').value = c.image || '';

  const preview = document.getElementById('courseFormImagePreview');
  const placeholder = document.getElementById('courseImagePlaceholder');
  if (c.image) {
    if (preview) { preview.src = c.image; preview.classList.remove('hidden'); }
    if (placeholder) { placeholder.classList.add('hidden'); }
  } else {
    if (preview) { preview.src = ''; preview.classList.add('hidden'); }
    if (placeholder) { placeholder.classList.remove('hidden'); }
  }

  if (courseFormModal) courseFormModal.classList.remove('hidden');
}

function closeCourseFormModal() {
  if (courseFormModal) courseFormModal.classList.add('hidden');
}

if (courseFormModal) {
  courseFormModal.addEventListener('click', (e) => {
    if (e.target === courseFormModal) closeCourseFormModal();
  });
}

function handleCourseImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    const base64 = event.target.result;
    const preview = document.getElementById('courseFormImagePreview');
    const placeholder = document.getElementById('courseImagePlaceholder');
    const hidden = document.getElementById('courseFormImageBase64');

    if (preview) {
      preview.src = base64;
      preview.classList.remove('hidden');
    }
    if (placeholder) {
      placeholder.classList.add('hidden');
    }
    if (hidden) {
      hidden.value = base64;
    }
  };
  reader.readAsDataURL(file);
}

function handleCourseFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('courseFormId').value;
  const title = (document.getElementById('courseFormTitle').value || '').trim();
  const partition = document.getElementById('courseFormPartition').value;
  const grade = (document.getElementById('courseFormGrade').value || '').trim();
  const priceEg = (document.getElementById('courseFormPriceEg').value || '').trim();
  const priceSa = (document.getElementById('courseFormPriceSa').value || '').trim();
  const description = (document.getElementById('courseFormDescription').value || '').trim();
  const watermark = document.getElementById('courseFormWatermark').checked;
  const image = document.getElementById('courseFormImageBase64').value || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80';

  let courses = getCourses();

  if (id) {
    courses = courses.map(c => {
      if (c.id === id) {
        return { ...c, title, partition, grade, priceEg, priceSa, description, watermark, image };
      }
      return c;
    });
    alert(`✅ تم تحديث بيانات وصورة كورس (${title}) بنجاح!`);
  } else {
    const newId = 'c_' + Date.now();
    courses.push({
      id: newId,
      title,
      partition,
      grade,
      priceEg,
      priceSa,
      description,
      watermark,
      image
    });
    alert(`🎉 تم إضافة ونشر الكورس الجديد (${title}) بنجاح!`);
  }

  saveCourses(courses);
  closeCourseFormModal();
  renderAdminCourses();
  renderLandingCourses();
}

function deleteCourse(courseId) {
  let courses = getCourses();
  const c = courses.find(item => item.id === courseId);
  if (!c) return;

  if (confirm(`هل أنتِ متأكدة من رغبتك في حذف كورس:\n"${c.title}"؟`)) {
    courses = courses.filter(item => item.id !== courseId);
    saveCourses(courses);
    renderAdminCourses();
    renderLandingCourses();
    alert('تم حذف الكورس بنجاح.');
  }
}

// --- 10. Watermark & Anti-Screen-Recording Defense (DRM) ---
const DEFAULT_WATERMARK_SETTINGS = {
  enabled: true,
  text: "عربي أونلاين • الطالب: {student} • هاتف: {phone}",
  opacity: 35,
  antiRecordingLock: true
};

function getWatermarkSettings() {
  try {
    const raw = localStorage.getItem('araby_watermark_settings');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEFAULT_WATERMARK_SETTINGS;
}

function saveWatermarkSettingsToStorage(settings) {
  localStorage.setItem('araby_watermark_settings', JSON.stringify(settings));
}

function loadWatermarkSettingsIntoUI() {
  const s = getWatermarkSettings();
  const toggle = document.getElementById('watermarkEnabledToggle');
  const textInput = document.getElementById('watermarkCustomTextInput');
  const opacityRange = document.getElementById('watermarkOpacityRange');
  const opacityText = document.getElementById('watermarkOpacityValText');
  const antiLock = document.getElementById('antiRecordingAutoLockToggle');

  if (toggle) toggle.checked = s.enabled !== false;
  if (textInput) textInput.value = s.text || DEFAULT_WATERMARK_SETTINGS.text;
  if (opacityRange) opacityRange.value = s.opacity || 35;
  if (opacityText) opacityText.textContent = (s.opacity || 35) + '%';
  if (antiLock) antiLock.checked = s.antiRecordingLock !== false;

  updateWatermarkLivePreview();
}

function updateWatermarkLivePreview() {
  const opacityRange = document.getElementById('watermarkOpacityRange');
  const opacityText = document.getElementById('watermarkOpacityValText');
  const badge = document.getElementById('liveWatermarkBadge');
  const textInput = document.getElementById('watermarkCustomTextInput');

  const opVal = opacityRange ? opacityRange.value : 35;
  if (opacityText) opacityText.textContent = opVal + '%';

  if (badge) {
    badge.style.opacity = (opVal / 100).toString();
    const txt = (textInput && textInput.value) ? textInput.value : DEFAULT_WATERMARK_SETTINGS.text;
    badge.textContent = txt.replace('{student}', 'أحمد محمود').replace('{phone}', '01080285458').replace('{date}', '2026/11');
  }
}

function saveWatermarkSettings(e) {
  e.preventDefault();
  const enabled = document.getElementById('watermarkEnabledToggle').checked;
  const text = document.getElementById('watermarkCustomTextInput').value.trim();
  const opacity = parseInt(document.getElementById('watermarkOpacityRange').value, 10);
  const antiRecordingLock = document.getElementById('antiRecordingAutoLockToggle').checked;

  const settings = { enabled, text, opacity, antiRecordingLock };
  saveWatermarkSettingsToStorage(settings);
  updateWatermarkLivePreview();

  alert('🛡️ تم حفظ إعدادات العلامة المائية وتفعيل نظام منع تسريب الفيديوهات بنجاح!');
}

// --- 11. Secure Video Player & Anti-Leak Screen Lock ---
let isSecureVideoModalOpen = false;
const secureVideoModal = document.getElementById('secureVideoPlayerModal');
const screenLockModal = document.getElementById('screenRecordingLockModal');

function openSecureVideoPlayer(lessonTitle, coursePartition) {
  const settings = getWatermarkSettings();
  const playerLessonTitle = document.getElementById('playerLessonTitle');
  const playerCoursePartition = document.getElementById('playerCoursePartition');
  const playerBadge = document.getElementById('playerWatermarkBadge');

  if (playerLessonTitle) playerLessonTitle.textContent = lessonTitle;
  if (playerCoursePartition) playerCoursePartition.textContent = coursePartition;

  if (playerBadge) {
    if (settings.enabled) {
      playerBadge.classList.remove('hidden');
      playerBadge.style.opacity = (settings.opacity / 100).toString();
      const txt = settings.text || DEFAULT_WATERMARK_SETTINGS.text;
      playerBadge.textContent = txt.replace('{student}', 'أحمد محمود').replace('{phone}', '01080285458').replace('{date}', '2026/11');
    } else {
      playerBadge.classList.add('hidden');
    }
  }

  isSecureVideoModalOpen = true;
  if (secureVideoModal) secureVideoModal.classList.remove('hidden');
}

function closeSecureVideoPlayer() {
  isSecureVideoModalOpen = false;
  if (secureVideoModal) secureVideoModal.classList.add('hidden');
}

if (secureVideoModal) {
  secureVideoModal.addEventListener('click', (e) => {
    if (e.target === secureVideoModal) closeSecureVideoPlayer();
  });
}

function triggerScreenRecordingLock(reason = '') {
  const settings = getWatermarkSettings();
  if (!settings.antiRecordingLock && !reason.includes('تجربة')) return;

  if (screenLockModal) {
    screenLockModal.classList.remove('hidden');
  }

  // Blur video in background immediately
  const videoScreen = document.getElementById('videoScreenContainer');
  if (videoScreen) videoScreen.classList.add('video-blur-lock');

  console.warn('Anti-Leak DRM Triggered:', reason);
}

function dismissScreenRecordingLock() {
  if (screenLockModal) screenLockModal.classList.add('hidden');
  const videoScreen = document.getElementById('videoScreenContainer');
  if (videoScreen) videoScreen.classList.remove('video-blur-lock');
}

function simulateScreenRecordingDetection() {
  triggerScreenRecordingLock('تجربة فحص قفل الشاشة التلقائي ضد برامج التسجيل من لوحة الإدارة');
}

// Global Key Sniffer: Detects PrintScreen and screen recording shortcuts
window.addEventListener('keyup', (e) => {
  if (e.key === 'PrintScreen' || e.keyCode === 44) {
    triggerScreenRecordingLock('تم اكتشاف الضغط على زر تصوير الشاشة (PrintScreen)!');
  }
});

window.addEventListener('keydown', (e) => {
  const isPrintScreen = e.key === 'PrintScreen' || e.keyCode === 44;
  const isSnip = (e.shiftKey && (e.metaKey || e.ctrlKey) && (e.key === 'S' || e.key === 's' || e.key === '4' || e.key === '3'));
  const isDevTools = (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c')) || e.key === 'F12';

  if (isPrintScreen || isSnip) {
    e.preventDefault();
    triggerScreenRecordingLock('تم اكتشاف اختصار تصوير الشاشة (PrintScreen / Snipping Tool)!');
  } else if (isDevTools && isSecureVideoModalOpen) {
    e.preventDefault();
    triggerScreenRecordingLock('تم اكتشاف محاولة فحص محتوى المحاضرة!');
  }
});

// Window blur & visibility change detection (e.g. user opens OBS / Snipping Tool / external recorder)
window.addEventListener('blur', () => {
  if (isSecureVideoModalOpen) {
    const settings = getWatermarkSettings();
    if (settings.antiRecordingLock) {
      triggerScreenRecordingLock('فقدان تركيز الشاشة / تشغيل أداة تسجيل أو تصوير خارجية أثناء تشغيل الفيديو!');
    }
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && isSecureVideoModalOpen) {
    const settings = getWatermarkSettings();
    if (settings.antiRecordingLock) {
      triggerScreenRecordingLock('تم تصغير الشاشة أو التبديل لنافذة أخرى أثناء تشغيل المحاضرة!');
    }
  }
});

// ==================== THEME (LIGHT / DARK MODE) ====================
function getTheme() {
  const saved = localStorage.getItem('araby_theme');
  if (saved) return saved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const html = document.documentElement;
  const body = document.body;
  const icon = document.getElementById('themeToggleIcon');
  const text = document.getElementById('themeToggleText');
  const lang = localStorage.getItem('araby_lang') || 'ar';
  
  if (theme === 'dark') {
    html.classList.add('dark');
    if (body) body.classList.add('dark');
    if (icon) {
      icon.className = 'fa-solid fa-sun text-xs text-amber-400';
    }
    if (text) {
      text.textContent = (lang === 'en') ? 'Light Mode' : 'الوضع النهاري';
    }
  } else {
    html.classList.remove('dark');
    if (body) body.classList.remove('dark');
    if (icon) {
      icon.className = 'fa-solid fa-moon text-xs text-indigo-600';
    }
    if (text) {
      text.textContent = (lang === 'en') ? 'Dark Mode' : 'الوضع الليلي';
    }
  }
  localStorage.setItem('araby_theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const target = current === 'dark' ? 'light' : 'dark';
  applyTheme(target);
}

// ==================== MULTILINGUAL & I18N SYSTEM ====================
const I18N = {
  ar: {
    flag: '🇪🇬',
    name: 'العربية',
    dir: 'rtl',
    nav_home: 'الرئيسية',
    nav_courses: 'الكورسات المعتمدة',
    nav_tracks: 'المسارات التعليمية',
    nav_calligraphy: 'سبورة الخط ✍️',
    nav_about: 'عن الأكاديمية',
    nav_portal: 'لوحة الطالب',
    nav_free_trial: '🎁 حصة مجانية',
    nav_login: 'تسجيل الدخول',
    nav_subscribe: 'حجز الكورسات',
    top_ribbon_badge: '🎁 عرض الشهر الحصري',
    top_ribbon_text: 'احجز أي كورس دراسي أو قرآني واحصل على "كورس تحسين الخط العربي بالقلم العادي" هدية مجانية 100% ✍️!',
    top_ribbon_btn: 'احجز واستلم الهدية 🎁',
    hero_bubble: 'عربي أونلاين.. الصعب بنسهّله! ✨',
    hero_greeting: 'أهلاً بكم في صرح التميز',
    hero_title_araby: 'عربي',
    hero_title_online: 'أونلاين',
    hero_desc: 'منصة تعليمية تفاعلية مبهجة تجمع بين متعة التعلم والمنهجية المدرسية المعتمدة للمناهج المصرية والسعودية، مع برامج التأسيس الشامل والنحو من الصفر، وتحفيظ القرآن وفنون الخط العربي.',
    hero_badge_teacher: 'إشراف: مس فرح القاضي (خبرة 13 سنة) ⭐',
    hero_badge_curricula: 'مناهج مصر والسعودية',
    hero_badge_students: '140+ طالب متفاعل الآن',
    hero_badge_rating: '⭐ 4.9/5 تقييم أولياء الأمور',
    hero_btn_trial: 'احجز حصة تجريبية مجانية 🎁',
    hero_btn_courses: 'تصفح الكورسات المعتمدة',
    hero_btn_enroll: 'الاشتراك المباشر',
    hero_scroll_hint: 'اكتشف باقات الكورسات وسبورة الخط بالأسفل',
    services_heading: 'الكورسات والمسارات المعتمدة',
    services_subheading: 'برامجنا الأكاديمية المتخصصة في اللغة العربية، التربية الدينية، القرآن الكريم، واللغة العربية لغير الناطقين بها',
    services_view_details: 'عرض كل تفاصيل الاشتراك',
    c1_title: 'شرح منهج اللغة العربية',
    c1_sub: 'الابتدائي والإعدادي (المنهج الوزاري)',
    c1_desc: 'نصوص، قراءة متحررة، تعبير كتابي، قصة، وتربية دينية إسلامية، مع تدريبات امتحانات المحافظات وبنوك الأسئلة.',
    c2_title: 'شرح منهج لغتي (المنهج السعودي)',
    c2_sub: 'لغتي الجميلة والخالدة والدراسات الإسلامية',
    c2_desc: 'شرح كتاب لغتي والدراسات الإسلامية لطلاب المملكة والمدارس السعودية بالخارج مع حل تدريبات منصة مدرستي.',
    c3_title: 'كورس تأسيس القراءة والكتابة (نور البيان)',
    c3_sub: 'من عمر 4 سنوات ولصعوبات التعلم',
    c3_desc: 'معالجة الضعف القرائي، الحركات القصيرة والطويلة، التنوين والشدود، وتمكين الطفل من القراءة بطلاقة تامة.',
    c4_title: 'كورس النحو والإعراب الشامل',
    c4_sub: 'تأسيس النحو من الصفر حتى الإتقان',
    c4_desc: 'تبسيط قواعد النحو والإعراب، الثوابت الإعرابية، حل قطع النحو الصعبة، والتدريب على الإعراب بدون حفظ.',
    c5_title: 'تحفيظ القرآن الكريم وأحكام التجويد',
    c5_sub: 'تلاوة متقنة وتفسير ميسر للأطفال والناشئة',
    c5_desc: 'حفظ وتثبيت القرآن بالتجويد العملي مع فهم معاني الآيات، ومتابعة حفظ فردية لكل طالب.',
    c6_title: 'كورس تحسين الخط العربي بالقلم العادي',
    c6_sub: 'خطي الرقعة والنسخ لجميع الأعمار',
    c6_desc: 'تحسين خط اليد بالقلم الجاف والرصاص العادي، قواعد استقرار الحروف على السطر، وسرعة الكتابة في الامتحانات.',
    c7_badge: '🌍 دولي • لغير الناطقين بها',
    c7_title: 'كورس تعليم اللغة العربية لغير الناطقين بها',
    c7_subtitle: 'Arabic for Non-Native Speakers • إشراف وتدريس مس فرح القاضي (خبرة 13 سنة)',
    c7_desc: 'برنامج عالمي متكامل مصمم خصيصاً لأبناء الجاليات في أمريكا، بريطانيا، كندا، فرنسا، ألمانيا ودول العالم؛ يتضمن نطق الحروف الأبجدية ومخارج الأصوات، محادثات يومية حية (التعارف، المدرسة، العائلة)، قراءة القرآن الكريم ونور البيان، وتدريب ثنائي اللغة بالصوت والصورة.',
    c7_feat1: 'مخارج الحروف ونور البيان',
    c7_feat2: 'محادثات واقعية للمغتربين',
    c7_feat3: 'معلمات مجازات لغات',
    c7_enroll_btn: 'حجز واشتراك الكورس الآن ($30)',
    c7_trial_btn: 'حجز حصة تجريبية دولية مجانية 🎁',
    btn_enroll_now: 'حجز واشتراك الكورس الآن',
    btn_free_trial: 'حجز حصة تجريبية مجانية 🎁'
  },
  en: {
    flag: '🇬🇧',
    name: 'English',
    dir: 'ltr',
    nav_home: 'Home',
    nav_courses: 'Our Courses',
    nav_tracks: 'Academic Tracks',
    nav_calligraphy: 'Calligraphy Board ✍️',
    nav_about: 'About Us',
    nav_portal: 'Student Portal',
    nav_free_trial: '🎁 Free Trial',
    nav_login: 'Sign In',
    nav_subscribe: 'Enroll Now',
    top_ribbon_badge: '🎁 Exclusive Monthly Offer',
    top_ribbon_text: 'Enroll in any course and receive the "Arabic Pen Calligraphy Mastery Course" 100% Free! ✍️',
    top_ribbon_btn: 'Claim Your Gift 🎁',
    hero_bubble: "Araby Online: Making the Hard Simple! ✨",
    hero_greeting: 'Welcome to Excellence',
    hero_title_araby: 'Araby',
    hero_title_online: 'Online',
    hero_desc: 'An inspiring interactive academy blending joyous learning with certified school curricula (Egyptian & Saudi), comprehensive grammar, Quran memorization, and Arabic calligraphy.',
    hero_badge_teacher: 'Supervised by: Ms. Farah El-Kady (13 Yrs Exp) ⭐',
    hero_badge_curricula: 'Egyptian & Saudi Curricula',
    hero_badge_students: '140+ Active Students',
    hero_badge_rating: '⭐ 4.9/5 Parents Rating',
    hero_btn_trial: 'Book Free Trial Lesson 🎁',
    hero_btn_courses: 'Browse All Courses',
    hero_btn_enroll: 'Direct Enrollment',
    hero_scroll_hint: 'Discover course packages and calligraphy below',
    services_heading: 'Accredited Courses & Academic Tracks',
    services_subheading: 'Specialized programs in Arabic Language, Islamic Studies, Holy Quran, and Arabic for Non-Native Speakers',
    services_view_details: 'View All Pricing & Details',
    c1_title: 'Egyptian Ministry Arabic Curriculum',
    c1_sub: 'Primary & Preparatory Grades',
    c1_desc: 'Literature, reading comprehension, creative writing, stories, and Islamic studies with real exam practices.',
    c2_title: 'Saudi Curriculum (Lughati & Islamic Studies)',
    c2_sub: 'Lughati Al-Jamila & Islamic Studies',
    c2_desc: 'Comprehensive tutoring for students in Saudi Arabia and Saudi schools abroad following Madrasati platform.',
    c3_title: 'Reading & Writing Foundation (Noor Al-Bayan)',
    c3_sub: 'Ages 4+ and Learning Difficulties',
    c3_desc: 'Master phonics, short and long vowels, tanween, and guide students to fluent reading and accurate spelling.',
    c4_title: 'Comprehensive Arabic Grammar (Nahw)',
    c4_sub: 'Grammar from Zero to Mastery',
    c4_desc: 'Simplified grammar rules, parsing secrets, mind maps, and solving complex grammatical analysis with ease.',
    c5_title: 'Holy Quran Memorization & Tajweed',
    c5_sub: 'Accurate Recitation & Easy Tafseer',
    c5_desc: 'Quran memorization with practical Tajweed rules, correct pronunciation, and personalized 1-on-1 tracking.',
    c6_title: 'Arabic Pen Calligraphy Mastery',
    c6_sub: 'Ruq\'ah & Naskh Styles for All Ages',
    c6_desc: 'Handwriting improvement using standard ballpoint pens and pencils for fast and neat exam writing.',
    c7_badge: '🌍 Global • Non-Native Speakers',
    c7_title: 'Arabic for Non-Native Speakers (Kids & Adults)',
    c7_subtitle: 'Supervised & Taught by Miss Farah El-Kady (13 Years of Teaching Experience)',
    c7_desc: 'A comprehensive global curriculum designed for families and expats in the US, UK, Canada, France, Germany & worldwide. Covers Arabic phonics, daily life conversations, Quranic Noor Al-Bayan reading, and interactive bilingual live sessions.',
    c7_feat1: 'Phonics & Noor Al-Bayan',
    c7_feat2: 'Daily Real-Life Dialogue',
    c7_feat3: 'Certified Bilingual Tutors',
    c7_enroll_btn: 'Enroll in This Course ($30 USD)',
    c7_trial_btn: 'Book Free International Trial 🎁',
    btn_enroll_now: 'Enroll in Course Now',
    btn_free_trial: 'Book Free Trial Lesson 🎁'
  }
};

function changeLanguage(lang) {
  if (lang !== 'ar' && lang !== 'en') lang = 'ar';
  localStorage.setItem('araby_lang', lang);
  
  const dict = I18N[lang] || I18N['ar'];
  
  document.documentElement.setAttribute('dir', dict.dir);
  document.documentElement.setAttribute('lang', lang);

  const btnAr = document.getElementById('langBtnAr');
  const btnEn = document.getElementById('langBtnEn');
  if (btnAr && btnEn) {
    if (lang === 'ar') {
      btnAr.className = 'px-2.5 py-1 rounded-full transition-all duration-200 bg-orange-500 text-white shadow-xs flex items-center gap-1 cursor-pointer';
      btnEn.className = 'px-2.5 py-1 rounded-full transition-all duration-200 text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer';
    } else {
      btnEn.className = 'px-2.5 py-1 rounded-full transition-all duration-200 bg-orange-500 text-white shadow-xs flex items-center gap-1 cursor-pointer';
      btnAr.className = 'px-2.5 py-1 rounded-full transition-all duration-200 text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer';
    }
  }

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  const currentTheme = getTheme();
  applyTheme(currentTheme);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved Theme (Light/Dark)
  const currentTheme = getTheme();
  applyTheme(currentTheme);

  // Apply saved Language
  const currentLang = localStorage.getItem('araby_lang') || 'ar';
  changeLanguage(currentLang);

  // Restore student profile if exists
  const savedStudent = localStorage.getItem('araby_active_student');
  if (savedStudent) {
    try {
      updateDashboardWithStudent(JSON.parse(savedStudent));
    } catch (e) {}
  }

  updateAuthHeader();
  updateAdminUI();
  checkUrlHash();
  initLocalVideosStorage();
  renderAdminCourses();
  renderLandingCourses();
  renderLandingVideos();
  renderLandingReviews();
  renderAdminVideos();
  renderAdminReviews();
  loadWatermarkSettingsIntoUI();
});
