'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !displayName || !username || !password || isLoading) return
    setError('')
    if (username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName, username },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (signUpError) throw signUpError
      setSentEmail(email)
      setDone(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to sign up'
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        setError('This email is already registered. Try signing in instead.')
      } else if (msg.toLowerCase().includes('password')) {
        setError('Password is too weak. Use at least 8 characters.')
      } else {
        setError(msg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-[24px] p-8 text-center shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
          <div className="w-12 h-12 rounded-full bg-[#EEF1F3] flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#536878" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>
          </div>
          <h2 className="text-lg font-bold text-[#0A0A0A] mb-2 font-[family-name:var(--font-inter-tight)]">Check your inbox</h2>
          <p className="text-sm text-[#6B7280] mb-6">
            We sent a verification link to <strong>{sentEmail}</strong>. Click it to activate your account.
          </p>
          <p className="text-xs text-[#6B7280]">
            Got a 6-digit code?{' '}
            <Link href={`/verify?email=${encodeURIComponent(sentEmail)}`} className="text-[#536878] hover:underline font-medium">
              Enter it here →
            </Link>
          </p>
        </div>
      </div>
    )
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
          <p className="text-sm text-[#6B7280] mt-2">Create your free account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 border border-[#E5E4E2] rounded-xl text-sm text-[#0A0A0A] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[#536878] focus:ring-1 focus:ring-[#536878] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A9A9A] text-sm">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setError('') }}
                placeholder="yourhandle"
                required
                className="w-full pl-7 pr-3.5 py-2.5 border border-[#E5E4E2] rounded-xl text-sm text-[#0A0A0A] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[#536878] focus:ring-1 focus:ring-[#536878] transition-colors"
              />
            </div>
            <p className="text-[11px] text-[#9A9A9A] mt-1">Letters, numbers, underscores only</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              placeholder="you@example.com"
              required
              className="w-full px-3.5 py-2.5 border border-[#E5E4E2] rounded-xl text-sm text-[#0A0A0A] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[#536878] focus:ring-1 focus:ring-[#536878] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="w-full px-3.5 py-2.5 pr-10 border border-[#E5E4E2] rounded-xl text-sm text-[#0A0A0A] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[#536878] focus:ring-1 focus:ring-[#536878] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9A9A] hover:text-[#536878] transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-[#9A9A9A] mt-1">At least 8 characters</p>
          </div>

          {error && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3.5 py-3 text-sm text-[#DC2626]">
              {error}
              {error.includes('signing in') && (
                <Link href="/login" className="ml-1 font-medium underline underline-offset-2">
                  Sign in →
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email || !displayName || !username || !password}
            className="w-full py-2.5 bg-[#0A0A0A] text-white text-sm font-medium rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-1"
          >
            {isLoading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-xs text-[#6B7280] mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-[#536878] hover:underline font-medium">
            Sign in
          </Link>
        </p>
        <p className="text-center text-[10px] text-[#6B7280] mt-2">
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
