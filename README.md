# MathsApp – Công cụ dạy học Toán

Ứng dụng web hỗ trợ giáo viên Toán: vẽ hình phẳng, hình không gian, khảo sát hàm số (bảng biến thiên + đồ thị), soạn bài giảng và đề kiểm tra trắc nghiệm.

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Giao diện | React 19 + Vite + Tailwind CSS 4 |
| Công thức | KaTeX (Markdown + `$…$`, `$$…$$`) |
| Tính toán | mathjs (đạo hàm ký hiệu) + thuật toán số tự viết (cực trị, giới hạn, tiệm cận) |
| Hình phẳng | JSXGraph (hình học động, kéo thả) |
| Hình không gian | Bộ dựng hình SVG tự viết, tự xác định nét khuất |
| Máy chủ | Node.js + Express, lưu dữ liệu bằng file JSON trong `server/data/` |

## Chạy ứng dụng

```bash
npm install
npm run dev        # API: http://localhost:3001 · Web: http://localhost:5173
```

Bản chạy thật (một cổng duy nhất):

```bash
npm run build
npm start          # http://localhost:3001
```

## Chức năng

**Hình phẳng** – công cụ điểm, đoạn, đường thẳng, tia, đa giác, đường tròn, trung điểm, hạ đường vuông góc (có ký hiệu góc vuông), song song, phân giác, đo góc, giao điểm, chữ; mẫu tam giác (ngoại tiếp, nội tiếp, đường cao, trung tuyến), tứ giác đặc biệt, tiếp tuyến. Xuất PNG / SVG / TikZ.

**Hình không gian** – chóp đều, chóp có cạnh bên vuông góc đáy, tứ diện đều, lập phương, hộp chữ nhật, lăng trụ đứng/xiên, trụ, nón, cầu. Kéo để xoay, nét khuất tự vẽ nét đứt. Dựng thêm điểm (trung điểm, tỉ số, trọng tâm, giao điểm, hình chiếu lên đường/mặt, toạ độ), nối đoạn, tô mặt phẳng, ký hiệu góc vuông. Xuất PNG / SVG / TikZ.

**Khảo sát hàm số** – nhập `y = f(x)`, tự động: tập xác định, đạo hàm, nghiệm `y' = 0`, giới hạn, tiệm cận đứng/ngang/xiên, bảng biến thiên kiểu SGK, kết luận đơn điệu – cực trị, GTLN/GTNN trên đoạn. Vẽ đồ thị (kéo/zoom, vẽ nhiều hàm). Xuất PNG, mã `tkz-tab`, lời giải dạng Markdown.

**Bài giảng** – soạn Markdown + LaTeX có xem trước, thanh ký hiệu toán, khung Định nghĩa/Định lí/Ví dụ, chèn hình từ thư viện (hình vẽ từ các công cụ bấm “Lưu thư viện”), chèn câu hỏi từ ngân hàng, trình chiếu (ngắt trang bằng `---`), in/PDF, xuất `.md`/`.html`.

**Ngân hàng câu hỏi** – 3 dạng theo cấu trúc 2025: trắc nghiệm 4 lựa chọn, Đúng/Sai, trả lời ngắn; phân loại mức độ NB/TH/VD/VDC, chủ đề, lớp. Nhập nhanh từ văn bản:

```
Câu 1. Nội dung …
A. …
*B. …        ← dấu * đánh dấu đáp án đúng
C. …
D. …
Lời giải: …
```

**Đề kiểm tra** – chọn câu từ ngân hàng (hoặc lấy ngẫu nhiên theo bộ lọc), trộn nhiều mã đề, in đề + bảng đáp án + lời giải, làm bài trực tuyến có đếm giờ và chấm điểm theo thang 2025.
