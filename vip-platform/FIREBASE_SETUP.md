# 🔥 إعداد مشروع Firebase — VIP Platform

## ✅ المشروع المتصل

- **Project ID:** `elite3-v2`
- **Auth Domain:** `elite3-v2.firebaseapp.com`
- **App ID:** `1:166500295362:web:39aeb10ca2cf7bac6fd15b`

---

## ⚡ الخطوات اللي لازم تعملها (3 خطوات فقط!)

> 💡 **مش محتاج Storage!** الصور بتتخزن في Firestore نفسه (Base64) أو عن طريق رابط URL.

### 1️⃣ افتح مشروعك

🔗 [اضغط هنا لفتح Firebase Console](https://console.firebase.google.com/project/elite3-v2)

---

### 2️⃣ فعّل Firestore Database

1. من القائمة على الشمال اضغط **Build → Firestore Database**
2. اضغط **"Create database"**
3. اختار **"Start in production mode"**
4. اختار الموقع: **eur3 (europe-west)**
5. اضغط **"Enable"**

---

### 3️⃣ فعّل Authentication

1. من القائمة: **Build → Authentication**
2. اضغط **"Get started"**
3. اختار **"Email/Password"**
4. شغّل المفتاح (Toggle) واضغط **Save**

#### أضف حساب الأدمن:

1. في Authentication → تاب **Users** → **Add user**
2. Email: `admin@elite3.local`
3. Password: `VIPadmin2026!` (أو أي باسورد قوي)
4. اضغط **"Add user"**

---

### 4️⃣ Firestore Security Rules (خطوة مهمة!)

1. Firestore Database → **Rules**
2. امسح كل اللي موجود والصق الكود ده:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && request.auth.token.email == 'admin@elite3.local';
    }
    match /teachers/{id} { allow read: if true; allow write: if isAdmin(); }
    match /videos/{id} { allow read: if true; allow write: if isAdmin(); }
    match /exams/{id} { allow read: if true; allow write: if isAdmin(); }
    match /books/{id} { allow read: if true; allow write: if isAdmin(); }
    match /boxes/{id} { allow read: if true; allow write: if isAdmin(); }
    match /codes/{id} { allow read: if true; allow create, delete: if isAdmin(); allow update: if isAdmin(); }
    match /students/{id} { allow read: if true; allow create, update: if true; allow delete: if isAdmin(); }
    match /results/{id} { allow read: if true; allow create: if true; allow update, delete: if isAdmin(); }
  }
}
```

3. اضغط **"Publish"**

---

## 🚀 تشغيل المشروع

```bash
npx serve .
```

> ⚠️ لازم تشغل من سيرفر، مش تفتح الملف مباشرة (`file://`)

---

## 🔑 أول دخول

| الدور | الكود |
|-------|-------|
| **أدمن** | `0VIP0` |
| **طالب** | أنشئ كود من Admin → الأكواد |

---

## 📸 الصور (بدون Storage!)

المنصة دلوقتي بتدعم طريقتين للصور **مجانًا 100%**:

### الطريقة 1: رابط URL (أسهل)
- ارفع الصورة على **Imgur** (imgur.com) أو **Google Drive**
- خد الرابط والصقه في حقل "رابط الصورة"

### الطريقة 2: رفع من الجهاز
- اضغط "اختر ملف" واختار الصورة
- الصورة هتتحول لـ Base64 وتتخزن في Firestore
- مش محتاج Storage!

---

## 📞 الدعم

- **واتساب:** [20 11 48865176](https://wa.me/201148865176)
- **© 2026 HM هوية**
