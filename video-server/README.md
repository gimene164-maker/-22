# 🎬 VIP Video Server

سيرفر Node.js/Express لإدارة ورفع الفيديوهات وربطها بمنصة VIP.

---

## ⚡ تشغيل السيرفر

### 1. تثبيت الحزم

```bash
cd video-server
npm install
```

### 2. تشغيل

```bash
npm start
```

السيرفر هيشتغل على: `http://localhost:3001`

---

## 📡 API Endpoints

| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/videos/upload` | رفع فيديو جديد |
| GET | `/api/videos` | قائمة الفيديوهات |
| GET | `/api/videos/:id` | بيانات فيديو |
| GET | `/api/videos/:id/stream` | تشغيل/ستريم الفيديو |
| PUT | `/api/videos/:id` | تعديل بيانات الفيديو |
| DELETE | `/api/videos/:id` | حذف الفيديو |

---

## 🔗 ربط بمنصة VIP

1. شغّل السيرفر أولًا: `npm start`
2. افتح منصة VIP في المتصفح
3. من لوحة الأدمن: **إدارة الفيديوهات**
4. ارفع فيديو أو اربط فيديو موجود بدرس

---

## ⚙️ الإعدادات

### تغيير رقم البورت

في `server.js`:
```javascript
const PORT = process.env.PORT || 3001;
```

### في الإنتاج (Production)

غيّر الرابط في `vip-platform/js/db.js`:

```javascript
const VIDEO_SERVER_URL = 'https://your-domain.com';
```

---

## 📁 التخزين

- الفيديوهات بتتخزن في مجلد `uploads/`
- البيانات بتتخزن في `videos.json`
- في الإنتاج: استخدم خدمة تخزين سحابي (AWS S3, Cloudflare R2, إلخ)

---

## 🔒 الأمان

- في الإنتاج: أضف API Key أو JWT Authentication
- حدد `cors.origin` بدل `*`
- استخدم HTTPS
