/*
 * Lưu trữ dữ liệu ngay trong trình duyệt (IndexedDB) để app chạy được trên GitHub Pages
 * mà không cần máy chủ. Dữ liệu nằm riêng trên từng máy / trình duyệt — dùng
 * “Sao lưu” / “Khôi phục” để chuyển sang máy khác.
 */
import { seedLectures, seedQuestions } from './seed.js';

const DB_NAME = 'mathsapp';
const DB_VERSION = 1;
const COLLECTIONS = ['lectures', 'questions', 'exams', 'images'];

const req = (r) =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

const done = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Giao dịch bị huỷ'));
  });

const uuid = () =>
  crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Trình duyệt không hỗ trợ lưu dữ liệu (IndexedDB). Hãy tắt chế độ ẩn danh hoặc dùng trình duyệt khác.'));
      return;
    }
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      for (const name of [...COLLECTIONS, 'meta']) {
        if (!d.objectStoreNames.contains(name)) d.createObjectStore(name, { keyPath: 'id' });
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error('Không mở được bộ nhớ trình duyệt'));
  }).then(async (d) => {
    await seedOnce(d);
    return d;
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function stamp(data, now = new Date().toISOString()) {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = data || {};
  return { ...rest, id: uuid(), createdAt: now, updatedAt: now };
}

/** Lần đầu mở app: thêm bài giảng và câu hỏi mẫu. */
async function seedOnce(d) {
  const tx = d.transaction(['meta', 'lectures', 'questions'], 'readwrite');
  const meta = tx.objectStore('meta');
  const flag = await req(meta.get('seeded'));
  if (!flag) {
    // id cố định: khôi phục bản sao lưu sang máy khác sẽ ghi đè thay vì nhân đôi dữ liệu mẫu
    seedLectures.forEach((s, i) => tx.objectStore('lectures').put({ ...stamp(s), id: `mau-bai-giang-${i + 1}` }));
    seedQuestions.forEach((s, i) => tx.objectStore('questions').put({ ...stamp(s), id: `mau-cau-hoi-${i + 1}` }));
    meta.put({ id: 'seeded', at: new Date().toISOString() });
  }
  await done(tx);
}

async function store(name, mode = 'readonly') {
  const d = await openDb();
  const tx = d.transaction(name, mode);
  return { tx, os: tx.objectStore(name) };
}

const byUpdated = (a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '');

function resource(name) {
  return {
    async list() {
      const { os } = await store(name);
      return (await req(os.getAll())).sort(byUpdated);
    },
    async get(id) {
      const { os } = await store(name);
      const item = await req(os.get(id));
      if (!item) throw new Error('Không tìm thấy');
      return item;
    },
    async create(data) {
      const item = stamp(data);
      const { tx, os } = await store(name, 'readwrite');
      os.put(item);
      await done(tx);
      return item;
    },
    async update(id, data) {
      const { tx, os } = await store(name, 'readwrite');
      const cur = await req(os.get(id));
      if (!cur) throw new Error('Không tìm thấy');
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = data || {};
      const item = { ...cur, ...rest, updatedAt: new Date().toISOString() };
      os.put(item);
      await done(tx);
      return item;
    },
    async remove(id) {
      const { tx, os } = await store(name, 'readwrite');
      os.delete(id);
      await done(tx);
      return { ok: true };
    },
  };
}

async function bulkCreate(name, list) {
  const now = new Date().toISOString();
  const items = (Array.isArray(list) ? list : []).map((x) => stamp(x, now));
  const { tx, os } = await store(name, 'readwrite');
  items.forEach((it) => os.put(it));
  await done(tx);
  return items;
}

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

const images = resource('images');

/** Ảnh được tham chiếu trong Markdown bằng “idb:<id>”. */
export const IMAGE_SCHEME = 'idb:';

export const api = {
  lectures: resource('lectures'),
  questions: { ...resource('questions'), bulk: (list) => bulkCreate('questions', list) },
  exams: resource('exams'),
  images: {
    list: async () => (await images.list()).map((im) => ({ ...im, url: im.dataUrl, ref: IMAGE_SCHEME + im.id })),
    remove: images.remove,
    get: images.get,
    saveDataUrl: (dataUrl, name) => {
      if (!/^data:image\//.test(dataUrl || '')) return Promise.reject(new Error('Ảnh không hợp lệ'));
      return images.create({ name: name || 'Hình', dataUrl });
    },
    upload: async (file) => {
      if (!file.type.startsWith('image/')) throw new Error('Chỉ nhận file ảnh');
      if (file.size > 10 * 1024 * 1024) throw new Error('Ảnh lớn hơn 10 MB');
      return images.create({ name: file.name, dataUrl: await fileToDataUrl(file) });
    },
  },

  /* ---------- Sao lưu / khôi phục ---------- */
  async exportAll() {
    const d = await openDb();
    const tx = d.transaction(COLLECTIONS, 'readonly');
    const out = { app: 'MathsApp', version: 1, exportedAt: new Date().toISOString() };
    for (const name of COLLECTIONS) out[name] = await req(tx.objectStore(name).getAll());
    return out;
  },
  /** Gộp dữ liệu từ file sao lưu (trùng id thì ghi đè). Trả về số bản ghi đã nhập. */
  async importAll(data) {
    if (!data || data.app !== 'MathsApp') throw new Error('File không phải bản sao lưu của MathsApp');
    const d = await openDb();
    const tx = d.transaction(COLLECTIONS, 'readwrite');
    let n = 0;
    for (const name of COLLECTIONS) {
      for (const item of Array.isArray(data[name]) ? data[name] : []) {
        if (!item || !item.id) continue;
        tx.objectStore(name).put(item);
        n++;
      }
    }
    await done(tx);
    return n;
  },
};
