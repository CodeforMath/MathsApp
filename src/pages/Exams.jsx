import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, PlayCircle, Plus, Printer, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { openRoute } from '../lib/routes.js';
import { useToast } from '../components/Toast.jsx';

export default function Exams() {
  const navigate = useNavigate();
  const toast = useToast();
  const [list, setList] = useState([]);
  const load = () => api.exams.list().then(setList).catch((e) => toast(e.message, 'error'));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    const e = await api.exams.create({
      title: 'Đề kiểm tra mới',
      school: 'TRƯỜNG THPT …',
      department: 'TỔ TOÁN',
      examName: 'KIỂM TRA GIỮA KÌ',
      subject: 'Toán',
      duration: 90,
      versions: 4,
      firstCode: 101,
      shuffleQuestions: true,
      shuffleOptions: true,
      seed: Math.floor(Math.random() * 1e6),
      questionIds: [],
    });
    navigate(`/de-thi/${e.id}`);
  };

  const remove = async (e) => {
    if (!window.confirm(`Xoá đề “${e.title}”?`)) return;
    await api.exams.remove(e.id);
    load();
  };

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-6">
      <div className="flex items-center">
        <h1 className="mr-auto text-xl font-bold text-slate-800">Đề kiểm tra</h1>
        <button className="btn btn-primary" onClick={create}>
          <Plus size={16} /> Tạo đề mới
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {!list.length && (
          <div className="card p-10 text-center text-slate-500">
            <ClipboardList className="mx-auto mb-2 text-slate-300" size={40} />
            Chưa có đề nào. Tạo đề mới rồi chọn câu hỏi từ ngân hàng.
          </div>
        )}
        {list.map((e) => (
          <div key={e.id} className="card flex flex-wrap items-center gap-3 p-4">
            <Link to={`/de-thi/${e.id}`} className="mr-auto min-w-0">
              <div className="font-semibold text-slate-800 hover:text-brand-700">{e.title}</div>
              <div className="text-xs text-slate-500">
                {(e.questionIds || []).length} câu · {e.duration} phút · {e.versions} mã đề · cập nhật {new Date(e.updatedAt).toLocaleString('vi-VN')}
              </div>
            </Link>
            <button className="btn btn-sm" onClick={() => openRoute(`/de-thi/${e.id}/in`)}>
              <Printer size={14} /> In đề
            </button>
            <button className="btn btn-sm" onClick={() => openRoute(`/de-thi/${e.id}/lam-bai`)}>
              <PlayCircle size={14} /> Làm bài
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => remove(e)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
