import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
export default defineConfig({
    plugins: [
        tailwindcss(),
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'GlucoseTracker',
                short_name: 'GlucoseTracker',
                description: 'Personal glucose monitoring PWA',
                theme_color: '#0D1117',
                background_color: '#0D1117',
                display: 'standalone',
                orientation: 'portrait',
                icons: [
                    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
