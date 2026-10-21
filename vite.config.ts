import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({base:process.env.PAGES_BASE||'/',plugins:[react()],resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},server:{port:5174,proxy:{'/api':{target:'http://127.0.0.1:8787',changeOrigin:false}}}});
