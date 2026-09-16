import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // false: el registro del service worker se hace a mano en main.tsx
        // (con un chequeo periódico de actualizaciones) en vez del script
        // que la build inyecta sola — si dejamos los dos, se registra dos
        // veces sin necesidad.
        injectRegister: false,
        includeAssets: ['favicon.png', 'apple-touch-icon.png'],
        // Sólo precachea el shell de la app (JS/CSS/HTML) para que instale y
        // cargue rápido — sin runtimeCaching para Supabase: cada venta,
        // stock o precio se sigue pidiendo en vivo a la red, igual que hoy.
        // Cachear esas respuestas sería mostrar datos viejos sin avisar,
        // peligroso en un POS (stock o precio desactualizado).
        manifest: {
          name: 'NEXUS FARO - Sistema POS y Gestión',
          short_name: 'Faro POS',
          description: 'Sistema Integral de Punto de Venta y Gestión Comercial',
          theme_color: '#2563eb',
          background_color: '#f8fafc',
          display: 'standalone',
          lang: 'es-AR',
          start_url: '/',
          scope: '/',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
