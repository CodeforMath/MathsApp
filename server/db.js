import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

/** Bộ lưu trữ đơn giản: mỗi collection là một file JSON. */
export class Collection {
  constructor(file, seed = []) {
    this.file = file;
    if (fs.existsSync(file)) {
      this.items = JSON.parse(fs.readFileSync(file, 'utf8'));
    } else {
      const now = new Date().toISOString();
      this.items = seed.map((s) => ({ ...s, id: randomUUID(), createdAt: now, updatedAt: now }));
      this.save();
    }
  }

  save() {
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.items, null, 2));
    fs.renameSync(tmp, this.file);
  }

  all() {
    return [...this.items].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }

  get(id) {
    return this.items.find((i) => i.id === id) || null;
  }

  create(data = {}) {
    const now = new Date().toISOString();
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = data;
    const item = { ...rest, id: randomUUID(), createdAt: now, updatedAt: now };
    this.items.push(item);
    this.save();
    return item;
  }

  createMany(list = []) {
    const now = new Date().toISOString();
    const created = list.map(({ id: _id, createdAt: _c, updatedAt: _u, ...rest }) => ({
      ...rest,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    }));
    this.items.push(...created);
    this.save();
    return created;
  }

  update(id, data = {}) {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = data;
    this.items[idx] = { ...this.items[idx], ...rest, updatedAt: new Date().toISOString() };
    this.save();
    return this.items[idx];
  }

  remove(id) {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) return false;
    this.items.splice(idx, 1);
    this.save();
    return true;
  }
}
