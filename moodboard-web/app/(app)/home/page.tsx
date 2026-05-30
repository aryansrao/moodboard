import { Suspense } from 'react'
import { FeedContent } from '@/components/feed/FeedContent'
import { Spinner } from '@/components/ui/Spinner'

export default function FeedPage() {
  return (
    <div className="p-3">
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Spinner className="text-[#536878]" size="lg" />
          </div>
        }
      >
        <FeedContent />
      </Suspense>
    </div>
  )
}
