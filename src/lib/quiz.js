export const LEVELS = [
  { id: 'NB', label: 'Nhận biết', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'TH', label: 'Thông hiểu', color: 'bg-sky-100 text-sky-700' },
  { id: 'VD', label: 'Vận dụng', color: 'bg-amber-100 text-amber-700' },
  { id: 'VDC', label: 'Vận dụng cao', color: 'bg-rose-100 text-rose-700' },
];

export const TYPES = [
  { id: 'mcq', label: 'Trắc nghiệm 4 lựa chọn', short: 'TN', part: 'PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn' },
  { id: 'tf', label: 'Đúng / Sai', short: 'Đ/S', part: 'PHẦN II. Câu trắc nghiệm đúng sai' },
  { id: 'short', label: 'Trả lời ngắn', short: 'TLN', part: 'PHẦN III. Câu trắc nghiệm trả lời ngắn' },
];

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
export const SUBS = ['a', 'b', 'c', 'd'];

export const levelOf = (id) => LEVELS.find((l) => l.id === id) || LEVELS[0];
export const typeOf = (id) => TYPES.find((t) => t.id === id) || TYPES[0];

export function emptyQuestion(type = 'mcq') {
  return {
    type,
    topic: '',
    grade: 12,
    level: 'NB',
    content: '',
    options: ['', '', '', ''],
    answer: type === 'short' ? '' : 0,
    statements: ['', '', '', ''],
    truth: [true, true, true, true],
    explanation: '',
  };
}

/* ---------- Nhập câu hỏi từ văn bản ---------- */

const RE_QUESTION = /^\s*Câu\s*\d+\s*[.:)]?\s*/gim;
const RE_OPTION = /^(\*?)([A-F])\s*[.)]\s*/;
const RE_STATEMENT = /^(\*?)([a-d])\s*\)\s*/;
const RE_ANSWER = /^(Đáp\s*án|ĐA)\s*[:.]\s*/i;
const RE_SOLUTION = /^(Lời\s*giải|Hướng\s*dẫn(\s*giải)?|Giải)\s*[:.]\s*/i;
const RE_LEVEL = /^Mức(\s*độ)?\s*[:.]\s*/i;
const RE_TOPIC = /^Chủ\s*đề\s*[:.]\s*/i;

/**
 * Định dạng hỗ trợ:
 *   Câu 1. Nội dung …
 *   A. …   *B. … (dấu * đánh dấu đáp án đúng)   C. …   D. …
 *   a) …  *b) …  (câu Đúng/Sai: dấu * = mệnh đề đúng)
 *   Đáp án: B | Đ S Đ S | 3,5
 *   Lời giải: …
 */
export function parseQuestions(text, defaults = {}) {
  const parts = text.split(RE_QUESTION);
  const out = [];
  const warnings = [];
  parts.slice(1).forEach((block, idx) => {
    const q = { ...emptyQuestion(), ...defaults, options: [], statements: [], truth: [] };
    const content = [];
    const expl = [];
    let mode = 'content';
    let answerText = null;
    let starIdx = -1;
    const lines = block.replace(/\r/g, '').split('\n');
    for (const raw of lines) {
      const line = raw.trim();
      if (mode === 'solution') {
        expl.push(raw);
        continue;
      }
      if (!line) {
        if (mode === 'content') content.push('');
        continue;
      }
      if (RE_SOLUTION.test(line)) {
        mode = 'solution';
        expl.push(line.replace(RE_SOLUTION, ''));
        continue;
      }
      if (RE_ANSWER.test(line)) {
        answerText = line.replace(RE_ANSWER, '').trim();
        continue;
      }
      if (RE_LEVEL.test(line)) {
        const v = line.replace(RE_LEVEL, '').trim().toUpperCase();
        const lv = LEVELS.find((l) => l.id === v || l.label.toUpperCase() === v);
        if (lv) q.level = lv.id;
        continue;
      }
      if (RE_TOPIC.test(line)) {
        q.topic = line.replace(RE_TOPIC, '').trim();
        continue;
      }
      if (RE_OPTION.test(line)) {
        // có thể nhiều phương án trên cùng một dòng
        const chunks = line.split(/\s+(?=\*?[B-F]\s*[.)]\s)/);
        for (const ch of chunks) {
          const m = RE_OPTION.exec(ch);
          if (!m) continue;
          if (m[1]) starIdx = q.options.length;
          q.options.push(ch.replace(RE_OPTION, '').trim());
        }
        mode = 'options';
        continue;
      }
      if (RE_STATEMENT.test(line)) {
        const m = RE_STATEMENT.exec(line);
        q.statements.push(line.replace(RE_STATEMENT, '').trim());
        q.truth.push(Boolean(m[1]));
        mode = 'statements';
        continue;
      }
      if (mode === 'content') content.push(raw);
      else if (mode === 'options' && q.options.length) q.options[q.options.length - 1] += ' ' + line;
      else if (mode === 'statements' && q.statements.length) q.statements[q.statements.length - 1] += ' ' + line;
    }
    q.content = content.join('\n').trim();
    q.explanation = expl.join('\n').trim();
    if (q.options.length >= 2) {
      q.type = 'mcq';
      let ans = starIdx;
      if (answerText) {
        const k = LETTERS.indexOf(answerText.charAt(0).toUpperCase());
        if (k >= 0) ans = k;
      }
      if (ans < 0) warnings.push(`Câu ${idx + 1}: chưa có đáp án đúng (dùng dấu * hoặc dòng “Đáp án: B”).`);
      q.answer = Math.max(0, ans);
      delete q.statements;
      delete q.truth;
    } else if (q.statements.length) {
      q.type = 'tf';
      if (answerText) {
        const marks = answerText.toUpperCase().match(/Đ|S|T|F/g) || [];
        marks.forEach((m, i) => {
          if (i < q.truth.length) q.truth[i] = m === 'Đ' || m === 'T';
        });
      }
      delete q.options;
      q.answer = null;
    } else if (answerText !== null) {
      q.type = 'short';
      q.answer = answerText;
      delete q.options;
      delete q.statements;
      delete q.truth;
    } else {
      warnings.push(`Câu ${idx + 1}: không nhận ra phương án / mệnh đề / đáp án — bỏ qua.`);
      return;
    }
    if (!q.content) warnings.push(`Câu ${idx + 1}: thiếu nội dung.`);
    out.push(q);
  });
  if (!parts.slice(1).length) warnings.push('Không tìm thấy câu hỏi nào (mỗi câu bắt đầu bằng “Câu 1.”, “Câu 2:” …).');
  return { questions: out, warnings };
}

/** Xuất một câu hỏi ra Markdown (dùng để chèn vào bài giảng). */
export function questionToMarkdown(q, num = null, withAnswer = false) {
  let s = `**Câu${num ? ' ' + num : ''}.** ${q.content}\n\n`;
  if (q.type === 'mcq') {
    s += q.options.map((o, i) => `**${LETTERS[i]}.** ${o}`).join('&emsp;&emsp;') + '\n\n';
    if (withAnswer) s += `*Đáp án:* **${LETTERS[q.answer]}**\n\n`;
  } else if (q.type === 'tf') {
    s += q.statements.map((st, i) => `${SUBS[i]}) ${st}${withAnswer ? ` — **${q.truth[i] ? 'Đúng' : 'Sai'}**` : ''}`).join('\n\n') + '\n\n';
  } else if (withAnswer) s += `*Đáp án:* **${q.answer}**\n\n`;
  if (withAnswer && q.explanation) s += `*Lời giải.* ${q.explanation}\n\n`;
  return s;
}

/* ---------- Trộn đề ---------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rnd) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tạo một mã đề. code = null → đề gốc (không trộn).
 * Trả về { code, parts: [{ type, items: [question đã trộn] }] }
 */
export function buildVersion(exam, bank, code = null) {
  const rnd = mulberry32(code ? Number(code) * 7919 + (exam.seed || 1) : 1);
  const qs = (exam.questionIds || []).map((id) => bank[id]).filter(Boolean);
  const parts = TYPES.map((t) => {
    let items = qs.filter((q) => q.type === t.id);
    if (code && exam.shuffleQuestions !== false) items = shuffle(items, rnd);
    items = items.map((q) => {
      if (q.type !== 'mcq' || !code || exam.shuffleOptions === false) return q;
      const order = shuffle(
        q.options.map((_, i) => i),
        rnd,
      );
      return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
    });
    return { type: t.id, items };
  }).filter((p) => p.items.length);
  return { code, parts };
}

export function versionCodes(exam) {
  const n = Math.max(1, Math.min(24, Number(exam.versions) || 1));
  const start = Number(exam.firstCode) || 101;
  return Array.from({ length: n }, (_, i) => String(start + i));
}

/* ---------- Chấm điểm (theo cấu trúc 2025) ---------- */

export const POINTS = { mcq: 0.25, tf: 1, short: 0.5 };
const TF_SCALE = [0, 0.1, 0.25, 0.5, 1];

export function normalizeShort(s) {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(',', '.')
    .toLowerCase();
}

export function shortCorrect(given, answer) {
  const a = normalizeShort(given);
  const b = normalizeShort(answer);
  if (!a) return false;
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return Math.abs(na - nb) < 1e-9;
  return a === b;
}

export function scoreQuestion(q, resp) {
  if (q.type === 'mcq') return resp === q.answer ? POINTS.mcq : 0;
  if (q.type === 'short') return shortCorrect(resp, q.answer) ? POINTS.short : 0;
  if (q.type === 'tf') {
    const k = q.truth.filter((t, i) => resp && resp[i] === t).length;
    const total = q.truth.length;
    return total === 4 ? TF_SCALE[k] : (k / total) * POINTS.tf;
  }
  return 0;
}

export function maxScore(version) {
  return version.parts.reduce((s, p) => s + p.items.length * POINTS[p.type], 0);
}

export const fmtScore = (v) => (Math.round(v * 100) / 100).toString().replace('.', ',');
