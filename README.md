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
| Lưu trữ | IndexedDB ngay trong trình duyệt — không cần máy chủ, chạy được trên GitHub Pages |

## Chạy ứng dụng

```bash
npm install
npm run dev        # http://localhost:5173
```

## Đưa lên mạng (GitHub Pages)

Mỗi lần push lên nhánh `main`, workflow `.github/workflows/deploy.yml` tự build và triển khai.
Lần đầu cần bật: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Địa chỉ: `https://<tài-khoản>.github.io/MathsApp/`.

## Dữ liệu được lưu ở đâu?

Bài giảng, câu hỏi, đề và thư viện hình được lưu **trong trình duyệt của từng máy** (IndexedDB).
Không có máy chủ nên dữ liệu không tự đồng bộ giữa các máy. Dùng nút **Sao lưu** trên thanh trên cùng
để tải toàn bộ dữ liệu về một file `.json`, và **Khôi phục** để nạp file đó vào máy/trình duyệt khác.
Nên sao lưu định kỳ: xoá dữ liệu duyệt web hoặc dùng chế độ ẩn danh sẽ làm mất dữ liệu.

## Chức năng

**Hình phẳng** – công cụ điểm, đoạn, đường thẳng, tia, đa giác, đường tròn, trung điểm, hạ đường vuông góc (có ký hiệu góc vuông), song song, phân giác, đo góc, giao điểm, chữ; mẫu tam giác (ngoại tiếp, nội tiếp, đường cao, trung tuyến), tứ giác đặc biệt, tiếp tuyến. Xuất PNG / SVG / TikZ.

**Hình không gian** – chóp đều, chóp có cạnh bên vuông góc đáy, tứ diện đều, lập phương, hộp chữ nhật, lăng trụ đứng/xiên, trụ, nón, cầu. Kéo để xoay, nét khuất tự vẽ nét đứt. Dựng thêm điểm (trung điểm, tỉ số, trọng tâm, giao điểm, hình chiếu lên đường/mặt, toạ độ), nối đoạn, tô mặt phẳng, ký hiệu góc vuông. Xuất PNG / SVG / TikZ.

**Khảo sát hàm số** – nhập `y = f(x)`, tự động: tập xác định, đạo hàm, nghiệm `y' = 0`, giới hạn, tiệm cận đứng/ngang/xiên, bảng biến thiên kiểu SGK, kết luận đơn điệu – cực trị, GTLN/GTNN trên đoạn. Vẽ đồ thị (kéo/zoom, vẽ nhiều hàm). Xuất PNG, mã `tkz-tab`, lời giải dạng Markdown.

**Bài giảng** – soạn Markdown + LaTeX có xem trước, thanh ký hiệu toán, khung Định nghĩa/Định lí/Ví dụ, chèn hình từ thư viện (hình vẽ từ các công cụ bấm “Lưu thư viện”, lưu trong trình duyệt), chèn câu hỏi từ ngân hàng, trình chiếu (ngắt trang bằng `---`), in/PDF, xuất `.md`/`.html`.

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
