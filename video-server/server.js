/* ============================================
   VIP Video Server — Backend API
   ============================================

   هذا السيرفر مسؤول عن:
   - رفع الفيديوهات
   - تخزينها محليًا (uploads/)
   - تقديم API لمنصة VIP

   تشغيل:
   npm install
   npm start

   الـ API يشتغل على: http://localhost:3001
   ============================================ */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Serve uploaded videos statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// In-memory video database (JSON file for persistence)
const DB_PATH = path.join(__dirname, 'videos.json');

function loadVideos() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (e) { console.error('DB load error:', e); }
  return [];
}

function saveVideos(videos) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(videos, null, 2));
  } catch (e) { console.error('DB save error:', e); }
}

let videos = loadVideos();

// Multer for file uploads
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const id = uuidv4();
    cb(null, `${id}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/webm', 'video/ogg', 'video/mov'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only video files allowed'), false);
  }
});

/* ============================================
   API ROUTES
   ============================================ */

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'VIP Video Server', version: '1.0.0' });
});

// Upload video
app.post('/api/videos/upload', upload.single('video'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video file provided' });

    const { title, description, teacherId, subject, grade } = req.body;
    const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const videoData = {
      id: videoId,
      title: title || 'Untitled Video',
      description: description || '',
      teacherId: teacherId || '',
      subject: subject || '',
      grade: grade || '',
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
      status: 'ready', // ready, processing, failed
      duration: 0, // TODO: extract duration
      thumbnailUrl: '', // TODO: generate thumbnail
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    videos.push(videoData);
    saveVideos(videos);

    res.status(201).json({
      success: true,
      video: {
        id: videoData.id,
        title: videoData.title,
        url: videoData.url,
        status: videoData.status,
        createdAt: videoData.createdAt
      }
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed', message: err.message });
  }
});

// Get all videos
app.get('/api/videos', (req, res) => {
  const { search, teacherId, subject, grade, status } = req.query;
  let result = [...videos];

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(v => 
      v.title.toLowerCase().includes(q) || 
      v.id.toLowerCase().includes(q)
    );
  }
  if (teacherId) result = result.filter(v => v.teacherId === teacherId);
  if (subject) result = result.filter(v => v.subject === subject);
  if (grade) result = result.filter(v => v.grade === grade);
  if (status) result = result.filter(v => v.status === status);

  // Return safe data (no internal paths)
  const safe = result.map(v => ({
    id: v.id,
    title: v.title,
    description: v.description,
    teacherId: v.teacherId,
    subject: v.subject,
    grade: v.grade,
    status: v.status,
    duration: v.duration,
    thumbnailUrl: v.thumbnailUrl,
    createdAt: v.createdAt
  }));

  res.json({ videos: safe, total: safe.length });
});

// Get single video
app.get('/api/videos/:id', (req, res) => {
  const video = videos.find(v => v.id === req.params.id);
  if (!video) return res.status(404).json({ error: 'Video not found' });

  res.json({
    id: video.id,
    title: video.title,
    description: video.description,
    teacherId: video.teacherId,
    subject: video.subject,
    grade: video.grade,
    status: video.status,
    duration: video.duration,
    thumbnailUrl: video.thumbnailUrl,
    createdAt: video.createdAt
  });
});

// Stream video (for VIP player)
app.get('/api/videos/:id/stream', (req, res) => {
  const video = videos.find(v => v.id === req.params.id);
  if (!video) return res.status(404).json({ error: 'Video not found' });
  if (video.status !== 'ready') return res.status(403).json({ error: 'Video not ready' });

  const filePath = path.join(__dirname, 'uploads', video.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': video.mimetype || 'video/mp4'
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': video.mimetype || 'video/mp4'
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Update video
app.put('/api/videos/:id', (req, res) => {
  const idx = videos.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Video not found' });

  const allowed = ['title', 'description', 'teacherId', 'subject', 'grade', 'status', 'thumbnailUrl'];
  allowed.forEach(field => {
    if (req.body[field] !== undefined) videos[idx][field] = req.body[field];
  });
  videos[idx].updatedAt = new Date().toISOString();
  saveVideos(videos);

  res.json({ success: true, video: { id: videos[idx].id, title: videos[idx].title, status: videos[idx].status } });
});

// Delete video
app.delete('/api/videos/:id', (req, res) => {
  const idx = videos.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Video not found' });

  // Delete file
  const filePath = path.join(__dirname, 'uploads', videos[idx].filename);
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}

  videos.splice(idx, 1);
  saveVideos(videos);

  res.json({ success: true, message: 'Video deleted' });
});

/* ============================================
   ERROR HANDLING
   ============================================ */

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Server error', message: err.message });
});

/* ============================================
   START SERVER
   ============================================ */

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║     VIP Video Server is running!         ║
║                                          ║
║  API: http://localhost:${PORT}              ║
║                                          ║
║  Endpoints:                              ║
║  POST /api/videos/upload    → رفع فيديو ║
║  GET  /api/videos           → قائمة      ║
║  GET  /api/videos/:id       → بيانات     ║
║  GET  /api/videos/:id/stream→ تشغيل      ║
║  PUT  /api/videos/:id       → تعديل      ║
║  DELETE /api/videos/:id     → حذف        ║
╚══════════════════════════════════════════╝
  `);
});
