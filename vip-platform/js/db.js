/* ============================================
   VIP Platform - Database Layer (Firebase)
   ============================================ */

// Global config
const ADMIN_EMAIL = 'admin@elite3.local';
const WHATSAPP_NUMBER = '201148865176';

// Collections
const COLLECTIONS = {
  teachers: 'teachers',
  videos: 'videos',
  exams: 'exams',
  notifications: 'notifications',
  codes: 'codes',
  students: 'students',
  results: 'results',
  books: 'books',
  boxes: 'boxes',
  lessonVideos: 'lessonVideos', // Relations between lessons and video server
  orders: 'orders',       // Future: payment gateway
  payments: 'payments',   // Future: payment gateway
  analytics: 'analytics'
};

// Seed data flag
let seeded = false;

/* ============================================
   AUTH & SESSION
   ============================================ */

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('vip_user') || 'null');
  } catch { return null; }
}

function setCurrentUser(user) {
  if (user) localStorage.setItem('vip_user', JSON.stringify(user));
  else localStorage.removeItem('vip_user');
}

function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

function isStudent() {
  const user = getCurrentUser();
  return user && user.role === 'student';
}

function getStudentId() {
  const user = getCurrentUser();
  return user ? user.id : null;
}

function logout() {
  setCurrentUser(null);
  window.location.hash = '#/login';
}

/* ============================================
   FIRESTORE HELPERS
   ============================================ */

const db = firebase.firestore();

function docRef(collection, id) {
  return db.collection(collection).doc(id);
}

async function getDoc(collection, id) {
  const snap = await db.collection(collection).doc(id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function getDocs(collection, queryFn) {
  let ref = db.collection(collection);
  if (queryFn) ref = queryFn(ref);
  const snap = await ref.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function setDoc(collection, id, data) {
  await db.collection(collection).doc(id).set(data, { merge: true });
  return { id, ...data };
}

async function addDoc(collection, data) {
  const ref = await db.collection(collection).add(data);
  return { id: ref.id, ...data };
}

async function deleteDoc(collection, id) {
  await db.collection(collection).doc(id).delete();
}

async function updateDoc(collection, id, data) {
  await db.collection(collection).doc(id).update(data);
  return { id, ...data };
}

/* ============================================
   CODES / SUBSCRIPTIONS
   ============================================ */

async function getCodeByValue(codeValue) {
  const codes = await getDocs(COLLECTIONS.codes, ref => ref.where('code', '==', codeValue).limit(1));
  return codes[0] || null;
}

async function validateCode(codeValue) {
  const code = await getCodeByValue(codeValue);
  if (!code) return { valid: false, reason: 'الكود غير موجود' };
  if (code.status === 'suspended') return { valid: false, reason: 'الكود موقوف' };
  if (code.status === 'expired') return { valid: false, reason: 'الكود منتهي' };
  if (code.status === 'used') return { valid: false, reason: 'الكود مستخدم بالفعل' };
  if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
    await updateDoc(COLLECTIONS.codes, code.id, { status: 'expired' });
    return { valid: false, reason: 'الكود منتهي الصلاحية' };
  }
  return { valid: true, code };
}

async function useCode(codeId, studentId, deviceId) {
  const now = new Date().toISOString();
  await updateDoc(COLLECTIONS.codes, codeId, {
    status: 'used',
    studentId: studentId,
    deviceId: deviceId,
    usedAt: now
  });
}

async function createCode(data) {
  const codeData = {
    code: data.code || generateCode(),
    duration: data.duration || 30, // days
    startsAt: data.startsAt || new Date().toISOString(),
    expiresAt: data.expiresAt || getExpiryDate(data.duration || 30),
    status: 'unused',
    createdAt: new Date().toISOString(),
    createdBy: getCurrentUser()?.id || 'system'
  };
  return addDoc(COLLECTIONS.codes, codeData);
}

async function getAllCodes() {
  return getDocs(COLLECTIONS.codes, ref => ref.orderBy('createdAt', 'desc'));
}

async function getCodeStats() {
  const codes = await getAllCodes();
  return {
    total: codes.length,
    unused: codes.filter(c => c.status === 'unused').length,
    used: codes.filter(c => c.status === 'used').length,
    active: codes.filter(c => c.status === 'used' && new Date(c.expiresAt) > new Date()).length,
    expired: codes.filter(c => c.status === 'expired' || (c.expiresAt && new Date(c.expiresAt) < new Date())).length,
    suspended: codes.filter(c => c.status === 'suspended').length
  };
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'VIP-';
  for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

function getExpiryDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/* ============================================
   STUDENTS
   ============================================ */

async function registerStudent(studentData, codeId) {
  const now = new Date().toISOString();
  const student = {
    ...studentData,
    codeId: codeId,
    role: 'student',
    createdAt: now,
    updatedAt: now,
    status: 'active'
  };
  const doc = await addDoc(COLLECTIONS.students, student);
  return { id: doc.id, ...student };
}

async function getStudentById(id) {
  return getDoc(COLLECTIONS.students, id);
}

async function getStudentByCode(codeId) {
  const students = await getDocs(COLLECTIONS.students, ref => ref.where('codeId', '==', codeId).limit(1));
  return students[0] || null;
}

async function getAllStudents(filters = {}) {
  let ref = db.collection(COLLECTIONS.students);

  if (filters.governorate) ref = ref.where('governorate', '==', filters.governorate);
  if (filters.grade) ref = ref.where('grade', '==', filters.grade);
  if (filters.section) ref = ref.where('section', '==', filters.section);
  if (filters.school) ref = ref.where('school', '==', filters.school);
  if (filters.status) ref = ref.where('status', '==', filters.status);
  if (filters.fromDate) ref = ref.where('createdAt', '>=', filters.fromDate);
  if (filters.toDate) ref = ref.where('createdAt', '<=', filters.toDate);

  const snap = await ref.orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function updateStudent(id, data) {
  return updateDoc(COLLECTIONS.students, id, { ...data, updatedAt: new Date().toISOString() });
}

/* ============================================
   ANALYTICS
   ============================================ */

async function getAnalytics() {
  const [students, codes, teachers, books, boxes, videos, exams] = await Promise.all([
    getDocs(COLLECTIONS.students),
    getDocs(COLLECTIONS.codes),
    getDocs(COLLECTIONS.teachers),
    getDocs(COLLECTIONS.books),
    getDocs(COLLECTIONS.boxes),
    getDocs(COLLECTIONS.videos),
    getDocs(COLLECTIONS.exams)
  ]);

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const activeCodes = codes.filter(c => c.status === 'used' && new Date(c.expiresAt) > now);
  const expiredCodes = codes.filter(c => c.status === 'expired' || (c.expiresAt && new Date(c.expiresAt) <= now));

  // Governorate stats
  const governorateStats = {};
  students.forEach(s => {
    const gov = s.governorate || 'غير محدد';
    governorateStats[gov] = (governorateStats[gov] || 0) + 1;
  });

  // Daily/weekly/monthly registrations
  const todayRegistrations = students.filter(s => s.createdAt && s.createdAt.startsWith(today)).length;
  const weekRegistrations = students.filter(s => s.createdAt && s.createdAt >= weekAgo).length;
  const monthRegistrations = students.filter(s => s.createdAt && s.createdAt >= monthAgo).length;

  return {
    totalStudents: students.length,
    activeStudents: students.filter(s => s.status === 'active').length,
    activeSubscriptions: activeCodes.length,
    expiredSubscriptions: expiredCodes.length,
    totalCodes: codes.length,
    usedCodes: codes.filter(c => c.status === 'used').length,
    unusedCodes: codes.filter(c => c.status === 'unused').length,
    totalTeachers: teachers.length,
    totalBooks: books.length,
    totalBoxes: boxes.length,
    totalVideos: videos.length,
    totalExams: exams.length,
    governorateStats,
    todayRegistrations,
    weekRegistrations,
    monthRegistrations,
    newSubscriptions: monthRegistrations,
    expiredThisMonth: expiredCodes.filter(c => c.expiresAt && c.expiresAt >= monthAgo).length
  };
}

async function getGovernorateStats(filters = {}) {
  const students = await getAllStudents(filters);
  const stats = {};
  students.forEach(s => {
    const gov = s.governorate || 'غير محدد';
    stats[gov] = (stats[gov] || 0) + 1;
  });
  return Object.entries(stats).sort((a, b) => b[1] - a[1]);
}

/* ============================================
   LIBRARY (BOOKS & BOXES)
   ============================================ */

async function getBooks(filters = {}) {
  let ref = db.collection(COLLECTIONS.books);
  if (filters.teacherId) ref = ref.where('teacherId', '==', filters.teacherId);
  if (filters.subject) ref = ref.where('subject', '==', filters.subject);
  if (filters.grade) ref = ref.where('grade', '==', filters.grade);
  if (filters.status) ref = ref.where('status', '==', filters.status);
  const snap = await ref.orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getBookById(id) {
  return getDoc(COLLECTIONS.books, id);
}

async function createBook(data) {
  const book = {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  return addDoc(COLLECTIONS.books, book);
}

async function updateBook(id, data) {
  return updateDoc(COLLECTIONS.books, id, { ...data, updatedAt: new Date().toISOString() });
}

async function deleteBook(id) {
  return deleteDoc(COLLECTIONS.books, id);
}

async function getBoxes(filters = {}) {
  let ref = db.collection(COLLECTIONS.boxes);
  if (filters.teacherId) ref = ref.where('teacherId', '==', filters.teacherId);
  if (filters.subject) ref = ref.where('subject', '==', filters.subject);
  if (filters.status) ref = ref.where('status', '==', filters.status);
  const snap = await ref.orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getBoxById(id) {
  return getDoc(COLLECTIONS.boxes, id);
}

async function createBox(data) {
  const box = {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  return addDoc(COLLECTIONS.boxes, box);
}

async function updateBox(id, data) {
  return updateDoc(COLLECTIONS.boxes, id, { ...data, updatedAt: new Date().toISOString() });
}

async function deleteBox(id) {
  return deleteDoc(COLLECTIONS.boxes, id);
}

/* ============================================
   TEACHERS, VIDEOS, EXAMS, NOTIFICATIONS, RESULTS
   (Preserve existing functionality)
   ============================================ */

async function getTeachers() {
  return getDocs(COLLECTIONS.teachers, ref => ref.orderBy('order', 'asc'));
}

async function getVideos(teacherId) {
  let ref = db.collection(COLLECTIONS.videos).orderBy('order', 'asc');
  if (teacherId) ref = ref.where('teacherId', '==', teacherId);
  const snap = await ref.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getExams() {
  return getDocs(COLLECTIONS.exams, ref => ref.orderBy('createdAt', 'desc'));
}

async function getNotifications() {
  return getDocs(COLLECTIONS.notifications, ref => ref.orderBy('createdAt', 'desc').limit(20));
}

async function saveResult(resultData) {
  return addDoc(COLLECTIONS.results, {
    ...resultData,
    createdAt: new Date().toISOString()
  });
}

async function getResults(studentId) {
  let ref = db.collection(COLLECTIONS.results).orderBy('createdAt', 'desc');
  if (studentId) ref = ref.where('studentId', '==', studentId);
  const snap = await ref.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}


/* ============================================
   EXTERNAL VIDEO SUPPORT (No Backend Needed!)
   ============================================

   لو مش عايز تستخدم Video Server، استخدم الخيار ده:
   - ارفع الفيديو على YouTube (Unlisted)
   - أو على Google Drive
   - أو على أي موقع تخزين
   - خد الرابط والصقه في VIP
   ============================================ */

function getEmbedUrl(url) {
  if (!url) return null;

  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`;

  // Google Drive
  const gdMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gdMatch) return `https://drive.google.com/file/d/${gdMatch[1]}/preview`;

  // Direct video URL (MP4, etc.)
  if (url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) return url;

  // Return as-is for other embeds
  return url;
}

function isDirectVideo(url) {
  return url && url.match(/\.(mp4|webm|ogg)(\?.*)?$/i);
}

/* ============================================
   VIDEO SERVER API CONFIG
   ============================================

   غيّر الرابط ده لما تنشر الـ Video Server على استضافة حقيقية
   مثال: "https://videos.yourdomain.com"
*/

const VIDEO_SERVER_URL = (() => {
  // If running locally
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  // Production - change this to your Render/Railway URL
  return 'https://vip-video-server.onrender.com';
})();

/* ============================================
   LESSON VIDEOS (Relations)
   ============================================ */

async function getLessonVideos(filters = {}) {
  let ref = db.collection(COLLECTIONS.lessonVideos);
  if (filters.lessonId) ref = ref.where('lessonId', '==', filters.lessonId);
  if (filters.videoId) ref = ref.where('videoId', '==', filters.videoId);
  if (filters.teacherId) ref = ref.where('teacherId', '==', filters.teacherId);
  if (filters.subject) ref = ref.where('subject', '==', filters.subject);
  if (filters.grade) ref = ref.where('grade', '==', filters.grade);
  if (filters.status) ref = ref.where('status', '==', filters.status);
  const snap = await ref.orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getLessonVideoById(id) {
  return getDoc(COLLECTIONS.lessonVideos, id);
}

async function getLessonVideoByLesson(lessonId) {
  const items = await getLessonVideos({ lessonId });
  return items[0] || null;
}

async function linkVideoToLesson(data) {
  const link = {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active'
  };
  return addDoc(COLLECTIONS.lessonVideos, link);
}

async function updateLessonVideo(id, data) {
  return updateDoc(COLLECTIONS.lessonVideos, id, { ...data, updatedAt: new Date().toISOString() });
}

async function deleteLessonVideo(id) {
  return deleteDoc(COLLECTIONS.lessonVideos, id);
}

/* ============================================
   VIDEO SERVER API CALLS
   ============================================ */

async function fetchVideosFromServer(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${VIDEO_SERVER_URL}/api/videos?${query}`);
  if (!res.ok) throw new Error('Failed to fetch videos');
  return await res.json();
}

async function fetchVideoById(videoId) {
  const res = await fetch(`${VIDEO_SERVER_URL}/api/videos/${videoId}`);
  if (!res.ok) throw new Error('Video not found');
  return await res.json();
}

async function uploadVideoToServer(formData) {
  const res = await fetch(`${VIDEO_SERVER_URL}/api/videos/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Upload failed');
  return await res.json();
}

async function deleteVideoFromServer(videoId) {
  const res = await fetch(`${VIDEO_SERVER_URL}/api/videos/${videoId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Delete failed');
  return await res.json();
}

function getVideoStreamUrl(videoId) {
  return `${VIDEO_SERVER_URL}/api/videos/${videoId}/stream`;
}

/* ============================================
   SEED DATA (First run)
   ============================================ */

async function seedData() {
  if (seeded) return;
  seeded = true;

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('reset') === '1') {
    // Clear existing data (optional reset)
    const cols = [COLLECTIONS.teachers, COLLECTIONS.exams, COLLECTIONS.notifications, COLLECTIONS.codes];
    for (const col of cols) {
      const snap = await db.collection(col).get();
      for (const doc of snap.docs) await doc.ref.delete();
    }
  }

  // Check if already seeded
  const existing = await getDocs(COLLECTIONS.teachers);
  if (existing.length > 0) return;

  // Seed teachers
  const teachers = [
    { name: 'أحمد محمد', subject: 'رياضيات', bio: 'خبرة 15 عامًا في تدريس الرياضيات', order: 1, createdAt: new Date().toISOString() },
    { name: 'محمد علي', subject: 'فيزياء', bio: 'دكتوراه في الفيزياء النووية', order: 2, createdAt: new Date().toISOString() },
    { name: 'سارة أحمد', subject: 'كيمياء', bio: 'خبيرة في الكيمياء العضوية', order: 3, createdAt: new Date().toISOString() },
    { name: 'خالد محمود', subject: 'أحياء', bio: 'باحث في علم الأحياء الدقيقة', order: 4, createdAt: new Date().toISOString() },
    { name: 'نورا سامي', subject: 'لغة عربية', bio: 'أخصائية في اللغة العربية وآدابها', order: 5, createdAt: new Date().toISOString() },
    { name: 'عمر حسن', subject: 'لغة إنجليزية', bio: 'ماجستير في اللغويات التطبيقية', order: 6, createdAt: new Date().toISOString() },
    { name: 'ليلى كريم', subject: 'تاريخ', bio: 'خبيرة في التاريخ المصري الحديث', order: 7, createdAt: new Date().toISOString() }
  ];
  for (const t of teachers) await addDoc(COLLECTIONS.teachers, t);

  // Seed sample exams
  const exams = [
    { title: 'امتحان تجريبي - رياضيات', subject: 'رياضيات', duration: 60, questions: 20, createdAt: new Date().toISOString() },
    { title: 'امتحان تجريبي - فيزياء', subject: 'فيزياء', duration: 45, questions: 15, createdAt: new Date().toISOString() }
  ];
  for (const e of exams) await addDoc(COLLECTIONS.exams, e);

  // Seed sample notifications
  const notifications = [
    { title: 'مرحبًا بك في VIP', body: 'منصة التميز التعليمي', createdAt: new Date().toISOString() },
    { title: 'امتحان جديد متاح', body: 'تم إضافة امتحان تجريبي جديد في الرياضيات', createdAt: new Date().toISOString() }
  ];
  for (const n of notifications) await addDoc(COLLECTIONS.notifications, n);

  console.log('[VIP] Seed data completed');
}

/* ============================================
   IMAGES (No Firebase Storage needed!)
   ============================================

   We use 2 methods:
   1. Base64: Small images stored directly in Firestore
   2. External URL: Admin pastes image URL (Google Drive, Imgur, etc.)

   No Firebase Storage required = No credit card needed!
*/

async function uploadImage(file, maxWidth = 400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Compress to JPEG 80% quality
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve(base64);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function deleteImage(path) {
  // No-op since we don't use Firebase Storage
  console.log('[VIP] Image deleted from Firestore (no Storage used)');
}

/* ============================================
   INIT
   ============================================ */

async function initDB() {
  await seedData();
  console.log('[VIP] Database initialized');
}

// Expose for app.js
window.VIPDB = {
  ADMIN_EMAIL,
  WHATSAPP_NUMBER,
  VIDEO_SERVER_URL,
  getEmbedUrl,
  isDirectVideo,
  COLLECTIONS,
  getCurrentUser,
  setCurrentUser,
  isAdmin,
  isStudent,
  getStudentId,
  logout,
  getDoc, getDocs, setDoc, addDoc, deleteDoc, updateDoc,
  getCodeByValue, validateCode, useCode, createCode, getAllCodes, getCodeStats,
  registerStudent, getStudentById, getStudentByCode, getAllStudents, updateStudent,
  getAnalytics, getGovernorateStats,
  getBooks, getBookById, createBook, updateBook, deleteBook,
  getBoxes, getBoxById, createBox, updateBox, deleteBox,
  getTeachers, getVideos, getExams, getNotifications, saveResult, getResults,
  getLessonVideos, getLessonVideoById, getLessonVideoByLesson,
  linkVideoToLesson, updateLessonVideo, deleteLessonVideo,
  fetchVideosFromServer, fetchVideoById, uploadVideoToServer,
  deleteVideoFromServer, getVideoStreamUrl,
  uploadImage, deleteImage,
  initDB
};
