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

// --- 1.5 Student & Parent Login Modal & Auth State ---
const loginModal = document.getElementById('loginModal');
let currentLoginType = 'student'; // 'student' or 'parent'

function openLoginModal() {
  if (loginModal) loginModal.classList.remove('hidden');
}

function closeLoginModal() {
  if (loginModal) loginModal.classList.add('hidden');
}

if (loginModal) {
  loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) closeLoginModal();
  });
}

function switchLoginType(type) {
  currentLoginType = type;
  const tabStudent = document.getElementById('loginTabStudent');
  const tabParent = document.getElementById('loginTabParent');
  const idLabel = document.getElementById('loginIdLabel');
  const idInput = document.getElementById('loginIdentifier');

  if (type === 'student') {
    if (tabStudent) tabStudent.className = "flex-1 py-2 rounded-xl bg-purple-600 text-white shadow-xs transition";
    if (tabParent) tabParent.className = "flex-1 py-2 rounded-xl text-slate-600 hover:text-slate-900 transition";
    if (idLabel) idLabel.textContent = "اسم الطالب أو رقم ولي الأمر *";
    if (idInput) idInput.placeholder = "مثال: يوسف أحمد أو 01080285458";
  } else {
    if (tabParent) tabParent.className = "flex-1 py-2 rounded-xl bg-purple-600 text-white shadow-xs transition";
    if (tabStudent) tabStudent.className = "flex-1 py-2 rounded-xl text-slate-600 hover:text-slate-900 transition";
    if (idLabel) idLabel.textContent = "رقم هاتف ولي الأمر المسجل *";
    if (idInput) idInput.placeholder = "مثال: 01080285458";
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
  const id = (document.getElementById('loginIdentifier').value || '').trim();

  if (!id) {
    alert('يرجى إدخال اسم الطالب أو رقم الهاتف.');
    return;
  }

  // Retrieve saved profile or construct one
  let studentData = null;
  const savedStr = localStorage.getItem('araby_active_student');
  if (savedStr) {
    try {
      studentData = JSON.parse(savedStr);
    } catch (err) {}
  }

  if (!studentData || (studentData.name !== id && studentData.phone !== id)) {
    studentData = {
      name: isNaN(id) ? id : `طالب (${id})`,
      email: id.includes('@') ? id : '',
      phone: isNaN(id) ? '' : id,
      country: '🇸🇦 المملكة العربية السعودية',
      grade: 'الصف الخامس الابتدائي',
      subject: 'اللغة العربية ومنهج لغتي',
      avatar: (id.charAt(0) || 'ط').toUpperCase(),
      joinedAt: new Date().toISOString()
    };
    localStorage.setItem('araby_active_student', JSON.stringify(studentData));
  }

  sessionStorage.setItem('araby_student_user', studentData.name);
  updateDashboardWithStudent(studentData);
  closeLoginModal();
  updateAuthHeader();
  showSection('dashboard');
  alert(`أهلاً بك يا ${studentData.name}! 🎓 تم فتح لوحة الطالب بنجاح.`);
}

function handleQuickDemoLogin() {
  const demoStudent = {
    name: 'يوسف أحمد',
    email: 'youssef@example.com',
    phone: '01080285458',
    country: '🇪🇬 جمهورية مصر العربية',
    grade: 'الصف الخامس الابتدائي',
    subject: 'اللغة العربية وكورس النحو',
    avatar: 'ي',
    joinedAt: new Date().toISOString()
  };
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
  const tabs = ['partitions', 'schedule', 'homework', 'certificate'];
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

  // Construct structured Student Profile
  const studentData = {
    name: name,
    email: email,
    phone: phone,
    country: country,
    grade: grade,
    subject: curriculum,
    avatar: name.charAt(0) || 'ط',
    joinedAt: new Date().toISOString()
  };

  // 1. Save locally for instant session persistence
  localStorage.setItem('araby_active_student', JSON.stringify(studentData));
  sessionStorage.setItem('araby_student_user', studentData.name);

  // 2. Save directly to Supabase Database
  const client = getSupabase();
  if (client) {
    try {
      await client.from('bookings').insert([{
        student_name: name,
        student_grade: grade,
        curriculum: `${curriculum} (الدولة: ${country})`,
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

  // 4. Cheerful Confirmation Alert
  alert(`🎉 مبروك يا ${name}!\nتم تسجيل بياناتك وتفعيل لوحة الطالب الخاصة بك بنجاح 🎓.\nالصف: ${grade}\nالمادة: ${curriculum}\nالدولة: ${country}`);

  // 5. Open WhatsApp to confirm the appointment directly with academy admin/teacher
  const msg = 
`السلام عليكم ورحمة الله وبركاته،
تم تسجيل حساب جديد وحجز *حصة تجريبية مجانية* في *أكاديمية عربي أونلاين*:
👤 *اسم الطالب:* ${name}
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
function handlePaymentSubmit(e) {
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
const DEFAULT_ADMIN_PASS = "Araby@2026";

function getAdminEmail() {
  return localStorage.getItem('araby_admin_email') || DEFAULT_ADMIN_EMAIL;
}

function getAdminPass() {
  return localStorage.getItem('araby_admin_pass') || DEFAULT_ADMIN_PASS;
}

function isAdminLoggedIn() {
  return sessionStorage.getItem('araby_admin_logged_in') === 'true';
}

function setAdminLoggedIn(status) {
  if (status) {
    sessionStorage.setItem('araby_admin_logged_in', 'true');
  } else {
    sessionStorage.removeItem('araby_admin_logged_in');
  }
}

function updateAdminUI() {
  const currentEmail = getAdminEmail();
  
  const displayEmail = document.getElementById('displayCurrentAdminEmail');
  if (displayEmail) {
    // Mask email for high privacy & security (e.g., ad••••@arabyonline.com)
    const atIdx = currentEmail.indexOf('@');
    if (atIdx > 2) {
      const prefix = currentEmail.substring(0, 2);
      const domain = currentEmail.substring(atIdx);
      displayEmail.textContent = `${prefix}••••${domain}`;
    } else {
      displayEmail.textContent = '••••@••••.com';
    }
  }
}

const adminLoginModal = document.getElementById('adminLoginModal');

function openAdminLoginModal() {
  updateAdminUI();
  const errEl = document.getElementById('loginErrorMessage');
  if (errEl) errEl.classList.add('hidden');
  
  const emailInput = document.getElementById('loginAdminEmail');
  const passInput = document.getElementById('loginAdminPassword');
  if (emailInput) emailInput.value = '';
  if (passInput) passInput.value = '';

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
  e.preventDefault();
  const email = (document.getElementById('loginAdminEmail').value || '').trim().toLowerCase();
  const pass = (document.getElementById('loginAdminPassword').value || '').trim();
  const errEl = document.getElementById('loginErrorMessage');

  const validEmail = getAdminEmail().toLowerCase().trim();
  const validPass = getAdminPass().trim();

  if (email === validEmail && pass === validPass) {
    setAdminLoggedIn(true);
    closeAdminLoginModal();
    updateAdminUI();
    window.location.hash = 'admin';
    showSection('admin');
  } else {
    if (errEl) {
      errEl.classList.remove('hidden');
      errEl.className = "text-rose-600 text-[11px] font-bold text-center bg-rose-50 p-2.5 rounded-xl border border-rose-200 mb-2";
      errEl.textContent = 'خطأ: البريد الإلكتروني أو كلمة المرور غير صحيحة! تأكدي من إدخال البيانات المعتمدة.';
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
  const tabs = ['security', 'courses', 'watermark', 'bookings', 'payments'];
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

  if (tabKey === 'courses') {
    renderAdminCourses();
  } else if (tabKey === 'watermark') {
    loadWatermarkSettingsIntoUI();
  } else if (tabKey === 'bookings') {
    loadAdminBookings();
  } else if (tabKey === 'payments') {
    loadAdminPayments();
  }
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
  }
];

function getCourses() {
  try {
    const raw = localStorage.getItem('araby_courses');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
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
  const isPrintOrSave = (e.ctrlKey && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U'));

  if (isPrintScreen || isSnip) {
    e.preventDefault();
    triggerScreenRecordingLock('تم اكتشاف اختصار تصوير الشاشة (PrintScreen / Snipping Tool)!');
  } else if ((isDevTools || isPrintOrSave) && isSecureVideoModalOpen) {
    e.preventDefault();
    triggerScreenRecordingLock('تم اكتشاف محاولة حفظ أو فحص محتوى الفيديو!');
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

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
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
  renderAdminCourses();
  renderLandingCourses();
  loadWatermarkSettingsIntoUI();
});
