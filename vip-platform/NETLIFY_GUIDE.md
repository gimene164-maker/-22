# 🚀 نشر VIP على Netlify

## ⚡ خطوات النشر

### 1. ارفع الملفات على Netlify
- ادخل على https://app.netlify.com/drop
- اسحب مجلد `vip-platform` وأفلته في المربع
- أو استخدم GitHub: Connect to GitHub → اختار الـ repo

### 2. تفعيل Firebase (ضروري!)
الموقع هيفتح بس مش هيشتغل لو Firebase مش مفعل:

1. افتح https://console.firebase.google.com/project/elite3-v2
2. فعّل **Firestore Database** → Create database
3. فعّل **Authentication** → Email/Password ON
4. أضف user: `admin@elite3.local`
5. Firestore → Rules → انسخ القواعد من `FIREBASE_SETUP.md`

### 3. جرب الموقع
- افتح الرابط اللي Netlify داهلك
- ادخل كأدمن: **0VIP0**

---

## ❌ لو مش شغال

### المشكلة 1: صفحة بيضاء
**السبب:** Firebase مش محمل أو مش مفعل
**الحل:** فعّل Firebase (الخطوة 2 فوق)

### المشكلة 2: "404 Not Found" عند التنقل
**السبب:** Netlify مش بيعرف إن ده SPA
**الحل:** تم إضافة `netlify.toml` و `_redirects` — ارفع الملفات تاني

### المشكلة 3: "Firebase Error"
**السبب:** Firestore Rules مش مضبوطة
**الحل:** انسخ Rules من `FIREBASE_SETUP.md`

---

## 🔗 رابط المشروع

بعد النشر، الموقع هيشتغل على:
```
https://your-site-name.netlify.app
```

---

## 📞 الدعم

**واتساب:** [20 11 48865176](https://wa.me/201148865176)
