'use client'

import Masonry from 'react-masonry-css'
import { PostCard } from './PostCard'
import { CollectionCard } from './CollectionCard'
import type { Post, Collection } from '@/lib/types'

interface MasonryGridProps {
  posts: Post[]
  collections?: Collection[]
}

const BREAKPOINTS = {
  default: 5,
  1536: 5,
  1280: 4,
  1024: 3,
  640: 2,
  0: 2,
}

// Distribute collections evenly across posts, minimum every 4 posts
const collectionInterval = (posts: Post[], collections: Collection[]) => {
  if (collections.length === 0) return Infinity
  return Math.max(3, Math.floor(posts.length / collections.length))
}

export function MasonryGrid({ posts, collections = [] }: MasonryGridProps) {
  // Interleave collection cards into the posts array
  const items: Array<{ type: 'post'; data: Post } | { type: 'collection'; data: Collection; key: string }> = []
  let collectionIdx = 0
  const interval = collectionInterval(posts, collections)

  posts.forEach((post, i) => {
    items.push({ type: 'post', data: post })

    if (
      (i + 1) % interval === 0 &&
      collectionIdx < collections.length
    ) {
      items.push({
        type: 'collection',
        data: collections[collectionIdx],
        key: `col-${collectionIdx}`,
      })
      collectionIdx++
    }
  })

  // Append any collections that didn't fit into the post interleaving
  while (collectionIdx < collections.length) {
    items.push({
      type: 'collection',
      data: collections[collectionIdx],
      key: `col-${collectionIdx}`,
    })
    collectionIdx++
  }

  return (
    <Masonry
      breakpointCols={BREAKPOINTS}
      className="masonry-grid"
      columnClassName="masonry-grid-column"
    >
      {items.map((item, idx) => {
        if (item.type === 'post') {
          return (
            <PostCard
              key={item.data.id}
              post={item.data}
              priority={idx < 8}
            />
          )
        }
        return (
          <CollectionCard
            key={item.key}
            collection={item.data}
          />
        )
      })}
    </Masonry>
  )
}
