'use client'

import Link from 'next/link'
import { ArrowLeft, Download, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/lib/stores/ui'
import { useState } from 'react'

export default function DataPage() {
  const { addToast } = useUIStore()
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleExport = () => {
    addToast('Your data export will be emailed to you within 24 hours.', 'info')
  }

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE') return
    setIsDeleting(true)
    // Account deletion flow would go here
    addToast('Account deletion request submitted.', 'info')
    setIsDeleting(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#0A0A0A] mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Settings
      </Link>

      <h1 className="text-2xl font-bold text-[#0A0A0A] mb-6">Data & Export</h1>

      <div className="flex flex-col gap-4">
        {/* Export */}
        <div className="bg-white rounded-xl border border-[#E5E4E2] p-6">
          <div className="flex items-start gap-3 mb-4">
            <Download size={18} className="text-[#536878] mt-0.5" />
            <div>
              <h2 className="font-semibold text-[#0A0A0A]">Export data</h2>
              <p className="text-sm text-[#6B7280] mt-1">
                Download a copy of all your posts, collections, likes, and account information
                in JSON format.
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={handleExport}>
            <Download size={15} />
            Request export
          </Button>
        </div>

        {/* Delete account */}
        <div className="bg-white rounded-xl border border-[#EF4444]/30 p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle size={18} className="text-[#EF4444] mt-0.5" />
            <div>
              <h2 className="font-semibold text-[#0A0A0A]">Delete account</h2>
              <p className="text-sm text-[#6B7280] mt-1">
                Permanently delete your account and all associated data. This action cannot
                be undone.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-[#0A0A0A] mb-1">
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="w-full border border-[#E5E4E2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]"
              />
            </div>
            <Button
              variant="danger"
              disabled={deleteConfirm !== 'DELETE'}
              loading={isDeleting}
              onClick={handleDelete}
            >
              <Trash2 size={15} />
              Delete my account
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
