import { Suspense } from 'react'
import { BottomNav } from '@/components/layout/BottomNav'
import { AuthGate } from '@/components/layout/AuthGate'
import { SearchBar } from '@/components/layout/SearchBar'
import { CreatePostDialog } from '@/components/save/CreatePostDialog'
import { SavePostModal } from '@/components/save/SavePostModal'
import { UrlDetector } from '@/components/save/UrlDetector'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#FAFAFA] text-[#0A0A0A] min-h-screen">
      <main className="min-h-screen pb-32">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
      <Suspense fallback={null}>
        <BottomNav />
        <AuthGate />
        <SearchBar />
        <CreatePostDialog />
        <SavePostModal />
        <UrlDetector />
      </Suspense>
    </div>
  )
}
