'use client'

import { useInView } from 'react-intersection-observer'
import { cn } from '@/lib/utils'

interface RevealSectionProps {
  children: React.ReactNode
  className?: string
  delay?: number
  blur?: boolean
  y?: number
}

export function RevealSection({ children, className, delay = 0, blur = true, y = 28 }: RevealSectionProps) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.06, rootMargin: '0px 0px -40px 0px' })

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: inView ? 1 : 0,
        filter: blur ? (inView ? 'blur(0px)' : 'blur(12px)') : undefined,
        transform: inView ? 'translateY(0)' : `translateY(${y}px)`,
        transition: `opacity 0.85s cubic-bezier(0.16,1,0.3,1) ${delay}ms, filter 0.85s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.85s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}
