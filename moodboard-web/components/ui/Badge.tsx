import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'accent' | 'success' | 'danger' | 'muted'
  className?: string
  onClick?: () => void
}

export function Badge({
  children,
  variant = 'default',
  className,
  onClick,
}: BadgeProps) {
  const variants = {
    default: 'bg-[#EEF1F3] text-[#536878]',
    accent: 'bg-[#536878] text-white',
    success: 'bg-green-50 text-[#22C55E]',
    danger: 'bg-red-50 text-[#EF4444]',
    muted: 'bg-[#F3F4F6] text-[#6B7280]',
  }

  const Comp = onClick ? 'button' : 'span'

  return (
    <Comp
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        'transition-colors duration-150',
        variants[variant],
        onClick && 'hover:opacity-80 cursor-pointer',
        className
      )}
    >
      {children}
    </Comp>
  )
}
