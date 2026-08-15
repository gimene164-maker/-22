# 🏆 VIP Platform + Video Server

منصة تعليمية متكاملة مع نظام فيديوهات منفصل.

---

## 📂 المشروع

```
VIP_Platform_With_Video/
├── vip-platform/          ← المنصة (Frontend + Firebase)
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── firebase-config.js  ← ⚠️ استبدل ببياناتك
│   │   ├── db.js
│   │   └── app.js
│   ├── manifest.json
│   └── sw.js
│
└── video-server/          ← سيرفر الفيديوهات (Backend)
    ├── server.js
    ├── package.json
    ├── README.md
    └── uploads/           ← الفيديوهات المرفوعة
```

---

## 🚀 تشغيل المشروع

### الخطوة 1: تشغيل Video Server

```bash
cd video-server
npm install
npm start
```

> السيرفر هيشتغل على `http://localhost:3001`

### الخطوة 2: تشغيل VIP Platform

```bash
cd vip-platform
npx serve .
```

> المنصة هتشتغل على `http://localhost:3000`

### الخطوة 3: Firebase

اتبع دليل `FIREBASE_SETUP.md` لتفعيل:
- Firestore Database
- Authentication
- Security Rules

---

## ✨ المميزات الجديدة

### 🎬 للأدمن
- رفع فيديوهات من لوحة التحكم
- ربط فيديو بدرس (مادة + صف + مدرس)
- فك الربط عند الحاجة
- معاينة الفيديو قبل الربط
- حالات الفيديو: ready / processing / failed

### 📖 للطالب
- صفحة "الدروس" تعرض كل الدروس المرتبة
- Video Player احترافي داخل صفحة الدرس
- لا يظهر أي رابط خارجي أو اسم سيرفر
- Loading state + Error handling + Retry

---

## 🔗 كيفية الربط

```
Admin → إدارة الفيديوهات → رفع فيديو → ربط بدرس
                                    ↓
                              lessonVideos (Firestore)
                                    ↓
Student → الدروس → اختار الدرس → يشغل الفيديو
                                    ↓
                              Video Server API (Stream)
```

---

## 📞 الدعم

- **واتساب:** [20 11 48865176](https://wa.me/201148865176)
- **© 2026 HM هوية**
