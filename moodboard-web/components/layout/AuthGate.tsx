'use client'

import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/auth'

export function AuthGate() {
  const { user, isLoading } = useAuthStore()

  if (isLoading || user) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      {/* Progressive blur — grows stronger toward bottom */}
      <div
        className="h-80"
        style={{
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 35%, black 70%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 35%, black 70%)',
        }}
      />
      {/* Colour fade over the blur */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 20%, rgba(250,250,250,0.55) 55%, rgba(250,250,250,0.85) 80%)',
        }}
      />
      {/* CTA — sits on top of blur, no solid background */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-auto px-4 pb-10 pt-6">
        <div className="max-w-sm mx-auto text-center">
          <h2 className="text-lg font-bold text-[#0A0A0A] mb-1">
            There&apos;s more to explore
          </h2>
          <p className="text-sm text-[#6B7280] mb-5">
            Sign up to save posts, build collections, and follow curators.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/login?tab=signup"
              className="px-6 py-2.5 bg-[#536878] text-white text-sm font-medium rounded-full hover:bg-[#445868] transition-colors shadow-lg"
            >
              Sign up free
            </Link>
            <Link
              href="/login"
              className="px-6 py-2.5 border border-[#E5E4E2] bg-white/70 backdrop-blur-sm text-sm font-medium rounded-full text-[#0A0A0A] hover:bg-white transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
