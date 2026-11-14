/* Định dạng số thành LaTeX “đẹp”: số nguyên, phân số, căn, a + b√m, kπ/q. */

const SQUARE_FREE = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23, 26, 29, 30];

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function fracTex(p, q) {
  const g = gcd(p, q);
  p /= g;
  q /= g;
  if (q === 1) return String(p);
  return `${p < 0 ? '-' : ''}\\frac{${Math.abs(p)}}{${q}}`;
}

/** Tách k²·m từ n → [k, m] */
function splitSquare(n) {
  let k = 1;
  let m = n;
  for (let d = 2; d * d <= m; d++) {
    while (m % (d * d) === 0) {
      m /= d * d;
      k *= d;
    }
  }
  return [k, m];
}

export function decimalTex(v, digits = 2) {
  const s = (Math.round(v * 10 ** digits) / 10 ** digits).toString();
  return s.replace('.', '{,}');
}

/**
 * Trả về { value, tex, exact } – value là giá trị đã “làm tròn đẹp”.
 * tol: sai số chấp nhận khi nhận dạng.
 */
export function niceNumber(v, tol = 1e-7) {
  if (v === Infinity) return { value: v, tex: '+\\infty', exact: true };
  if (v === -Infinity) return { value: v, tex: '-\\infty', exact: true };
  if (!Number.isFinite(v)) return { value: NaN, tex: '\\nexists', exact: false };
  const t = tol * Math.max(1, Math.abs(v));
  if (Math.abs(v) < tol) return { value: 0, tex: '0', exact: true };
  const r = Math.round(v);
  if (Math.abs(v - r) < t) return { value: r, tex: String(r), exact: true };

  for (let q = 2; q <= 24; q++) {
    const p = Math.round(v * q);
    if (Math.abs(v - p / q) < t) return { value: p / q, tex: fracTex(p, q), exact: true };
  }

  // ±√(p/q)
  const s = v * v;
  for (let q = 1; q <= 24; q++) {
    const p = Math.round(s * q);
    if (p > 0 && Math.abs(s - p / q) < 4 * t * Math.max(1, Math.abs(v))) {
      const [k0, m] = splitSquare(p * q);
      if (m === 1) continue;
      const g = gcd(k0, q);
      const k = k0 / g;
      const qq = q / g;
      const sign = v < 0 ? '-' : '';
      const num = `${k === 1 ? '' : k}\\sqrt{${m}}`;
      const tex = qq === 1 ? `${sign}${num}` : `${sign}\\frac{${num}}{${qq}}`;
      return { value: Math.sign(v) * Math.sqrt(p / q), tex, exact: true };
    }
  }

  // (a + b√m)/q
  for (let q = 1; q <= 6; q++) {
    for (let ab = 1; ab <= 12; ab++) {
      for (const bn of [ab, -ab]) {
        for (const m of SQUARE_FREE) {
          const a = (v - (bn * Math.sqrt(m)) / q) * q;
          const ar = Math.round(a);
          if (Math.abs(a - ar) < t * q) {
            const g = gcd(gcd(ar, bn), q);
            const A = ar / g;
            const Bn = bn / g;
            const Q = q / g;
            const bAbs = Math.abs(Bn);
            const rad = `${bAbs === 1 ? '' : bAbs}\\sqrt{${m}}`;
            let numer;
            if (A === 0) numer = `${Bn < 0 ? '-' : ''}${rad}`;
            else numer = `${A} ${Bn < 0 ? '-' : '+'} ${rad}`;
            const tex = Q === 1 ? numer : `\\frac{${numer}}{${Q}}`;
            return { value: (ar + bn * Math.sqrt(m)) / q, tex, exact: true };
          }
        }
      }
    }
  }

  // kπ/q
  const w = v / Math.PI;
  for (let q = 1; q <= 12; q++) {
    const p = Math.round(w * q);
    if (p !== 0 && Math.abs(w - p / q) < t) {
      const g = gcd(p, q);
      const P = p / g;
      const Q = q / g;
      const sign = P < 0 ? '-' : '';
      const num = `${Math.abs(P) === 1 ? '' : Math.abs(P)}\\pi`;
      return { value: (p / q) * Math.PI, tex: Q === 1 ? `${sign}${num}` : `${sign}\\frac{${num}}{${Q}}`, exact: true };
    }
  }

  // (p/q)·e^n
  for (const n of [1, -1, 2, -2, 3, -3]) {
    const w2 = v / Math.exp(n);
    for (let q = 1; q <= 6; q++) {
      const p = Math.round(w2 * q);
      if (p !== 0 && Math.abs(w2 - p / q) < t) {
        const g = gcd(p, q);
        const P = p / g;
        const Q = q / g;
        const sign = P < 0 ? '-' : '';
        const aP = Math.abs(P);
        const ePow = Math.abs(n) === 1 ? 'e' : `e^{${Math.abs(n)}}`;
        let tex;
        if (n > 0) tex = Q === 1 ? `${sign}${aP === 1 ? '' : aP}${ePow}` : `${sign}\\frac{${aP === 1 ? '' : aP}${ePow}}{${Q}}`;
        else tex = `${sign}\\frac{${aP}}{${Q === 1 ? '' : Q}${ePow}}`;
        return { value: (p / q) * Math.exp(n), tex, exact: true };
      }
    }
  }

  return { value: v, tex: decimalTex(v), exact: false };
}

/** Khoảng theo ký hiệu Việt Nam: (a; b), [a; b] */
export function intervalTex(aTex, bTex, closedLeft = false, closedRight = false) {
  return `${closedLeft ? '\\left[' : '\\left('}${aTex}; ${bTex}${closedRight ? '\\right]' : '\\right)'}`;
}
