import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// base './' để chạy được ở bất kỳ đường dẫn con nào (vd. https://<tên>.github.io/MathsApp/)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      'jsxgraph-css': path.resolve('node_modules/jsxgraph/distrib/jsxgraph.css'),
    },
  },
  server: { port: 5173 },
});
