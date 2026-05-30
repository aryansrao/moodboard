'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
        <AlertCircle size={28} className="text-[#EF4444]" />
      </div>
      <h2 className="text-xl font-bold text-[#0A0A0A] mb-2">
        Something went wrong
      </h2>
      <p className="text-[#6B7280] mb-8 max-w-sm">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#536878] text-white text-sm font-medium rounded-full hover:bg-[#445868] transition-colors"
        >
          <RefreshCw size={15} />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 border border-[#E5E4E2] text-sm font-medium rounded-full text-[#0A0A0A] hover:bg-[#EEF1F3] transition-colors"
        >
          <Home size={15} />
          Go home
        </Link>
      </div>
    </div>
  )
}
