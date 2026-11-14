export const seedQuestions = [
  {
    type: 'mcq',
    topic: 'Ứng dụng đạo hàm',
    grade: 12,
    level: 'NB',
    content: 'Hàm số $y = x^3 - 3x + 2$ đồng biến trên khoảng nào dưới đây?',
    options: ['$(-1; 1)$', '$(1; +\\infty)$', '$(-\\infty; 1)$', '$(-2; 2)$'],
    answer: 1,
    explanation: "$y' = 3x^2 - 3 > 0 \\Leftrightarrow x < -1$ hoặc $x > 1$. Vậy hàm số đồng biến trên $(1; +\\infty)$.",
  },
  {
    type: 'mcq',
    topic: 'Ứng dụng đạo hàm',
    grade: 12,
    level: 'TH',
    content: 'Giá trị cực đại của hàm số $y = x^3 - 3x^2 + 1$ là',
    options: ['$1$', '$-3$', '$0$', '$2$'],
    answer: 0,
    explanation: "$y' = 3x^2 - 6x = 0 \\Leftrightarrow x = 0$ hoặc $x = 2$. Hàm số đạt cực đại tại $x = 0$, $y_{CĐ} = 1$.",
  },
  {
    type: 'mcq',
    topic: 'Ứng dụng đạo hàm',
    grade: 12,
    level: 'TH',
    content: 'Tiệm cận đứng của đồ thị hàm số $y = \\dfrac{2x + 1}{x - 1}$ là đường thẳng',
    options: ['$x = 1$', '$y = 2$', '$x = -1$', '$y = 1$'],
    answer: 0,
    explanation: '$\\lim\\limits_{x \\to 1^+} y = +\\infty$ nên $x = 1$ là tiệm cận đứng.',
  },
  {
    type: 'mcq',
    topic: 'Hình học không gian',
    grade: 12,
    level: 'VD',
    content:
      'Cho hình chóp $S.ABCD$ có đáy là hình vuông cạnh $a$, $SA \\perp (ABCD)$ và $SA = a\\sqrt{2}$. Thể tích khối chóp $S.ABCD$ bằng',
    options: ['$\\dfrac{a^3\\sqrt{2}}{3}$', '$a^3\\sqrt{2}$', '$\\dfrac{a^3\\sqrt{2}}{6}$', '$\\dfrac{a^3\\sqrt{2}}{4}$'],
    answer: 0,
    explanation: '$V = \\dfrac{1}{3} \\cdot SA \\cdot S_{ABCD} = \\dfrac{1}{3} \\cdot a\\sqrt{2} \\cdot a^2 = \\dfrac{a^3\\sqrt{2}}{3}$.',
  },
  {
    type: 'tf',
    topic: 'Ứng dụng đạo hàm',
    grade: 12,
    level: 'TH',
    content: 'Cho hàm số $y = \\dfrac{x^2 - 2x + 2}{x - 1}$. Xét tính đúng sai của các mệnh đề sau:',
    statements: [
      'Tập xác định của hàm số là $\\mathbb{R} \\setminus \\{1\\}$.',
      'Hàm số đồng biến trên khoảng $(0; 2)$.',
      'Đồ thị hàm số có tiệm cận xiên $y = x - 1$.',
      'Giá trị cực tiểu của hàm số bằng $1$.',
    ],
    truth: [true, false, true, false],
    explanation:
      "$y' = \\dfrac{x^2 - 2x}{(x-1)^2}$. Hàm số nghịch biến trên $(0;1)$ và $(1;2)$. $y = x - 1 + \\dfrac{1}{x-1}$ nên TCX $y = x - 1$. $y_{CT} = y(2) = 2$.",
  },
  {
    type: 'short',
    topic: 'Ứng dụng đạo hàm',
    grade: 12,
    level: 'VD',
    content: 'Tìm giá trị lớn nhất của hàm số $y = -x^4 + 2x^2 + 3$ trên đoạn $[0; 2]$.',
    answer: '4',
    explanation:
      "$y' = -4x^3 + 4x = 0 \\Leftrightarrow x \\in \\{0; 1\\}$ (trên $[0;2]$). $y(0) = 3$, $y(1) = 4$, $y(2) = -5$. Vậy $\\max y = 4$.",
  },
];

export const seedLectures = [
  {
    title: 'Bài 1. Tính đơn điệu và cực trị của hàm số',
    grade: 12,
    subject: 'Giải tích',
    content: String.raw`# Bài 1. Tính đơn điệu và cực trị của hàm số

## 1. Tính đơn điệu

> **Định lí.** Cho hàm số $y = f(x)$ có đạo hàm trên khoảng $K$.
> - Nếu $f'(x) > 0$ với mọi $x \in K$ thì hàm số đồng biến trên $K$.
> - Nếu $f'(x) < 0$ với mọi $x \in K$ thì hàm số nghịch biến trên $K$.

**Ví dụ 1.** Xét tính đơn điệu của hàm số $y = x^3 - 3x + 2$.

*Lời giải.* Tập xác định $D = \mathbb{R}$.

$$y' = 3x^2 - 3, \quad y' = 0 \Leftrightarrow \left[\begin{array}{l} x = -1 \\ x = 1 \end{array}\right.$$

Vậy hàm số đồng biến trên $(-\infty; -1)$ và $(1; +\infty)$, nghịch biến trên $(-1; 1)$.

---

## 2. Cực trị của hàm số

| Dấu của $f'$ khi qua $x_0$ | Kết luận |
|---|---|
| đổi dấu từ $+$ sang $-$ | $x_0$ là điểm cực đại |
| đổi dấu từ $-$ sang $+$ | $x_0$ là điểm cực tiểu |

**Ví dụ 2.** Tìm cực trị của hàm số $y = \dfrac{x^2 - 2x + 2}{x - 1}$.
`,
  },
];
