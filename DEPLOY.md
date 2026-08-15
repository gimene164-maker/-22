# 🚀 دليل النشر على Vercel + Render

## ⚠️ مهم جدًا

| المشروع | المنصة | الحالة |
|---------|--------|--------|
| **VIP Platform** (Frontend) | Vercel | ✅ يشتغل مباشرة |
| **Video Server** (Backend) | Render.com | ✅ مجاني + يشتغل 24/7 |

> الـ Video Server **مش** هيشتغل على Vercel. لازم Render.com أو Railway.

---

## الخطوة 1: نشر Video Server على Render.com

### 1.1 أنشئ حساب على Render
- ادخل على https://render.com
- سجّل بحساب GitHub

### 1.2 ارفع Video Server على GitHub
```bash
# في مجلد المشروع
cd video-server
git init
git add .
git commit -m "Initial commit"
# أنشئ repo على GitHub وارفع
git remote add origin https://github.com/YOUR_USERNAME/vip-video-server.git
git push -u origin main
```

### 1.3 أنشئ Web Service على Render
1. من Render Dashboard → **New +** → **Web Service**
2. اربط بـ GitHub repo بتاع `vip-video-server`
3. املأ البيانات:
   - **Name:** `vip-video-server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. في **Environment Variables** أضف:
   ```
   CORS_ORIGIN = https://your-vercel-domain.vercel.app
   ```
5. اضغط **Create Web Service**
6. استنى لحد ما يخلص Build (2-3 دقايق)
7. خد الرابط اللي ظهر (مثال: `https://vip-video-server.onrender.com`)

---

## الخطوة 2: نشر VIP Platform على Vercel

### 2.1 ارفع VIP Platform على GitHub
```bash
cd ../vip-platform
git init
git add .
git commit -m "VIP Platform ready"
git remote add origin https://github.com/YOUR_USERNAME/vip-platform.git
git push -u origin main
```

### 2.2 أنشئ Project على Vercel
1. ادخل على https://vercel.com
2. سجّل بحساب GitHub
3. اضغط **Add New Project**
4. اختار repo `vip-platform`
5. اضغط **Deploy** (مش محتاج تعديلات)
6. استنى لحد ما يخلص (30 ثانية)
7. خد الرابط (مثال: `https://vip-platform.vercel.app`)

---

## الخطوة 3: ربط الاتنين مع بعض

### 3.1 عدّل VIDEO_SERVER_URL
في ملف `vip-platform/js/db.js`:

```javascript
const VIDEO_SERVER_URL = (() => {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:3001';
  }
  // ← غيّر ده لرابط Render بتاعك
  return 'https://vip-video-server.onrender.com';
})();
```

### 3.2 عدّل CORS_ORIGIN في Render
في Render Dashboard → vip-video-server → Environment:
```
CORS_ORIGIN = https://vip-platform.vercel.app
```

### 3.3 ارفع التعديلات
```bash
cd vip-platform
git add .
git commit -m "Update video server URL"
git push
```
Vercel هيعمل Deploy تلقائي!

---

## ✅ بعد النشر

| الرابط | الوظيفة |
|--------|---------|
| `https://vip-platform.vercel.app` | المنصة (للطلاب والأدمن) |
| `https://vip-video-server.onrender.com/api/health` | التأكد إن السيرفر شغال |

---

## 🔥 خطوات سريعة (لو عندك GitHub already)

```bash
# 1. ارفع Video Server
cd video-server
git init && git add . && git commit -m "init"
# أنشئ repo على GitHub وارفع

# 2. ارفع VIP Platform
cd ../vip-platform
git init && git add . && git commit -m "init"
# أنشئ repo على GitHub وارفع

# 3. ربط Render + Vercel بالـ Repos
# 4. غيّر الرابط في db.js
# 5. ارفع تاني
```

---

## ⚠️ ملاحظات مهمة

### Render.com (مجاني)
- السيرفر بيحصل **Sleep** بعد 15 دقيقة من عدم الاستخدام
- أول طلب بعد Sleep بياخد 30-60 ثانية (بعدين بيرجع سريع)
- لو عايز يفضل شغال 24/7 → اختار خطة Starter ($7/شهر)

### Vercel (مجاني)
- Frontend شغال 24/7 بدون مشاكل
- Bandwidth: 100GB/شهر (أكثر من كفاية)

### Firebase (مجاني - Spark Plan)
- Firestore: 50K reads/day, 20K writes/day
- Auth: 10K users/month
- كفاية جدًا للبداية!

---

## 📞 الدعم

لو واجهتك أي مشكلة في النشر، ابعتلي:
- لقطة شاشة من الخطأ
- رابط الـ Repo
- رابط Render/Vercel

**واتساب:** [20 11 48865176](https://wa.me/201148865176)
