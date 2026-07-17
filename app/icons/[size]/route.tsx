import { ImageResponse } from 'next/og';

// Generates the PWA icons on demand (192 + 512) so there are no binary assets to maintain.
// Referenced by app/manifest.ts. Restricted to the two declared sizes.
const SIZES: Record<string, number> = { '192': 192, '512': 512 };

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const n = SIZES[size];
  if (!n) return new Response('Not found', { status: 404 });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#7c3aed',
          color: 'white',
          fontSize: n * 0.62,
          fontWeight: 700,
          fontFamily: 'sans-serif',
        }}
      >
        V
      </div>
    ),
    { width: n, height: n },
  );
}
