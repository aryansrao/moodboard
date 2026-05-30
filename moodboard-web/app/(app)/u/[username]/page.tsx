import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Spinner } from '@/components/ui/Spinner'
import { ProfileView } from '@/components/social/ProfileView'

interface Props {
  params: Promise<{ username: string }>
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { username } = await params
    return {
      title: `@${username}`,
      alternates: { canonical: `${BASE_URL}/u/${username}` },
    }
  } catch {
    return { title: 'Profile' }
  }
}

// Awaiting params inside Suspense avoids the blocking-route error
async function ProfilePageInner({ params }: Props) {
  const { username } = await params
  return <ProfileView username={username} />
}

export default function UserProfilePage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner className="text-[#536878]" size="lg" />
        </div>
      }
    >
      <ProfilePageInner params={params} />
    </Suspense>
  )
}
