import Link from 'next/link'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-8xl font-bold text-[#E5E4E2] mb-4">404</p>
      <h1 className="text-2xl font-bold text-[#0A0A0A] mb-2">
        Page not found
      </h1>
      <p className="text-[#6B7280] mb-8 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#536878] text-white text-sm font-medium rounded-full hover:bg-[#445868] transition-colors"
        >
          <Home size={16} />
          Go home
        </Link>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 px-4 py-2 border border-[#E5E4E2] text-sm font-medium rounded-full text-[#0A0A0A] hover:bg-[#EEF1F3] transition-colors"
        >
          <Search size={16} />
          Search
        </Link>
      </div>
    </div>
  )
}
