import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bold,
  Columns2,
  Download,
  Eye,
  FileQuestion,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Pencil,
  Plus,
  Presentation,
  Printer,
  Quote,
  Save,
  SeparatorHorizontal,
  Sigma,
  Table,
  Trash2,
  Upload,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { MathText, Tex } from '../components/MathText.jsx';
import Modal from '../components/Modal.jsx';
import QuestionView from '../components/QuestionView.jsx';
import { useQuestionFilter } from './QuestionBank.jsx';
import { questionToMarkdown } from '../lib/quiz.js';
import { downloadText } from '../lib/exporters.js';
import { useToast } from '../components/Toast.jsx';

const MATH_SNIPPETS = [
  { tex: '\\frac{a}{b}', ins: '\\dfrac{${a}}{b}' },
  { tex: '\\sqrt{x}', ins: '\\sqrt{${x}}' },
  { tex: '\\sqrt[n]{x}', ins: '\\sqrt[${n}]{x}' },
  { tex: 'x^{n}', ins: '^{${n}}' },
  { tex: 'x_{n}', ins: '_{${n}}' },
  { tex: '\\int_a^b', ins: '\\displaystyle\\int_{${a}}^{b} f(x)\\,dx' },
  { tex: '\\sum', ins: '\\sum\\limits_{${k=1}}^{n}' },
  { tex: '\\lim', ins: '\\lim\\limits_{x \\to ${+\\infty}}' },
  { tex: '\\overrightarrow{AB}', ins: '\\overrightarrow{${AB}}' },
  { tex: '\\widehat{ABC}', ins: '\\widehat{${ABC}}' },
  { tex: '\\begin{cases}\\end{cases}', label: 'Hệ', ins: '\\begin{cases} ${x + y = 1} \\\\ x - y = 0 \\end{cases}' },
  { tex: '\\left[\\right.', label: 'Tuyển', ins: '\\left[\\begin{array}{l} ${x = 1} \\\\ x = 2 \\end{array}\\right.' },
  { tex: '\\Leftrightarrow', ins: '\\Leftrightarrow ' },
  { tex: '\\Rightarrow', ins: '\\Rightarrow ' },
  { tex: '\\le', ins: '\\le ' },
  { tex: '\\ge', ins: '\\ge ' },
  { tex: '\\ne', ins: '\\ne ' },
  { tex: '\\infty', ins: '\\infty' },
  { tex: '\\in', ins: '\\in ' },
  { tex: '\\mathbb{R}', ins: '\\mathbb{R}' },
  { tex: '\\perp', ins: '\\perp ' },
  { tex: '\\parallel', ins: '\\parallel ' },
  { tex: '\\alpha', ins: '\\alpha' },
  { tex: '\\pi', ins: '\\pi' },
  { tex: '\\Delta', ins: '\\Delta' },
  { tex: '^\\circ', ins: '^\\circ' },
];

const BLOCKS = [
  { label: 'Định nghĩa', md: '> **Định nghĩa.** ' },
  { label: 'Định lí', md: '> **Định lí.** ' },
  { label: 'Tính chất', md: '> **Tính chất.** ' },
  { label: 'Chú ý', md: '> **Chú ý.** ' },
  { label: 'Ví dụ', md: '**Ví dụ.** ' },
  { label: 'Lời giải', md: '*Lời giải.* ' },
  { label: 'Bài tập', md: '### Bài tập\n\n**Bài 1.** ' },
];

function ImageLibrary({ onPick, onClose }) {
  const toast = useToast();
  const [imgs, setImgs] = useState([]);
  const load = () => api.images.list().then(setImgs);
  useEffect(() => {
    load();
  }, []);
  return (
    <Modal title="Thư viện hình" wide onClose={onClose}>
      <div className="mb-3 flex items-center gap-2">
        <label className="btn btn-primary cursor-pointer">
          <Upload size={16} /> Tải ảnh lên
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files[0];
              if (!f) return;
              try {
                await api.images.upload(f);
                load();
              } catch (err) {
                toast(err.message, 'error');
              }
            }}
          />
        </label>
        <span className="text-sm text-slate-500">Hình vẽ từ các công cụ (nút “Lưu thư viện”) cũng xuất hiện ở đây. Bấm vào ảnh để chèn.</span>
      </div>
      {!imgs.length && <div className="p-8 text-center text-slate-400">Thư viện trống.</div>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {imgs.map((im) => (
          <div key={im.id} className="group relative overflow-hidden rounded-lg border border-slate-200">
            <button className="block w-full" onClick={() => onPick(im)}>
              <img src={im.url} alt={im.name} className="h-36 w-full bg-white object-contain" />
              <div className="truncate border-t border-slate-100 px-2 py-1 text-left text-xs text-slate-600">{im.name}</div>
            </button>
            <button
              className="absolute top-1 right-1 hidden rounded bg-white/90 p-1 text-rose-600 shadow group-hover:block"
              onClick={async () => {
                if (!window.confirm('Xoá ảnh này?')) return;
                await api.images.remove(im.id);
                load();
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function QuestionPicker({ onPick, onClose }) {
  const [list, setList] = useState([]);
  const [withAns, setWithAns] = useState(false);
  const [sel, setSel] = useState([]);
  useEffect(() => {
    api.questions.list().then(setList);
  }, []);
  const { filtered, bar } = useQuestionFilter(list);
  return (
    <Modal
      wide
      title="Chèn câu hỏi từ ngân hàng"
      onClose={onClose}
      footer={
        <>
          <label className="mr-auto flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={withAns} onChange={(e) => setWithAns(e.target.checked)} /> Kèm đáp án và lời giải
          </label>
          <button className="btn" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn btn-primary" disabled={!sel.length} onClick={() => onPick(sel.map((id) => list.find((q) => q.id === id)), withAns)}>
            Chèn {sel.length} câu
          </button>
        </>
      }
    >
      {bar}
      <div className="mt-3 space-y-2">
        {filtered.map((q) => (
          <label key={q.id} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${sel.includes(q.id) ? 'border-brand-400 bg-brand-50/50' : 'border-slate-200'}`}>
            <input type="checkbox" checked={sel.includes(q.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, q.id] : s.filter((x) => x !== q.id)))} />
            <div className="min-w-0 flex-1">
              <QuestionView q={q} meta />
            </div>
          </label>
        ))}
      </div>
    </Modal>
  );
}

function exportHtml(title, html) {
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><title>${title}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css">
<style>
body{font-family:'Times New Roman',serif;max-width:820px;margin:40px auto;padding:0 20px;line-height:1.6;color:#111;font-size:17px}
h1{color:#14532d}h2{color:#15803d}blockquote{border-left:4px solid #22c55e;background:#f0fdf4;margin:12px 0;padding:6px 14px}
table{border-collapse:collapse}td,th{border:1px solid #999;padding:4px 10px}img{max-width:100%;display:block;margin:8px auto}
hr{border:none;border-top:1px dashed #bbb;margin:24px 0}
</style></head><body>${html}</body></html>`;
}

export default function Lectures() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [list, setList] = useState([]);
  const [doc, setDoc] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState('split');
  const [modal, setModal] = useState(null);
  const taRef = useRef(null);
  const previewRef = useRef(null);

  const loadList = useCallback(() => api.lectures.list().then(setList), []);

  useEffect(() => {
    loadList().catch((e) => toast('Không tải được dữ liệu: ' + e.message, 'error'));
  }, [loadList, toast]);

  useEffect(() => {
    if (!id) {
      setDoc(null);
      return;
    }
    api.lectures
      .get(id)
      .then((d) => {
        setDoc(d);
        setDirty(false);
      })
      .catch(() => navigate('/bai-giang'));
  }, [id, navigate]);

  // Nếu chưa chọn bài, mở bài đầu tiên
  useEffect(() => {
    if (!id && list.length) navigate(`/bai-giang/${list[0].id}`, { replace: true });
  }, [id, list, navigate]);

  const update = (patch) => {
    setDoc((d) => ({ ...d, ...patch }));
    setDirty(true);
  };

  const save = useCallback(async () => {
    if (!doc) return;
    try {
      const { title, content, grade, subject } = doc;
      await api.lectures.update(doc.id, { title, content, grade, subject });
      setDirty(false);
      loadList();
      toast('Đã lưu bài giảng');
    } catch (e) {
      toast('Lỗi khi lưu: ' + e.message, 'error');
    }
  }, [doc, loadList, toast]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  const createNew = async () => {
    const d = await api.lectures.create({ title: 'Bài giảng mới', content: '# Bài giảng mới\n\n', grade: 12, subject: '' });
    await loadList();
    navigate(`/bai-giang/${d.id}`);
  };

  const remove = async () => {
    if (!window.confirm(`Xoá bài giảng “${doc.title}”?`)) return;
    await api.lectures.remove(doc.id);
    await loadList();
    navigate('/bai-giang');
  };

  /** Chèn văn bản tại vị trí con trỏ. Chuỗi “${…}” đánh dấu phần được bôi đen sau khi chèn. */
  const insert = (text, { wrap = null, line = false } = {}) => {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const selected = value.slice(s, e);
    let ins;
    let selStart;
    let selEnd;
    if (wrap) {
      const inner = selected || wrap[2] || '';
      ins = wrap[0] + inner + wrap[1];
      selStart = s + wrap[0].length;
      selEnd = selStart + inner.length;
    } else {
      const m = /\$\{([^}]*)\}/.exec(text);
      const placeholder = m ? m[1] : '';
      const before = m ? text.slice(0, m.index) : text;
      const after = m ? text.slice(m.index + m[0].length) : '';
      const mid = selected || placeholder;
      let prefix = '';
      if (line && s > 0 && value[s - 1] !== '\n') prefix = '\n';
      ins = prefix + before + mid + after;
      selStart = s + prefix.length + before.length;
      selEnd = selStart + mid.length;
    }
    const next = value.slice(0, s) + ins + value.slice(e);
    update({ content: next });
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  };

  const insertMath = (snippet) => {
    const ta = taRef.current;
    const { selectionStart: s, value } = ta;
    // nếu con trỏ đang trong $…$ thì chèn thẳng, ngược lại bọc trong $…$
    const before = value.slice(0, s);
    const inMath = ((before.match(/(?<!\\)\$/g) || []).length % 2) === 1;
    insert(inMath ? snippet : `$${snippet}$`);
  };

  const words = useMemo(() => (doc?.content || '').split(/\s+/).filter(Boolean).length, [doc]);

  const tb = (Icon, title, fn) => (
    <button className="rounded p-1.5 text-slate-600 hover:bg-slate-100" title={title} onClick={fn}>
      <Icon size={16} />
    </button>
  );

  return (
    <div className="flex h-full">
      <aside className="no-print hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center border-b border-slate-200 p-3">
          <h2 className="mr-auto font-semibold text-slate-700">Bài giảng</h2>
          <button className="btn btn-sm btn-primary" onClick={createNew}>
            <Plus size={14} /> Mới
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {list.map((l) => (
            <Link
              key={l.id}
              to={`/bai-giang/${l.id}`}
              className={`block rounded-lg px-3 py-2 text-sm ${l.id === id ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              <div className="truncate">{l.title || '(không tên)'}</div>
              <div className="text-[11px] text-slate-400">{new Date(l.updatedAt).toLocaleString('vi-VN')}</div>
            </Link>
          ))}
          {!list.length && (
            <div className="p-4 text-center text-sm text-slate-400">
              Chưa có bài giảng.
              <button className="btn btn-sm btn-primary mt-2" onClick={createNew}>
                Tạo bài đầu tiên
              </button>
            </div>
          )}
        </div>
      </aside>

      {doc ? (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
            <input
              className="min-w-48 flex-1 rounded-md border border-transparent px-2 py-1 text-lg font-semibold text-slate-800 outline-none hover:border-slate-200 focus:border-brand-400"
              value={doc.title}
              onChange={(e) => update({ title: e.target.value })}
            />
            <input
              className="input w-20"
              type="number"
              title="Lớp"
              placeholder="Lớp"
              value={doc.grade ?? ''}
              onChange={(e) => update({ grade: e.target.value })}
            />
            <div className="flex rounded-lg border border-slate-200 p-0.5">
              {[
                ['edit', Pencil, 'Soạn'],
                ['split', Columns2, 'Song song'],
                ['preview', Eye, 'Xem'],
              ].map(([v, Icon, t]) => (
                <button key={v} title={t} className={`rounded-md px-2 py-1 ${view === v ? 'bg-brand-100 text-brand-700' : 'text-slate-500'}`} onClick={() => setView(v)}>
                  <Icon size={15} />
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={!dirty}>
              <Save size={14} /> {dirty ? 'Lưu' : 'Đã lưu'}
            </button>
            <button className="btn btn-sm" onClick={() => window.open(`/bai-giang/${doc.id}/trinh-chieu`, '_blank')} title="Trình chiếu (các trang ngăn bởi ---)">
              <Presentation size={14} /> Trình chiếu
            </button>
            <button className="btn btn-sm" onClick={() => window.open(`/bai-giang/${doc.id}/in`, '_blank')}>
              <Printer size={14} /> In / PDF
            </button>
            <button className="btn btn-sm" onClick={() => downloadText(doc.content, `${doc.title}.md`, 'text/markdown;charset=utf-8')}>
              <Download size={14} /> .md
            </button>
            <button
              className="btn btn-sm"
              onClick={() => {
                const html = previewRef.current?.innerHTML || '';
                const abs = html.replace(/src="\/uploads\//g, `src="${location.origin}/uploads/`);
                downloadText(exportHtml(doc.title, abs), `${doc.title}.html`, 'text/html;charset=utf-8');
              }}
              disabled={view === 'edit'}
              title={view === 'edit' ? 'Bật chế độ xem để xuất HTML' : ''}
            >
              <Download size={14} /> .html
            </button>
            <button className="btn btn-sm btn-danger" onClick={remove}>
              <Trash2 size={14} />
            </button>
          </div>

          {view !== 'preview' && (
            <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-white px-2 py-1">
              {tb(Bold, 'Đậm', () => insert('', { wrap: ['**', '**', 'chữ đậm'] }))}
              {tb(Italic, 'Nghiêng', () => insert('', { wrap: ['*', '*', 'chữ nghiêng'] }))}
              {tb(Heading1, 'Tiêu đề 1', () => insert('# ${Tiêu đề}', { line: true }))}
              {tb(Heading2, 'Tiêu đề 2', () => insert('## ${Mục}', { line: true }))}
              {tb(List, 'Danh sách', () => insert('- ${ý}', { line: true }))}
              {tb(ListOrdered, 'Danh sách số', () => insert('1. ${ý}', { line: true }))}
              {tb(Quote, 'Khung', () => insert('> ${nội dung}', { line: true }))}
              {tb(Table, 'Bảng', () => insert('| ${Cột 1} | Cột 2 |\n|---|---|\n|  |  |\n', { line: true }))}
              {tb(SeparatorHorizontal, 'Ngắt trang trình chiếu (---)', () => insert('\n---\n\n', { line: true }))}
              <span className="mx-1 h-5 w-px bg-slate-200" />
              <button className="rounded px-2 py-1 font-serif text-sm text-slate-700 hover:bg-slate-100" onClick={() => insert('', { wrap: ['$', '$', 'x'] })} title="Công thức trong dòng">
                $x$
              </button>
              <button className="rounded px-2 py-1 font-serif text-sm text-slate-700 hover:bg-slate-100" onClick={() => insert('\n$$\n${công thức}\n$$\n', { line: true })} title="Công thức riêng dòng">
                $$
              </button>
              {tb(Sigma, 'Ký hiệu toán', () => setModal(modal === 'math' ? null : 'math'))}
              {tb(ImageIcon, 'Chèn hình', () => setModal('image'))}
              {tb(FileQuestion, 'Chèn câu hỏi', () => setModal('question'))}
              <span className="mx-1 h-5 w-px bg-slate-200" />
              {BLOCKS.map((b) => (
                <button key={b.label} className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100" onClick={() => insert(b.md + '${}', { line: true })}>
                  {b.label}
                </button>
              ))}
            </div>
          )}
          {modal === 'math' && view !== 'preview' && (
            <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
              {MATH_SNIPPETS.map((s) => (
                <button key={s.ins} className="min-w-9 rounded border border-slate-200 bg-white px-2 py-1 text-sm hover:border-brand-300" onClick={() => insertMath(s.ins)}>
                  {s.label ? <span className="text-xs">{s.label}</span> : <Tex>{s.tex}</Tex>}
                </button>
              ))}
            </div>
          )}

          <div className="flex min-h-0 flex-1">
            {view !== 'preview' && (
              <textarea
                ref={taRef}
                className={`h-full resize-none border-r border-slate-200 bg-white p-4 font-mono text-[13.5px] leading-relaxed outline-none ${view === 'split' ? 'w-1/2' : 'w-full'}`}
                value={doc.content}
                onChange={(e) => update({ content: e.target.value })}
                spellCheck={false}
              />
            )}
            {view !== 'edit' && (
              <div className={`h-full overflow-y-auto bg-slate-50 ${view === 'split' ? 'w-1/2' : 'w-full'}`}>
                <div ref={previewRef} className="mx-auto my-4 max-w-3xl rounded-xl bg-white p-6 shadow-sm lg:p-10">
                  <MathText>{doc.content}</MathText>
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-400">
            {words} từ · Ctrl+S để lưu · Dòng <code>---</code> ngắt trang khi trình chiếu
          </div>
        </div>
      ) : (
        <div className="grid flex-1 place-items-center text-slate-400">
          <button className="btn btn-primary" onClick={createNew}>
            <Plus size={16} /> Tạo bài giảng
          </button>
        </div>
      )}

      {modal === 'image' && (
        <ImageLibrary
          onClose={() => setModal(null)}
          onPick={(im) => {
            setModal(null);
            insert(`\n![${im.name}](${im.url})\n`, { line: true });
          }}
        />
      )}
      {modal === 'question' && (
        <QuestionPicker
          onClose={() => setModal(null)}
          onPick={(qs, withAns) => {
            setModal(null);
            insert('\n' + qs.map((q, i) => questionToMarkdown(q, i + 1, withAns)).join('\n') + '\n', { line: true });
          }}
        />
      )}
    </div>
  );
}
