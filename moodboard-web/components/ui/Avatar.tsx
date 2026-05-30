import Image from 'next/image'
import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  src?: string
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  priority?: boolean
  className?: string
}

const sizeMap = {
  xs: { px: 24, class: 'w-6 h-6 text-[10px]' },
  sm: { px: 32, class: 'w-8 h-8 text-xs' },
  md: { px: 40, class: 'w-10 h-10 text-sm' },
  lg: { px: 56, class: 'w-14 h-14 text-base' },
  xl: { px: 80, class: 'w-20 h-20 text-xl' },
}

export function Avatar({ src, name, size = 'md', priority = false, className }: AvatarProps) {
  const { px, class: sizeClass } = sizeMap[size]
  const initials = getInitials(name)

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden flex-shrink-0',
        sizeClass,
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={px}
          height={px}
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          className="object-cover w-full h-full"
        />
      ) : (
        <div className="w-full h-full bg-[#EEF1F3] flex items-center justify-center">
          <span className="font-medium text-[#536878] leading-none">
            {initials}
          </span>
        </div>
      )}
    </div>
  )
}
