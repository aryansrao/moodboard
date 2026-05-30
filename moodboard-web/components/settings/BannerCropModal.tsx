'use client'

import { useState, useEffect } from 'react'

interface BannerCropModalProps {
  file: File
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}

const BANNER_W = 1500
const BANNER_H = 500
const BANNER_RATIO = BANNER_W / BANNER_H // 3

export function BannerCropModal({ file, onConfirm, onCancel }: BannerCropModalProps) {
  const [offset, setOffset] = useState(0.5)
  const [imgUrl, setImgUrl] = useState('')
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgUrl(url)
    const img = new window.Image()
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  const imgRatio = imgSize.w / (imgSize.h || 1)
  const isWide = imgRatio >= BANNER_RATIO

  const previewPosition = isWide
    ? `${offset * 100}% 50%`
    : `50% ${offset * 100}%`

  const handleConfirm = async () => {
    if (!imgUrl || !imgSize.w) return
    setIsProcessing(true)
    try {
      const img = new window.Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = imgUrl
      })

      const canvas = document.createElement('canvas')
      canvas.width = BANNER_W
      canvas.height = BANNER_H
      const ctx = canvas.getContext('2d')!

      let sx: number, sy: number, sw: number, sh: number
      if (isWide) {
        sh = imgSize.h
        sw = imgSize.h * BANNER_RATIO
        sy = 0
        sx = (imgSize.w - sw) * offset
      } else {
        sw = imgSize.w
        sh = imgSize.w / BANNER_RATIO
        sx = 0
        sy = (imgSize.h - sh) * offset
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, BANNER_W, BANNER_H)

      canvas.toBlob(
        (blob) => {
          if (blob) onConfirm(blob)
          setIsProcessing(false)
        },
        'image/jpeg',
        0.92
      )
    } catch {
      setIsProcessing(false)
    }
  }

  const needsSlider = imgSize.w > 0 && Math.abs(imgRatio - BANNER_RATIO) > 0.05

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E4E2]">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Crop banner</h2>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Position your image within the 3:1 banner area
          </p>
        </div>

        {/* 3:1 preview */}
        <div className="px-6 pt-5">
          <div
            className="w-full rounded-xl overflow-hidden bg-[#EEF1F3]"
            style={{ aspectRatio: '3 / 1' }}
          >
            {imgUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgUrl}
                alt="Banner preview"
                className="w-full h-full object-cover transition-none"
                style={{ objectPosition: previewPosition }}
              />
            )}
          </div>
        </div>

        {/* Slider */}
        {needsSlider && (
          <div className="px-6 pt-3 pb-1">
            <p className="text-xs text-[#6B7280] font-medium mb-1.5">
              {isWide ? 'Pan left / right' : 'Pan up / down'}
            </p>
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={offset}
              onChange={(e) => setOffset(Number(e.target.value))}
              className="w-full accent-[#536878]"
            />
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium border border-[#E5E4E2] rounded-full text-[#0A0A0A] hover:bg-[#EEF1F3] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing || !imgUrl}
            className="px-4 py-2 text-sm font-medium bg-[#536878] text-white rounded-full hover:bg-[#47596a] transition-colors disabled:opacity-50"
          >
            {isProcessing ? 'Processing…' : 'Use this crop'}
          </button>
        </div>
      </div>
    </div>
  )
}
