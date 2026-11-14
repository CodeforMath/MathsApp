import { useEffect, useMemo, useState } from 'react';
import { Download, FileUp, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { api } from '../lib/api.js';
import { LEVELS, TYPES, parseQuestions } from '../lib/quiz.js';
import QuestionView from '../components/QuestionView.jsx';
import QuestionEditor from '../components/QuestionEditor.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { downloadText } from '../lib/exporters.js';

const SAMPLE_IMPORT = `Câu 1. Đạo hàm của hàm số $y = x^3 - 2x$ là
A. $y' = 3x^2 - 2x$
*B. $y' = 3x^2 - 2$
C. $y' = x^2 - 2$
D. $y' = 3x - 2$
Lời giải: $y' = 3x^2 - 2$.

Câu 2. Cho hàm số $y = x^4 - 2x^2$. Xét tính đúng sai:
*a) Hàm số có 3 điểm cực trị.
b) Giá trị cực đại bằng $-1$.
*c) Hàm số đồng biến trên $(1; +\\infty)$.
d) Đồ thị có tiệm cận ngang.

Câu 3. Tính $\\displaystyle\\int_0^2 x\\,dx$.
Đáp án: 2
Mức độ: NB`;

export function useQuestionFilter(list) {
  const [f, setF] = useState({ q: '', type: '', level: '', topic: '' });
  const topics = useMemo(() => [...new Set(list.map((x) => x.topic).filter(Boolean))].sort(), [list]);
  const filtered = useMemo(() => {
    const s = f.q.trim().toLowerCase();
    return list.filter(
      (x) =>
        (!f.type || x.type === f.type) &&
        (!f.level || x.level === f.level) &&
        (!f.topic || x.topic === f.topic) &&
        (!s || [x.content, x.topic, ...(x.options || []), ...(x.statements || [])].join(' ').toLowerCase().includes(s)),
    );
  }, [list, f]);
  const bar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-48 flex-1">
        <Search size={14} className="absolute top-2.5 left-2.5 text-slate-400" />
        <input className="input pl-8" placeholder="Tìm nội dung…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
      </div>
      <select className="input w-auto" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
        <option value="">Mọi dạng</option>
        {TYPES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      <select className="input w-auto" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })}>
        <option value="">Mọi mức độ</option>
        {LEVELS.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
      <select className="input w-auto" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })}>
        <option value="">Mọi chủ đề</option>
        {topics.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
  return { filtered, bar, topics };
}

function ImportModal({ topics, onClose, onDone }) {
  const toast = useToast();
  const [text, setText] = useState(SAMPLE_IMPORT);
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState(12);
  const [level, setLevel] = useState('TH');
  const parsed = useMemo(() => parseQuestions(text, { topic, grade: Number(grade) || null, level }), [text, topic, grade, level]);

  const submit = async () => {
    try {
      const created = await api.questions.bulk(parsed.questions);
      toast(`Đã nhập ${created.length} câu hỏi`);
      onDone();
    } catch (e) {
      toast('Lỗi: ' + e.message, 'error');
    }
  };

  return (
    <Modal
      wide
      title="Nhập nhanh câu hỏi từ văn bản"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn btn-primary" disabled={!parsed.questions.length} onClick={submit}>
            Nhập {parsed.questions.length} câu
          </button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            Mỗi câu bắt đầu bằng <b>Câu 1.</b> / <b>Câu 2:</b> … · Phương án <b>A. B. C. D.</b> (đặt dấu <b>*</b> trước đáp án đúng, hoặc dòng{' '}
            <b>Đáp án: B</b>) · Câu Đúng/Sai dùng <b>a) b) c) d)</b>, dấu <b>*</b> cho mệnh đề đúng · Câu trả lời ngắn chỉ cần dòng <b>Đáp án: …</b> · Thêm{' '}
            <b>Lời giải:</b>, <b>Mức độ: NB/TH/VD/VDC</b>, <b>Chủ đề: …</b> nếu muốn.
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label">Chủ đề mặc định</label>
              <input className="input" list="topic-list2" value={topic} onChange={(e) => setTopic(e.target.value)} />
              <datalist id="topic-list2">
                {topics.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label">Lớp</label>
              <input className="input" type="number" value={grade} onChange={(e) => setGrade(e.target.value)} />
            </div>
            <div>
              <label className="label">Mức độ mặc định</label>
              <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <textarea className="input min-h-96 font-mono text-[13px]" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div>
          <div className="label">Kết quả nhận dạng ({parsed.questions.length} câu)</div>
          {parsed.warnings.length > 0 && (
            <div className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
              {parsed.warnings.map((w) => (
                <div key={w}>⚠ {w}</div>
              ))}
            </div>
          )}
          <div className="space-y-3">
            {parsed.questions.map((q, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                <QuestionView q={q} num={i + 1} showAnswer showExplanation meta />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function QuestionBank() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | {} | question
  const [importing, setImporting] = useState(false);
  const [showAns, setShowAns] = useState(true);
  const { filtered, bar, topics } = useQuestionFilter(list);

  const load = () =>
    api.questions
      .list()
      .then(setList)
      .catch((e) => toast('Không tải được dữ liệu: ' + e.message, 'error'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (data) => {
    try {
      if (editing?.id) await api.questions.update(editing.id, data);
      else await api.questions.create(data);
      toast('Đã lưu câu hỏi');
      setEditing(null);
      load();
    } catch (e) {
      toast('Lỗi: ' + e.message, 'error');
    }
  };

  const remove = async (q) => {
    if (!window.confirm('Xoá câu hỏi này?')) return;
    await api.questions.remove(q.id);
    load();
  };

  const importJson = (file) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error('File phải chứa một mảng câu hỏi');
        const created = await api.questions.bulk(data);
        toast(`Đã nhập ${created.length} câu hỏi`);
        load();
      } catch (e) {
        toast('Lỗi: ' + e.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  const stats = TYPES.map((t) => ({ ...t, n: list.filter((q) => q.type === t.id).length }));

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-bold text-slate-800">Ngân hàng câu hỏi</h1>
        <button className="btn btn-primary" onClick={() => setEditing({})}>
          <Plus size={16} /> Thêm câu hỏi
        </button>
        <button className="btn" onClick={() => setImporting(true)}>
          <FileUp size={16} /> Nhập từ văn bản
        </button>
        <label className="btn cursor-pointer">
          <Upload size={16} /> Nhập JSON
          <input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files[0] && importJson(e.target.files[0])} />
        </label>
        <button className="btn" onClick={() => downloadText(JSON.stringify(list, null, 2), 'ngan-hang-cau-hoi.json', 'application/json')}>
          <Download size={16} /> Xuất JSON
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
        <span>
          Tổng: <b className="text-slate-700">{list.length}</b> câu
        </span>
        {stats.map((s) => (
          <span key={s.id}>
            {s.label}: <b className="text-slate-700">{s.n}</b>
          </span>
        ))}
      </div>

      <div className="card mt-4 p-3">
        {bar}
        <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showAns} onChange={(e) => setShowAns(e.target.checked)} /> Hiện đáp án và lời giải
        </label>
      </div>

      <div className="mt-4 space-y-3">
        {loading && <div className="text-slate-500">Đang tải…</div>}
        {!loading && !filtered.length && <div className="card p-8 text-center text-slate-500">Chưa có câu hỏi phù hợp.</div>}
        {filtered.map((q, i) => (
          <div key={q.id} className="card group p-4">
            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                <QuestionView q={q} num={i + 1} showAnswer={showAns} showExplanation={showAns} meta />
              </div>
              <div className="flex shrink-0 flex-col gap-1 opacity-60 group-hover:opacity-100">
                <button className="btn btn-sm" onClick={() => setEditing(q)} title="Sửa">
                  <Pencil size={14} />
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => remove(q)} title="Xoá">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && <QuestionEditor initial={editing} topics={topics} onSave={save} onClose={() => setEditing(null)} />}
      {importing && (
        <ImportModal
          topics={topics}
          onClose={() => setImporting(false)}
          onDone={() => {
            setImporting(false);
            load();
          }}
        />
      )}
    </div>
  );
}
