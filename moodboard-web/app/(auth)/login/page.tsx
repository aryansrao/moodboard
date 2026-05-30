'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Mode = 'password' | 'magic'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('password')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const router = useRouter()

  const resolveEmail = async (val: string): Promise<string | null> => {
    if (val.includes('@')) return val
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/lookup?username=${encodeURIComponent(val)}`)
      if (!res.ok) return null
      const data = await res.json()
      return data.email as string
    } catch {
      return null
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim() || !password || isLoading) return
    setError('')
    setIsLoading(true)
    try {
      const email = await resolveEmail(identifier.trim())
      if (!email) {
        setError('No account found with that email or username.')
        return
      }
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      router.push('/home')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed'
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials')) {
        setError('Incorrect email or password.')
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        setError('Please verify your email before signing in.')
      } else {
        setError(msg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim() || isLoading) return
    setError('')
    setIsLoading(true)
    try {
      const email = await resolveEmail(identifier.trim())
      if (!email) {
        setError('No account found with that email or username.')
        return
      }
      const supabase = createClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (otpError) throw otpError
      setSentEmail(email)
      setMagicSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send link')
    } finally {
      setIsLoading(false)
    }
  }

  if (magicSent) {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-[24px] p-8 text-center shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
          <div className="w-12 h-12 rounded-full bg-[#EEF1F3] flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#536878" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>
          </div>
          <h2 className="text-lg font-bold text-[#0A0A0A] mb-2 font-[family-name:var(--font-inter-tight)]">Check your inbox</h2>
          <p className="text-sm text-[#6B7280] mb-6">
            We sent a magic link to <strong>{sentEmail}</strong>
          </p>
          <Link href="/verify" className="text-sm text-[#536878] hover:underline">
            Enter a 6-digit code instead →
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
          <p className="text-sm text-[#6B7280] mt-2">Sign in to your account</p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-[#F4F2EE] rounded-xl p-1 mb-5">
          {(['password', 'magic'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m ? 'bg-white shadow-sm text-[#0A0A0A]' : 'text-[#6B7280] hover:text-[#0A0A0A]'
              }`}
            >
              {m === 'password' ? 'Password' : 'Magic link'}
            </button>
          ))}
        </div>

        <form onSubmit={mode === 'password' ? handlePasswordLogin : handleMagicLink} className="flex flex-col gap-3">
          <div>
            <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">Email or username</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setError('') }}
              placeholder="you@example.com or @handle"
              required
              autoFocus
              autoComplete="username email"
              className="w-full px-3.5 py-2.5 border border-[#E5E4E2] rounded-xl text-sm text-[#0A0A0A] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[#536878] focus:ring-1 focus:ring-[#536878] transition-colors"
            />
          </div>

          {mode === 'password' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-[#0A0A0A]">Password</label>
                <Link href="/forgot-password" className="text-xs text-[#536878] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
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
            </div>
          )}

          {error && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3.5 py-3 text-sm text-[#DC2626]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !identifier.trim() || (mode === 'password' && !password)}
            className="w-full py-2.5 bg-[#0A0A0A] text-white text-sm font-medium rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-1"
          >
            {isLoading ? 'Please wait…' : mode === 'password' ? 'Sign in' : 'Send magic link'}
          </button>
        </form>

        <p className="text-center text-xs text-[#6B7280] mt-5">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#536878] hover:underline font-medium">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  )
}
