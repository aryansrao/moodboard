'use client'

import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useUIStore } from '@/lib/stores/ui'
import { cn } from '@/lib/utils'

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      aria-live="assertive"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={cn(
            'flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border pointer-events-auto',
            'bg-white border-[#E5E4E2] min-w-[280px] max-w-sm',
            'animate-[slideInRight_200ms_ease_forwards]'
          )}
        >
          {toast.type === 'success' && (
            <CheckCircle size={16} className="text-[#22C55E] mt-0.5 flex-shrink-0" />
          )}
          {toast.type === 'error' && (
            <AlertCircle size={16} className="text-[#EF4444] mt-0.5 flex-shrink-0" />
          )}
          {toast.type === 'info' && (
            <Info size={16} className="text-[#536878] mt-0.5 flex-shrink-0" />
          )}
          <p className="flex-1 text-sm text-[#0A0A0A]">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
