import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Collection } from './db.js';
import { seedLectures, seedQuestions } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DIST_DIR = path.join(__dirname, '..', 'dist');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const collections = {
  lectures: new Collection(path.join(DATA_DIR, 'lectures.json'), seedLectures),
  questions: new Collection(path.join(DATA_DIR, 'questions.json'), seedQuestions),
  exams: new Collection(path.join(DATA_DIR, 'exams.json')),
  images: new Collection(path.join(DATA_DIR, 'images.json')),
};

const app = express();
app.use(express.json({ limit: '25mb' }));

// ---------- Ảnh: upload file hoặc lưu từ dataURL (PNG/SVG xuất từ công cụ vẽ) ----------
const ALLOWED = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, randomUUID() + ALLOWED[file.mimetype]),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, Boolean(ALLOWED[file.mimetype])),
});

app.post('/api/images/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File ảnh không hợp lệ' });
  const item = collections.images.create({
    name: req.body?.name || req.file.originalname,
    url: `/uploads/${req.file.filename}`,
  });
  res.status(201).json(item);
});

app.post('/api/images/data', (req, res) => {
  const { dataUrl, name } = req.body || {};
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(dataUrl || '');
  if (!m || !ALLOWED[m[1]]) return res.status(400).json({ error: 'dataUrl không hợp lệ' });
  const filename = randomUUID() + ALLOWED[m[1]];
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), Buffer.from(m[2], 'base64'));
  const item = collections.images.create({ name: name || filename, url: `/uploads/${filename}` });
  res.status(201).json(item);
});

app.delete('/api/images/:id', (req, res) => {
  const img = collections.images.get(req.params.id);
  if (!img) return res.status(404).json({ error: 'Không tìm thấy' });
  const file = path.join(UPLOAD_DIR, path.basename(img.url));
  if (fs.existsSync(file)) fs.unlinkSync(file);
  collections.images.remove(img.id);
  res.json({ ok: true });
});

app.post('/api/questions/bulk', (req, res) => {
  const list = Array.isArray(req.body) ? req.body : [];
  res.status(201).json(collections.questions.createMany(list));
});

// ---------- CRUD chung ----------
for (const [name, col] of Object.entries(collections)) {
  app.get(`/api/${name}`, (_req, res) => res.json(col.all()));
  app.get(`/api/${name}/:id`, (req, res) => {
    const item = col.get(req.params.id);
    item ? res.json(item) : res.status(404).json({ error: 'Không tìm thấy' });
  });
  if (name === 'images') continue;
  app.post(`/api/${name}`, (req, res) => res.status(201).json(col.create(req.body)));
  app.put(`/api/${name}/:id`, (req, res) => {
    const item = col.update(req.params.id, req.body);
    item ? res.json(item) : res.status(404).json({ error: 'Không tìm thấy' });
  });
  app.delete(`/api/${name}/:id`, (req, res) => {
    col.remove(req.params.id) ? res.json({ ok: true }) : res.status(404).json({ error: 'Không tìm thấy' });
  });
}

app.use('/uploads', express.static(UPLOAD_DIR));

// ---------- Phục vụ bản build (production) ----------
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Lỗi máy chủ' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`MathsApp API chạy tại http://localhost:${PORT}`));
