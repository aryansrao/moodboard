'use client'

import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PdfThumbnailProps {
  url: string
  className?: string
}

export function PdfThumbnail({ url, className }: PdfThumbnailProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

        const pdf = await pdfjsLib.getDocument(url).promise
        if (cancelled) return

        const page = await pdf.getPage(1)
        if (cancelled) return

        // Scale so the thumbnail is ~300px wide
        const viewport = page.getViewport({ scale: 0.5 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!

        await page.render({ canvasContext: ctx, viewport }).promise
        if (!cancelled) setDataUrl(canvas.toDataURL('image/jpeg', 0.85))
      } catch {
        if (!cancelled) setError(true)
      }
    }

    render()
    return () => { cancelled = true }
  }, [url])

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-2 bg-[#F8F7F5]', className)}>
        <FileText size={32} className="text-[#9CA3AF]" />
        <span className="text-[11px] text-[#9CA3AF] font-medium">PDF Document</span>
      </div>
    )
  }

  if (!dataUrl) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-2 bg-[#F0F2F4] animate-pulse', className)}>
        <FileText size={28} className="text-[#D1D5DB]" />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={dataUrl} alt="PDF preview" className={cn('w-full h-full object-cover', className)} />
  )
}
