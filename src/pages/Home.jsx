import { Link } from 'react-router-dom';
import { Box, BookOpen, ClipboardList, FileQuestion, LineChart, Shapes } from 'lucide-react';

const CARDS = [
  {
    to: '/hinh-phang',
    icon: Shapes,
    title: 'Hình phẳng',
    desc: 'Dựng hình động: điểm, đoạn, đường tròn, trung điểm, đường cao, giao điểm, góc… Có sẵn mẫu tam giác, tứ giác. Xuất PNG / SVG / TikZ.',
    color: 'bg-sky-500',
  },
  {
    to: '/hinh-khong-gian',
    icon: Box,
    title: 'Hình không gian',
    desc: 'Hình chóp, lăng trụ, hình hộp, tứ diện, trụ, nón, cầu. Tự động vẽ nét khuất, xoay góc nhìn, dựng thêm điểm/đoạn, tô mặt phẳng.',
    color: 'bg-emerald-500',
  },
  {
    to: '/ham-so',
    icon: LineChart,
    title: 'Khảo sát hàm số',
    desc: 'Tính đạo hàm, tìm cực trị, tiệm cận, lập bảng biến thiên tự động, vẽ đồ thị. Xuất mã tkz-tab cho LaTeX.',
    color: 'bg-violet-500',
  },
  {
    to: '/bai-giang',
    icon: BookOpen,
    title: 'Soạn bài giảng',
    desc: 'Soạn thảo Markdown + công thức LaTeX, xem trước trực tiếp, chèn hình vẽ, trình chiếu, in / xuất HTML.',
    color: 'bg-amber-500',
  },
  {
    to: '/cau-hoi',
    icon: FileQuestion,
    title: 'Ngân hàng câu hỏi',
    desc: 'Trắc nghiệm 4 lựa chọn, Đúng/Sai, trả lời ngắn (định dạng 2025). Nhập nhanh từ văn bản, phân loại theo mức độ.',
    color: 'bg-rose-500',
  },
  {
    to: '/de-thi',
    icon: ClipboardList,
    title: 'Đề kiểm tra',
    desc: 'Tạo đề từ ngân hàng, trộn nhiều mã đề, in đề + đáp án, cho học sinh làm bài trực tuyến và chấm điểm tự động.',
    color: 'bg-indigo-500',
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-10">
      <h1 className="text-2xl font-bold text-slate-800 lg:text-3xl">Xin chào 👋</h1>
      <p className="mt-1 text-slate-500">Bộ công cụ hỗ trợ giáo viên Toán: vẽ hình, khảo sát hàm số, soạn bài giảng và đề kiểm tra.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(({ to, icon: Icon, title, desc, color }) => (
          <Link key={to} to={to} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className={`grid h-11 w-11 place-items-center rounded-xl text-white ${color}`}>
              <Icon size={22} />
            </div>
            <h2 className="mt-4 font-semibold text-slate-800 group-hover:text-indigo-700">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
