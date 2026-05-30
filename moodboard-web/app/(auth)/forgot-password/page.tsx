'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || isLoading) return
    setError('')
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      })
      if (resetError) throw resetError
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-[24px] p-8 text-center shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
          <div className="w-12 h-12 rounded-full bg-[#EEF1F3] flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#536878" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>
          </div>
          <h2 className="text-lg font-bold text-[#0A0A0A] mb-2 font-[family-name:var(--font-inter-tight)]">Check your inbox</h2>
          <p className="text-sm text-[#6B7280] mb-6">
            We sent a password reset link to <strong>{email}</strong>
          </p>
          <Link href="/login" className="text-sm text-[#536878] hover:underline">
            ← Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-[24px] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <span className="w-8 h-8 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-white font-bold font-[family-name:var(--font-inter-tight)]">M</span>
            <span className="text-2xl font-bold text-[#0A0A0A] font-[family-name:var(--font-inter-tight)]">Moodboard</span>
          </Link>
          <h1 className="text-base font-semibold text-[#0A0A0A] mt-3 font-[family-name:var(--font-inter-tight)]">Reset your password</h1>
          <p className="text-sm text-[#6B7280] mt-1">We&apos;ll send a reset link to your email</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              placeholder="you@example.com"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 border border-[#E5E4E2] rounded-xl text-sm text-[#0A0A0A] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[#536878] focus:ring-1 focus:ring-[#536878] transition-colors"
            />
          </div>

          {error && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3.5 py-3 text-sm text-[#DC2626]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full py-2.5 bg-[#0A0A0A] text-white text-sm font-medium rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-1"
          >
            {isLoading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="text-center text-xs text-[#6B7280] mt-5">
          <Link href="/login" className="text-[#536878] hover:underline">
            ← Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}
