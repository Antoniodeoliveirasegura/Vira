import type { MetadataRoute } from 'next';

// Web App Manifest → served at /manifest.webmanifest (Next links it automatically).
// Makes Vira installable and declares the Web Share Target: on Android, "Share → Vira"
// navigates to /share with the shared title/text/url as query params.
export default function manifest(): MetadataRoute.Manifest {
  const m = {
    name: 'Vira',
    short_name: 'Vira',
    description: 'Capture-first inbox — dump a thought, organize later.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0b',
    theme_color: '#0a0a0b',
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Not in Next's Manifest type across versions, so build then cast.
    share_target: {
      action: '/share',
      method: 'GET',
      params: { title: 'title', text: 'text', url: 'url' },
    },
  };
  return m as MetadataRoute.Manifest;
}
