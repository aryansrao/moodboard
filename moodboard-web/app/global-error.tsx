'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="bg-[#FAFAFA] text-[#0A0A0A] font-sans antialiased">
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={28} className="text-[#EF4444]" />
          </div>
          <h2 className="text-xl font-bold mb-2">Critical error</h2>
          <p className="text-[#6B7280] mb-8 max-w-sm">
            A critical error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#536878] text-white text-sm font-medium rounded-full hover:bg-[#445868] transition-colors"
          >
            <RefreshCw size={15} />
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
