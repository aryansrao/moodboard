import { ImageResponse } from 'next/og'
import fs from 'fs'
import path from 'path'

export const alt = 'Moodboard — Save anything from anywhere'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  const logoData = fs.readFileSync(path.join(process.cwd(), 'public', 'logo.png'))
  const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          background: '#FAFAFA',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: '80px',
        }}
      >
        {/* Logo mark */}
        <img
          src={logoBase64}
          width={88}
          height={88}
          style={{ borderRadius: 20, marginBottom: 32 }}
        />

        <div
          style={{
            fontSize: 60,
            fontWeight: 700,
            color: '#0A0A0A',
            letterSpacing: '-2px',
            marginBottom: 16,
          }}
        >
          Moodboard
        </div>

        <div
          style={{
            fontSize: 26,
            color: '#6B7280',
            textAlign: 'center',
            maxWidth: 680,
            lineHeight: 1.4,
          }}
        >
          Save anything from anywhere. Free forever.
        </div>

        {/* Bottom tag */}
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            display: 'flex',
            gap: 12,
          }}
        >
          {['YouTube', 'Instagram', 'TikTok', 'Pinterest', 'Reddit'].map((p) => (
            <div
              key={p}
              style={{
                background: '#EEF1F3',
                color: '#536878',
                fontSize: 14,
                fontWeight: 500,
                padding: '6px 14px',
                borderRadius: 99,
              }}
            >
              {p}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
