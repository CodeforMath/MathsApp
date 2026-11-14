import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { api } from '../lib/api.js';
import { LETTERS, SUBS, buildVersion, typeOf, versionCodes } from '../lib/quiz.js';
import QuestionView from '../components/QuestionView.jsx';

const PART_HINT = {
  mcq: (n) => `Thí sinh trả lời từ câu 1 đến câu ${n}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.`,
  tf: (n) => `Thí sinh trả lời từ câu 1 đến câu ${n}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.`,
  short: (n) => `Thí sinh trả lời từ câu 1 đến câu ${n}.`,
};

function Header({ exam, code }) {
  return (
    <div className="mb-4">
      <table className="w-full text-center text-[15px]">
        <tbody>
          <tr>
            <td className="w-[42%] align-top">
              <div className="font-semibold uppercase">{exam.school}</div>
              <div className="font-bold uppercase">{exam.department}</div>
              <div className="mx-auto mt-1 w-24 border-t border-black" />
              <div className="mt-1 text-sm italic">(Đề thi có … trang)</div>
            </td>
            <td className="align-top">
              <div className="font-bold uppercase">{exam.examName}</div>
              <div className="font-bold uppercase">Môn: {exam.subject}</div>
              <div className="italic">Thời gian làm bài: {exam.duration} phút, không kể thời gian phát đề</div>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div className="text-[15px]">
          <div>Họ, tên thí sinh: ………………………………………………………</div>
          <div>Số báo danh: ………………………………</div>
        </div>
        {code && <div className="border border-black px-3 py-1 font-bold">Mã đề {code}</div>}
      </div>
    </div>
  );
}

function VersionPaper({ exam, version }) {
  return (
    <div className="print-page break-before mx-auto mb-8 max-w-[210mm] bg-white p-[15mm] font-serif text-[16px] shadow">
      <Header exam={exam} code={version.code} />
      {version.parts.map((p) => (
        <div key={p.type} className="mt-4">
          <div className="font-bold">{typeOf(p.type).part}.</div>
          <div className="mb-2 italic">{PART_HINT[p.type](p.items.length)}</div>
          <div className="space-y-3">
            {p.items.map((q, i) => (
              <QuestionView key={q.id} q={q} num={i + 1} compact={p.type === 'mcq' && (q.options || []).every((o) => o.length < 22)} />
            ))}
          </div>
        </div>
      ))}
      <div className="mt-6 text-center font-bold">------ HẾT ------</div>
    </div>
  );
}

function AnswerKey({ versions }) {
  return (
    <div className="print-page break-before mx-auto mb-8 max-w-[210mm] bg-white p-[15mm] font-serif shadow">
      <h2 className="mb-4 text-center text-lg font-bold">ĐÁP ÁN</h2>
      {versions.map((v) => (
        <div key={v.code || 'goc'} className="avoid-break mb-5">
          <div className="mb-1 font-bold">{v.code ? `Mã đề ${v.code}` : 'Đề gốc'}</div>
          {v.parts.map((p) => (
            <div key={p.type} className="mb-2 overflow-x-auto">
              <div className="text-sm italic">{typeOf(p.type).part}</div>
              <table className="border-collapse text-center text-sm">
                <tbody>
                  <tr>
                    <td className="border border-slate-500 px-2 font-semibold">Câu</td>
                    {p.items.map((_, i) => (
                      <td key={i} className="border border-slate-500 px-2">
                        {i + 1}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="border border-slate-500 px-2 font-semibold">ĐA</td>
                    {p.items.map((q, i) => (
                      <td key={i} className="border border-slate-500 px-2 font-bold whitespace-nowrap">
                        {q.type === 'mcq' && LETTERS[q.answer]}
                        {q.type === 'tf' && q.truth.map((t, k) => `${SUBS[k]}${t ? 'Đ' : 'S'}`).join(' ')}
                        {q.type === 'short' && q.answer}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Solutions({ version }) {
  return (
    <div className="print-page break-before mx-auto mb-8 max-w-[210mm] bg-white p-[15mm] font-serif shadow">
      <h2 className="mb-4 text-center text-lg font-bold">HƯỚNG DẪN GIẢI {version.code ? `– MÃ ĐỀ ${version.code}` : ''}</h2>
      {version.parts.map((p) => (
        <div key={p.type} className="mb-4">
          <div className="mb-2 font-bold">{typeOf(p.type).part}</div>
          <div className="space-y-3">
            {p.items.map((q, i) => (
              <QuestionView key={q.id} q={q} num={i + 1} showAnswer showExplanation />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ExamPrint() {
  const { id } = useParams();
  const [exam, setExam] = useState(null);
  const [bank, setBank] = useState(null);
  const [which, setWhich] = useState('all');
  const [withKey, setWithKey] = useState(true);
  const [withSol, setWithSol] = useState(false);

  useEffect(() => {
    api.exams.get(id).then(setExam);
    api.questions.list().then((l) => setBank(Object.fromEntries(l.map((q) => [q.id, q]))));
  }, [id]);

  const versions = useMemo(() => {
    if (!exam || !bank) return [];
    if (which === 'goc') return [buildVersion(exam, bank, null)];
    const codes = versionCodes(exam);
    return (which === 'all' ? codes : [which]).map((c) => buildVersion(exam, bank, c));
  }, [exam, bank, which]);

  if (!exam || !bank) return <div className="p-10 text-slate-500">Đang tải…</div>;

  return (
    <div className="min-h-screen bg-slate-100 py-6">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center gap-3 px-2">
        <select className="input w-auto" value={which} onChange={(e) => setWhich(e.target.value)}>
          <option value="all">Tất cả mã đề ({versionCodes(exam).length})</option>
          <option value="goc">Đề gốc (không trộn)</option>
          {versionCodes(exam).map((c) => (
            <option key={c} value={c}>
              Mã đề {c}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={withKey} onChange={(e) => setWithKey(e.target.checked)} /> Bảng đáp án
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={withSol} onChange={(e) => setWithSol(e.target.checked)} /> Lời giải chi tiết
        </label>
        <button className="btn btn-primary ml-auto" onClick={() => window.print()}>
          <Printer size={16} /> In / Lưu PDF
        </button>
      </div>
      {versions.map((v) => (
        <VersionPaper key={v.code || 'goc'} exam={exam} version={v} />
      ))}
      {withKey && <AnswerKey versions={versions} />}
      {withSol && versions.map((v) => <Solutions key={'s' + (v.code || 'goc')} version={v} />)}
    </div>
  );
}
