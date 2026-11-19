import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' để chạy được trên GitHub Pages (đường dẫn /<tên-repo>/) và mọi máy chủ tĩnh.
export default defineConfig({
  plugins: [react()],
  base: './',
});
