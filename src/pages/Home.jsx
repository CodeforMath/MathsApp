import { Link } from 'react-router-dom';
import { Box, BookOpen, ClipboardList, FileQuestion, LineChart, Shapes } from 'lucide-react';

const CARDS = [
  {
    to: '/hinh-phang',
    icon: Shapes,
    title: 'Hình phẳng',
    desc: 'Dựng hình động: điểm, đoạn, đường tròn, trung điểm, đường cao, giao điểm, góc… Có sẵn mẫu tam giác, tứ giác. Xuất PNG / SVG / TikZ.',
    color: 'bg-brand-500',
  },
  {
    to: '/hinh-khong-gian',
    icon: Box,
    title: 'Hình không gian',
    desc: 'Hình chóp, lăng trụ, hình hộp, tứ diện, trụ, nón, cầu. Tự động vẽ nét khuất, xoay góc nhìn, dựng thêm điểm/đoạn, tô mặt phẳng.',
    color: 'bg-brand-500',
  },
  {
    to: '/ham-so',
    icon: LineChart,
    title: 'Khảo sát hàm số',
    desc: 'Tính đạo hàm, tìm cực trị, tiệm cận, lập bảng biến thiên tự động, vẽ đồ thị. Xuất mã tkz-tab cho LaTeX.',
    color: 'bg-brand-500',
  },
  {
    to: '/bai-giang',
    icon: BookOpen,
    title: 'Soạn bài giảng',
    desc: 'Soạn thảo Markdown + công thức LaTeX, xem trước trực tiếp, chèn hình vẽ, trình chiếu, in / xuất HTML.',
    color: 'bg-brand-500',
  },
  {
    to: '/cau-hoi',
    icon: FileQuestion,
    title: 'Ngân hàng câu hỏi',
    desc: 'Trắc nghiệm 4 lựa chọn, Đúng/Sai, trả lời ngắn (định dạng 2025). Nhập nhanh từ văn bản, phân loại theo mức độ.',
    color: 'bg-brand-500',
  },
  {
    to: '/de-thi',
    icon: ClipboardList,
    title: 'Đề kiểm tra',
    desc: 'Tạo đề từ ngân hàng, trộn nhiều mã đề, in đề + đáp án, cho học sinh làm bài trực tuyến và chấm điểm tự động.',
    color: 'bg-brand-500',
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-10">
      <section className="py-10 text-center lg:py-16">
        <h1 className="text-5xl font-black tracking-tighter text-brand-500 sm:text-7xl">
          MathsApp<span className="text-slate-300">.tools</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500 sm:text-xl">
          Bộ công cụ giúp giáo viên Toán <span className="font-semibold text-brand-600">vẽ hình, khảo sát hàm số</span>, soạn bài giảng và đề kiểm tra
          trong vài phút.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/ham-so" className="btn btn-primary px-6 py-3 text-base">
            Khảo sát hàm số
          </Link>
          <Link to="/bai-giang" className="btn border-brand-200 px-6 py-3 text-base text-brand-700">
            Soạn bài giảng
          </Link>
        </div>
      </section>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(({ to, icon: Icon, title, desc, color }) => (
          <Link key={to} to={to} className="card group p-6 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-100">
            <div className={`grid h-11 w-11 place-items-center rounded-xl text-white shadow-sm shadow-brand-500/30 ${color}`}>
              <Icon size={22} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-800 group-hover:text-brand-700">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
