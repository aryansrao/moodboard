import fs from 'fs'
import path from 'path'

export async function GET() {
  const file = fs.readFileSync(path.join(process.cwd(), 'public', 'icons', 'icon-512.png'))
  return new Response(file, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
