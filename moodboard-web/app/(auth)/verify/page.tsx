'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const CODE_LENGTH = 6

export default function VerifyPage() {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(60)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    setError('')
    if (digit && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus()
    if (digit && index === CODE_LENGTH - 1 && next.every((d) => d)) handleVerify(next.join(''))
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    const next = [...digits]
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    if (pasted.length === CODE_LENGTH) handleVerify(pasted)
    else inputRefs.current[pasted.length]?.focus()
  }

  const handleVerify = async (code: string) => {
    if (isLoading || code.length < CODE_LENGTH) return
    setIsLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
      if (error) throw error
      router.push('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code. Try again.')
      setDigits(Array(CODE_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0 || !email) return
    const supabase = createClient()
    await supabase.auth.signInWithOtp({ email })
    setCountdown(60)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-[24px] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <span className="w-8 h-8 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-white font-bold font-[family-name:var(--font-inter-tight)]">
              M
            </span>
            <span className="text-2xl font-bold text-[#0A0A0A] font-[family-name:var(--font-inter-tight)]">Moodboard</span>
          </Link>
          <h1 className="text-lg font-semibold text-[#0A0A0A] mt-4 font-[family-name:var(--font-inter-tight)]">
            Enter your code
          </h1>
          {email && (
            <p className="text-sm text-[#6B7280] mt-1">Sent to {email}</p>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 mb-5" onPaste={handlePaste}>
          {Array.from({ length: CODE_LENGTH }).map((_, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digits[i]}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              autoFocus={i === 0}
              className="w-11 h-14 text-center text-xl font-bold border border-[#E5E4E2] rounded-xl focus:outline-none focus:border-[#536878] focus:ring-1 focus:ring-[#536878] transition-colors"
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>

        {error && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3.5 py-3 text-sm text-[#DC2626] mb-4 text-center">
            {error}
          </div>
        )}

        <button
          className="w-full py-2.5 bg-[#0A0A0A] text-white text-sm font-medium rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={isLoading || digits.some((d) => !d)}
          onClick={() => handleVerify(digits.join(''))}
        >
          {isLoading ? 'Verifying…' : 'Verify'}
        </button>

        <div className="text-center mt-4">
          {countdown > 0 ? (
            <p className="text-sm text-[#6B7280]">Resend code in {countdown}s</p>
          ) : (
            <button onClick={handleResend} className="text-sm text-[#536878] hover:underline">
              Resend code
            </button>
          )}
        </div>

        <p className="text-center text-xs text-[#6B7280] mt-4">
          <Link href="/login" className="hover:underline">← Back to login</Link>
        </p>
      </div>
    </div>
  )
}
