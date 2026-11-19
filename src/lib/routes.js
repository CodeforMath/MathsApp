/** Mở một trang của app trong tab mới (app dùng HashRouter để chạy được trên GitHub Pages). */
export function openRoute(path) {
  const base = window.location.href.split('#')[0];
  window.open(`${base}#${path}`, '_blank');
}
