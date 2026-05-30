'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Globe, Lock, Eye, EyeOff, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/lib/stores/ui'
import { useAuthStore } from '@/lib/stores/auth'
import { createClient } from '@/lib/supabase'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function PrivacySettingsPage() {
  const [defaultVisibility, setDefaultVisibility] = useState<'public' | 'private'>('public')
  const { addToast } = useUIStore()
  const { user, setUser } = useAuthStore()
  const [accountPrivate, setAccountPrivate] = useState(user?.is_private ?? false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isChangingPassword) return
    setPasswordError('')
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    setIsChangingPassword(true)
    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user?.email ?? '', password: currentPassword })
      if (signInError) {
        setPasswordError('Current password is incorrect')
        setIsChangingPassword(false)
        return
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      addToast('Password updated!', 'success')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleExport = () => {
    addToast('Your data export will be emailed to you within 24 hours.', 'info')
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

      <h1 className="text-2xl font-bold text-[#0A0A0A] mb-6">Privacy</h1>

      <div className="flex flex-col gap-4">
        {/* Password */}
        <form onSubmit={handlePasswordChange} className="bg-white rounded-xl border border-[#E5E4E2] p-6 flex flex-col gap-4">
          <div>
            <h2 className="font-semibold text-[#0A0A0A]">Password</h2>
            <p className="text-sm text-[#6B7280] mt-0.5">Change your account password</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">Current password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError('') }}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 pr-10 border border-[#E5E4E2] rounded-xl text-sm text-[#0A0A0A] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[#536878] focus:ring-1 focus:ring-[#536878] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9A9A] hover:text-[#536878] transition-colors"
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Link href="/forgot-password" className="text-xs text-[#536878] hover:underline">Forgot password?</Link>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">New password</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError('') }}
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={8}
                className="w-full px-3.5 py-2.5 pr-10 border border-[#E5E4E2] rounded-xl text-sm text-[#0A0A0A] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[#536878] focus:ring-1 focus:ring-[#536878] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9A9A] hover:text-[#536878] transition-colors"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">Confirm new password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError('') }}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full px-3.5 py-2.5 pr-10 border border-[#E5E4E2] rounded-xl text-sm text-[#0A0A0A] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[#536878] focus:ring-1 focus:ring-[#536878] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9A9A] hover:text-[#536878] transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordError && (
              <div className="mt-2 bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3.5 py-3 text-sm text-[#DC2626]">
                {passwordError}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              loading={isChangingPassword}
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              Update password
            </Button>
          </div>
        </form>

        {/* Default post visibility */}
        <div className="bg-white rounded-xl border border-[#E5E4E2] p-6">
          <h2 className="font-semibold text-[#0A0A0A] mb-1">
            Default post visibility
          </h2>
          <p className="text-sm text-[#6B7280] mb-4">
            Applied when you save new content
          </p>
          <div className="flex gap-3">
            {(
              [
                { id: 'public', Icon: Globe, label: 'Public' },
                { id: 'private', Icon: Lock, label: 'Private' },
              ] as const
            ).map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => setDefaultVisibility(id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                  defaultVisibility === id
                    ? 'border-[#536878] bg-[#EEF1F3] text-[#536878]'
                    : 'border-[#E5E4E2] text-[#6B7280] hover:bg-[#EEF1F3]'
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Account privacy */}
        <div className="bg-white rounded-xl border border-[#E5E4E2] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-[#6B7280]" />
              <div>
                <h2 className="font-semibold text-[#0A0A0A]">Private account</h2>
                <p className="text-sm text-[#6B7280] mt-0.5">
                  Only approved followers can see your posts
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                const newValue = !accountPrivate
                setAccountPrivate(newValue)
                try {
                  const updatedUser = await api.users.updateProfile({ is_private: newValue })
                  setUser(updatedUser)
                } catch {
                  setAccountPrivate(!newValue)
                  addToast('Failed to update privacy setting', 'error')
                }
              }}
              role="switch"
              aria-checked={accountPrivate}
              className={cn(
                'relative w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0',
                accountPrivate ? 'bg-[#536878]' : 'bg-[#E5E4E2]'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                  accountPrivate ? 'translate-x-4' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>

        {/* Data export */}
        <div className="bg-white rounded-xl border border-[#E5E4E2] p-6">
          <div className="flex items-start gap-2 mb-3">
            <Download size={16} className="text-[#6B7280] mt-0.5" />
            <div>
              <h2 className="font-semibold text-[#0A0A0A]">Export your data</h2>
              <p className="text-sm text-[#6B7280] mt-0.5">
                Download all your posts, collections, and account data
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download size={14} />
            Request data export
          </Button>
        </div>
      </div>
    </div>
  )
}
