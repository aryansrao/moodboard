import Link from 'next/link'
import { LandingAuthGate } from '@/components/LandingAuthGate'
import { RevealSection } from '@/components/ui/RevealSection'
import {
  Link2,
  Sparkles,
  FolderOpen,
  Search,
  Shield,
  Palette,
  PenLine,
  Smartphone,
  Settings,
  Eye,
  Lock,
  Globe,
} from 'lucide-react'

export const metadata = {
  title: 'Moodboard — Save anything from anywhere. Free forever.',
}

// ── Brand logo SVGs ────────────────────────────────────────────────────────
function LogoYouTube() {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
      <rect width="22" height="16" rx="3.5" fill="#FF0000" />
      <path d="M9 4.5L16 8L9 11.5V4.5Z" fill="white" />
    </svg>
  )
}
function LogoInstagram() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <rect x="1" y="1" width="15" height="15" rx="4.5" stroke="#C13584" strokeWidth="1.6" />
      <circle cx="8.5" cy="8.5" r="3.5" stroke="#C13584" strokeWidth="1.6" />
      <circle cx="13" cy="4" r="1" fill="#C13584" />
    </svg>
  )
}
function LogoTikTok() {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
      <path d="M9.5 0C9.7 2.3 11.1 3.8 14 4V6.6C12.4 6.6 11 6.1 10 5.2V11.5C10 14 8 16 5.5 16S1 14 1 11.5 3 7 5.5 7c.3 0 .7 0 1 .1V9.9c-.3-.1-.6-.1-1-.1-1.4 0-2.5 1-2.5 2.5 0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5V0h2z" fill="#010101" />
    </svg>
  )
}
function LogoPinterest() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="8" fill="#E60023" />
      <path d="M8 2.5C5 2.5 2.5 5 2.5 8c0 2.2 1.3 4.1 3.2 5-.1-.4-.1-.9 0-1.4l.6-2.5s-.2-.4-.2-1c0-.9.5-1.7 1.3-1.7.6 0 .9.5.9 1 0 .6-.4 1.6-.6 2.4-.2.7.4 1.3 1.1 1.3 1.3 0 2.1-1.7 2.1-3.7 0-1.5-1-2.6-2.8-2.6-2 0-3.2 1.5-3.2 3.2 0 .6.2 1 .5 1.3 0 .1 0 .2 0 .3l-.3 1.1c0 .1-.1.2-.2.1-.9-.4-1.4-1.5-1.4-2.8 0-2.6 2-5.4 5.9-5.4 3.1 0 5.2 2.3 5.2 4.7 0 3.1-1.7 5.5-4.2 5.5-.8 0-1.6-.5-1.9-1l-.5 2c-.2.6-.6 1.3-.9 1.8.7.2 1.5.3 2.3.3C11 14.5 13.5 11.6 13.5 8c0-3-2.2-5.5-5.5-5.5z" fill="white" />
    </svg>
  )
}
function LogoTwitterX() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M12.6 1h2.3L9.9 6.8 16 15h-4.5L7.5 10.3 2.8 15H.5l5.6-6.5L0 1h4.6l3.5 5.1L12.6 1zm-.8 12.5h1.3L4.3 2.4H3L11.8 13.5z" fill="#000000" />
    </svg>
  )
}
function LogoReddit() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="#FF4500" />
      <path d="M15 9a1.5 1.5 0 0 0-2.5-1.1c-1-.6-2.3-1-3.7-1l.6-2.8 2 .4a1 1 0 1 0 .1-.7L9.3 3.4c-.1 0-.3.1-.3.2L8.3 6.9C6.9 6.9 5.6 7.3 4.6 7.9a1.5 1.5 0 1 0-1.6 2.4c0 .2-.1.4-.1.6C3 12.7 5.7 14 9 14s6-1.3 6-2.9c0-.2 0-.4-.1-.6A1.5 1.5 0 0 0 15 9zm-8.5.9a.9.9 0 1 1 1.7.1.9.9 0 0 1-1.7-.1zm4.9 2.4c-.6.5-1.4.7-2.4.7-1 0-1.8-.2-2.4-.7a.2.2 0 1 1 .3-.3c.5.4 1.2.6 2.1.6.9 0 1.6-.2 2.1-.6a.2.2 0 1 1 .3.3zm-.2-1.5a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8z" fill="white" />
    </svg>
  )
}
function LogoSpotify() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="#1DB954" />
      <path d="M4.5 7.2c2.8-1.6 7.3-1.3 9.5.3.4.3.5.9.2 1.3-.3.4-.9.5-1.3.2-1.8-1.2-5.6-1.5-7.8-.1-.4.2-.9.1-1.1-.3-.3-.4-.1-.9.3-1.1v-.3zm.2 2.9c2.3-1.3 6-1.1 7.9.2.3.2.4.6.2.9-.2.3-.6.4-.9.2-1.6-1-4.8-.9-6.6.2-.3.2-.7.1-.9-.2-.2-.3-.1-.7.2-.9l.1-.4zm-.1 2.7c1.9-1.1 5-1 6.5.2.3.2.3.5.1.7-.2.2-.5.3-.7.1-1.2-.9-3.8-.9-5.4.1-.3.2-.6.1-.7-.2-.2-.3 0-.6.2-.7v-.2z" fill="white" />
    </svg>
  )
}
function LogoVimeo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="#1AB7EA" />
      <path d="M14 6.5c-.1 1.7-1.2 3.9-3.3 6.7C8.4 16 6.6 17.5 5.1 17.5c-.9 0-1.7-1-2.3-2.8L1.7 11C1.2 9.2.8 8.3.2 8.3c-.1 0-.5.3-1.2.9L0 8.5c.7-.7 1.4-1.3 2.1-2C3 5.7 3.7 5.2 4.2 5.1c1.1-.1 1.8.7 2.1 2.4.3 1.7.5 2.8.7 3.3.4 1.7.8 2.5 1.3 2.5.3 0 .8-.5 1.5-1.5.7-1.1 1.1-1.9 1.2-2.4.1-.9-.3-1.4-1.2-1.4-.4 0-.8.1-1.3.3.9-2.9 2.6-4.3 5.1-4.2 1.8.1 2.6 1.2 2.5 3.1L14 6.5z" fill="white" />
    </svg>
  )
}
function LogoSoundCloud() {
  return (
    <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
      <path d="M0 9.5a2.5 2.5 0 0 0 2.5 2.5H4V8.2A4 4 0 0 1 6 7.2a5 5 0 0 1 4.5-4.7A5.5 5.5 0 0 1 16 7h.5A2.5 2.5 0 0 1 19 9.5V12h2.5a.5.5 0 0 0 0-1A2.5 2.5 0 0 0 19 8.5a2.5 2.5 0 0 0-.3.1A5.5 5.5 0 0 0 10.5 2a5.5 5.5 0 0 0-5 3.2A4 4 0 0 0 4 7H2.5A2.5 2.5 0 0 0 0 9.5z" fill="#FF5500" />
    </svg>
  )
}
function LogoBehance() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="#0057FF" />
      <path d="M4 6h3c1.3 0 2.2.8 2.2 2 0 .7-.3 1.2-.8 1.6.9.3 1.3 1 1.3 2 0 1.5-1 2.2-2.7 2.2H4V6zm1.2 3h1.6c.7 0 1.1-.4 1.1-1 0-.5-.4-.9-1.1-.9H5.2V9zm0 3.2h2c.7 0 1.1-.4 1.1-1 0-.7-.4-1-1.1-1H5.2v2zM11 7.8h3.5c-.1-1-1-1.6-1.7-1.6-.8 0-1.6.6-1.8 1.6zm3.9 1.9h-4c.2 1 .8 1.6 1.8 1.6.6 0 1.1-.3 1.4-.8h1.2c-.5 1.1-1.5 1.8-2.7 1.8-1.7 0-3-1.2-3-2.9 0-1.7 1.2-3 3-3s3 1.3 3 3c0 .1 0 .2 0 .3z" fill="white" />
    </svg>
  )
}
function LogoDribbble() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="#EA4C89" />
      <path d="M9 2a7 7 0 1 0 0 14A7 7 0 0 0 9 2zm4.7 3.2c.8.9 1.3 2.1 1.3 3.4-1.1-.2-2.5-.4-4-.2-.2-.5-.4-.9-.6-1.4 1.3-.6 2.5-1.3 3.3-1.8zM9 3.5c1.1 0 2.1.3 2.9.9-.7.4-1.8 1-3.1 1.6-.5-1-1-1.9-1.7-2.4A5.8 5.8 0 0 1 9 3.5zM5.3 4.3c.7.6 1.2 1.5 1.8 2.5-1.9.6-3.6.8-4.7.8.5-1.5 1.5-2.7 2.9-3.3zm-2.8 5c0-.1 0-.2 0-.3 1.3 0 3.3-.2 5.4-1 .2.4.3.7.5 1.1-2.2.7-4 2-5.2 3.7A5.5 5.5 0 0 1 2.5 9zm2.2 4.1c1-1.5 2.7-2.7 4.7-3.4.5 1.5.9 3 1 4.5-2 .6-4.2.1-5.7-1.1zm7.1.5c-.2-1.4-.6-2.8-1-4.1 1.3-.1 2.6 0 3.6.3-.3 1.6-1.3 3-2.6 3.8z" fill="white" />
    </svg>
  )
}

const PLATFORMS = [
  { name: 'YouTube',    Logo: LogoYouTube },
  { name: 'Instagram',  Logo: LogoInstagram },
  { name: 'TikTok',     Logo: LogoTikTok },
  { name: 'Pinterest',  Logo: LogoPinterest },
  { name: 'Twitter / X',Logo: LogoTwitterX },
  { name: 'Reddit',     Logo: LogoReddit },
  { name: 'Spotify',    Logo: LogoSpotify },
  { name: 'Vimeo',      Logo: LogoVimeo },
  { name: 'SoundCloud', Logo: LogoSoundCloud },
  { name: 'Behance',    Logo: LogoBehance },
  { name: 'Dribbble',   Logo: LogoDribbble },
  { name: 'Any URL',    Logo: () => <Globe size={16} className="text-[#536878]" strokeWidth={1.75} /> },
]

export default function LandingPage() {
  return (
    <div className="bg-white min-h-screen font-[family-name:var(--font-inter)] text-[#0A0A0A]">
      <LandingAuthGate />
      <div className="flex flex-col">

        {/* ── NAV ── */}
        <div className="sticky top-0 z-50 px-4 sm:px-[18px] pt-[18px] pb-3">
          <nav className="flex items-center justify-between px-4 sm:px-[18px] py-2.5 rounded-full bg-[rgba(20,20,20,0.72)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] text-white">
            <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-[-0.01em]">
              <span className="w-[26px] h-[26px] rounded-lg overflow-hidden flex-shrink-0">
                <img src="/logo.png" alt="Moodboard" width={26} height={26} className="w-full h-full object-cover" />
              </span>
              Moodboard
            </Link>

            <div className="hidden md:flex items-center gap-1 text-sm text-[rgba(255,255,255,0.78)]">
              {['Features', 'How it works', 'Pricing', 'FAQ'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  className="px-3 py-2 rounded-full hover:bg-[rgba(255,255,255,0.08)] hover:text-white transition-colors"
                >
                  {item}
                </a>
              ))}
              <a
                href="https://github.com/aryansrao/moodboard"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-full hover:bg-[rgba(255,255,255,0.08)] hover:text-white transition-colors flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                Open source
              </a>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 border border-[rgba(255,255,255,0.18)] rounded-full text-[13.5px] text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#0A0A0A] text-[13.5px] font-medium hover:bg-[#CFE3F0] transition-colors"
              >
                Get started
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M8 7h9v9"/></svg>
              </Link>
            </div>
          </nav>
        </div>

        {/* ── HERO ── */}
        <section className="bg-white p-8 sm:p-10 lg:p-14 min-h-screen flex flex-col justify-between">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-9 items-stretch">
            {/* Left */}
            <RevealSection>
              <div className="flex flex-col justify-between gap-6">
                <div>
                  <h1 className="font-display text-[clamp(54px,7vw,108px)] text-[#0A0A0A] m-0">
                    Save anything.<br />From anywhere.
                  </h1>
                  <p className="text-lg text-[#6B6B6B] max-w-[46ch] mt-1">
                    Moodboard is your personal internet archive. Save YouTube videos, Instagram reels, TikToks, design inspiration, articles — AI‑tagged and searchable in seconds.
                  </p>
                </div>

                <div>
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-[rgba(0,0,0,0.16)] rounded-full text-[13px] font-medium text-[#0A0A0A]">
                    Free forever
                  </span>
                </div>

                <div className="flex gap-2.5 flex-wrap">
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2.5 bg-[#0A0A0A] text-white px-5 py-3.5 rounded-full font-medium text-[14.5px] hover:bg-black hover:-translate-y-px transition-all border border-[#0A0A0A]"
                  >
                    Start saving — it&apos;s free
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M8 7h9v9"/></svg>
                  </Link>
                  <a
                    href="#how-it-works"
                    className="inline-flex items-center gap-2.5 bg-transparent text-[#0A0A0A] px-5 py-3.5 rounded-full font-medium text-[14.5px] border border-[rgba(0,0,0,0.16)] hover:bg-[#F4F2EE] transition-colors"
                  >
                    See how it works
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
                  </a>
                </div>
              </div>
            </RevealSection>

            {/* Right: 2×2 honest value tiles */}
            <div className="grid grid-cols-2 gap-3 auto-rows-fr">
              {[
                { headline: 'Any URL', label: 'YouTube, Instagram, TikTok, Spotify — or any link on the internet.', dark: false },
                { headline: 'AI-tagged', label: 'Every save gets a title, smart tags, and a description. Automatically.', dark: true },
                { headline: 'Private first', label: 'Nothing is public by default. Share only what you choose to share.', dark: true },
                { headline: 'Zero limits', label: 'No cap on saves, no paywalls, no throttles. Save as much as you want.', dark: false },
              ].map(({ headline, label, dark }, i) => (
                <RevealSection key={headline} delay={i * 80} className="h-full">
                  <div
                    className={`rounded-[18px] p-5 flex flex-col justify-between h-full ${
                      dark ? 'bg-[#222222] text-white' : 'bg-[#CFE3F0] text-[#0A1F2E]'
                    }`}
                  >
                    <span className="font-[family-name:var(--font-inter-tight)] font-medium text-[clamp(22px,6vw,38px)] leading-[1.1] tracking-[-0.03em] break-words">
                      {headline}
                    </span>
                    <p className={`text-[13.5px] leading-snug mt-3 ${dark ? 'text-[rgba(255,255,255,0.7)]' : 'text-[rgba(10,31,46,0.7)]'}`}>
                      {label}
                    </p>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>

          {/* Platform marquee */}
          <div className="mt-9 border-t border-b border-[rgba(0,0,0,0.06)] py-8 overflow-hidden relative [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
            <div className="marquee-track">
              {[...PLATFORMS, ...PLATFORMS].map(({ name, Logo }, i) => (
                <span key={i} className="inline-flex items-center gap-2.5 text-[15px] text-[#0A0A0A] opacity-70 whitespace-nowrap">
                  <Logo />
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="bg-white p-8 sm:p-10 lg:p-[42px] min-h-[85vh] flex flex-col justify-between" id="features">
          <RevealSection>
            <div className="flex items-start justify-between gap-6 mb-8">
              <h2 className="font-display text-[clamp(40px,5.4vw,76px)] m-0 max-w-[14ch]">Everything<br />you need.</h2>
              <div className="max-w-[46ch] flex-col gap-3 pt-2 hidden sm:flex">
                <span className="text-[11px] tracking-[0.14em] uppercase font-medium text-[#6B6B6B]">What&apos;s inside</span>
                <p className="text-[#6B6B6B] text-[16.5px] leading-[1.55] m-0">
                  Built for people who actually save things — fast, organized, and designed to stay out of your way.
                </p>
              </div>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {([
              { Icon: Link2, title: 'Save from anywhere', desc: 'Paste any URL or share directly from any app. Capture in under a second from YouTube, Instagram, TikTok, Reddit, Spotify — or any site on the web.' },
              { Icon: Sparkles, title: 'AI that actually helps', desc: 'Auto‑generated titles, smart tags, and descriptions. Powered by vision models that look at the actual content — not just the URL.' },
              { Icon: FolderOpen, title: 'Organize into collections', desc: 'Curate boards around any theme. Keep them private, make them public, or share with a link. Clean and simple.' },
              { Icon: Search, title: 'Instant search', desc: 'Full‑text + fuzzy matching across every title, tag, and caption in your library. Finds what you mean, not just what you typed.' },
              { Icon: Shield, title: 'Genuinely free', desc: 'No credit card. No 30‑day trial. No ads. No tracking. Free because we built it to be simple — not because we\'re planning to monetize you later.' },
              { Icon: Eye, title: 'Your data, always', desc: 'Private by default. You control exactly who sees what. Delete everything anytime. No questions asked.' },
            ] as const).map(({ Icon, title, desc }, i) => (
              <RevealSection key={title} delay={i * 60}>
                <article
                  className="border border-[rgba(0,0,0,0.1)] rounded-[20px] p-6 bg-white flex flex-col gap-3.5 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all h-full"
                >
                  <div className="w-[42px] h-[42px] rounded-xl bg-[#CFE3F0] flex items-center justify-center">
                    <Icon size={20} className="text-[#0A1F2E]" />
                  </div>
                  <h3 className="font-[family-name:var(--font-inter-tight)] font-medium text-[22px] tracking-[-0.01em] m-0 leading-[1.15]">
                    {title}
                  </h3>
                  <p className="m-0 text-[#6B6B6B] text-[14.5px] leading-[1.55]">{desc}</p>
                </article>
              </RevealSection>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="bg-[#0A0A0A] text-white p-8 sm:p-10 lg:p-[42px] min-h-[75vh] flex flex-col justify-between" id="how-it-works">
          <RevealSection>
            <div className="flex items-start justify-between gap-6 mb-8">
              <h2 className="font-display text-[clamp(40px,5.4vw,76px)] m-0 max-w-[14ch]">Three steps.<br />Zero friction.</h2>
              <div className="max-w-[46ch] flex-col gap-3 pt-2 hidden sm:flex">
                <span className="text-[11px] tracking-[0.14em] uppercase font-medium text-[rgba(255,255,255,0.55)]">How it works</span>
                <p className="text-[rgba(255,255,255,0.62)] text-[16.5px] leading-[1.55] m-0">
                  From a YouTube link in your clipboard to a searchable card in your library — in seconds. No setup, no migration, no friction.
                </p>
              </div>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {[
              { num: '01', title: 'Paste a URL\nor drop a file', desc: 'From any platform, any app. Drag & drop your own photos, PDFs, or screenshots too. We handle the rest.' },
              { num: '02', title: 'AI tags\n& organizes', desc: 'Instant title, smart tags, auto description. Review it, edit anything, or regenerate. You stay in control.' },
              { num: '03', title: 'Search, browse\n& share', desc: 'Your personal internet archive — fast, private, searchable. Share collections publicly or keep everything to yourself.' },
            ].map(({ num, title, desc }, i) => (
              <RevealSection key={num} delay={i * 100}>
                <article
                  className="border border-[rgba(255,255,255,0.10)] rounded-[20px] p-6 bg-[#161616] flex flex-col gap-4 min-h-[220px]"
                >
                  <span className="font-[family-name:var(--font-inter-tight)] font-medium text-[54px] text-[#CFE3F0] leading-none tracking-[-0.03em]">
                    {num}
                  </span>
                  <h3 className="font-[family-name:var(--font-inter-tight)] font-medium text-[24px] tracking-[-0.01em] m-0 text-white whitespace-pre-line">
                    {title}
                  </h3>
                  <p className="m-0 text-[rgba(255,255,255,0.6)] text-[14.5px] leading-[1.55]">{desc}</p>
                </article>
              </RevealSection>
            ))}
          </div>
        </section>

        {/* ── USE CASES ── */}
        <section className="bg-white p-8 sm:p-10 lg:p-[42px] min-h-[80vh] flex flex-col justify-between">
          <RevealSection>
            <div className="flex items-start justify-between gap-6 mb-8">
              <h2 className="font-display text-[clamp(40px,5.4vw,76px)] m-0 max-w-[14ch]">Built for<br />anyone who<br />saves things.</h2>
              <div className="max-w-[46ch] flex-col gap-3 pt-2 hidden sm:flex">
                <span className="text-[11px] tracking-[0.14em] uppercase font-medium text-[#6B6B6B]">Who it&apos;s for</span>
                <p className="text-[#6B6B6B] text-[16.5px] leading-[1.55] m-0">
                  Whether you hoard design inspiration, track research sources, build a swipe file, or just refuse to lose another bookmark — Moodboard fits.
                </p>
              </div>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {([
              { Icon: Palette, title: 'Designers', desc: 'Save inspiration from Dribbble, Behance, Pinterest, or any random site. Tag by style, mood, color. Build visual boards for every project.' },
              { Icon: PenLine, title: 'Writers & researchers', desc: 'Save articles without losing them. Full‑text search across everything you\'ve ever saved. Add private notes to any post.' },
              { Icon: Smartphone, title: 'Creators', desc: 'Build a swipe file from YouTube, TikTok, Instagram. Capture reference videos, captions, and ideas in one place.' },
              { Icon: Settings, title: 'Developers', desc: 'Bookmark docs, GitHub threads, Stack Overflow answers. Searchable across everything you\'ve ever saved.' },
              { Icon: Eye, title: 'Curators', desc: 'Publish public collections. Share your taste publicly. Turn your saves into a shareable portfolio of links.' },
              { Icon: Lock, title: 'Privacy‑first people', desc: 'Private by default. Nothing leaves your account unless you explicitly share it. Delete everything anytime.' },
            ] as const).map(({ Icon, title, desc }, i) => (
              <RevealSection key={title} delay={i * 50}>
                <div
                  className="border border-[rgba(0,0,0,0.1)] rounded-[20px] p-6 flex gap-4 items-start bg-white"
                >
                  <div className="w-11 h-11 flex-shrink-0 rounded-xl bg-[#F4F2EE] flex items-center justify-center">
                    <Icon size={20} className="text-[#536878]" />
                  </div>
                  <div>
                    <h4 className="m-0 mb-1 font-[family-name:var(--font-inter-tight)] font-medium text-[18px] tracking-[-0.01em]">
                      {title}
                    </h4>
                    <p className="m-0 text-[#6B6B6B] text-[14.5px] leading-[1.55]">{desc}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </section>

        {/* ── COMPARISON TABLE ── */}
        <section className="bg-white p-8 sm:p-10 lg:p-[42px]">
          <RevealSection>
            <div className="flex items-start justify-between gap-6 mb-8">
              <h2 className="font-display text-[clamp(40px,5.4vw,76px)] m-0 max-w-[14ch]">Why not just<br />use bookmarks?</h2>
              <div className="max-w-[46ch] flex-col gap-3 pt-2 hidden sm:flex">
                <span className="text-[11px] tracking-[0.14em] uppercase font-medium text-[#6B6B6B]">Compared</span>
                <p className="text-[#6B6B6B] text-[16.5px] leading-[1.55] m-0">
                  Browser bookmarks are graveyards. Notes apps are noise. Pinterest is ads. Moodboard handles any format, any platform, any workflow.
                </p>
              </div>
            </div>
          </RevealSection>

          <RevealSection delay={100}>
            <div className="border border-[rgba(0,0,0,0.1)] rounded-[20px] overflow-hidden overflow-x-auto">
              <table className="w-full border-collapse text-[14.5px] min-w-[600px]">
                <thead>
                  <tr>
                    <th className="p-3.5 pl-4 text-left bg-[#FAFAF9] font-medium text-[13px] tracking-[0.04em] uppercase text-[#6B6B6B] border-b border-[rgba(0,0,0,0.06)]">Feature</th>
                    <th className="p-3.5 text-left bg-[#0A0A0A] text-white text-[14px] font-medium tracking-[-0.01em] border-b border-[rgba(0,0,0,0.06)]">Moodboard</th>
                    <th className="p-3.5 text-left bg-[#FAFAF9] font-medium text-[13px] tracking-[0.04em] uppercase text-[#6B6B6B] border-b border-[rgba(0,0,0,0.06)]">Browser</th>
                    <th className="p-3.5 text-left bg-[#FAFAF9] font-medium text-[13px] tracking-[0.04em] uppercase text-[#6B6B6B] border-b border-[rgba(0,0,0,0.06)]">Pinterest</th>
                    <th className="p-3.5 text-left bg-[#FAFAF9] font-medium text-[13px] tracking-[0.04em] uppercase text-[#6B6B6B] border-b border-[rgba(0,0,0,0.06)]">Notes app</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Save from YouTube, TikTok, IG, articles', true, false, 'Images only', 'Manual'],
                    ['AI tags, captions, descriptions', true, false, false, false],
                    ['Full‑text search across all saves', true, 'Slow', 'Sponsored', 'Variable'],
                    ['Public & private collections', true, false, 'Yes', 'Limited'],
                    ['Private mode, no public profile', true, 'Local only', false, 'Varies'],
                    ['Genuinely free, no ads', true, 'Yes', false, 'Paid tiers'],
                  ].map(([feature, ...cols], i) => (
                    <tr key={i} className="border-b border-[rgba(0,0,0,0.06)] last:border-0">
                      <td className="p-3.5 pl-4 text-[#0A0A0A]">{feature as string}</td>
                      {cols.map((val, j) => (
                        <td
                          key={j}
                          className={`p-3.5 ${j === 0 ? 'bg-[#FAFAF9] font-medium' : ''}`}
                        >
                          {val === true ? (
                            <span className="inline-grid place-items-center w-[22px] h-[22px] rounded-full bg-[#CFE3F0] text-[#0A1F2E]">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </span>
                          ) : val === false ? (
                            <span className="inline-grid place-items-center w-[22px] h-[22px] rounded-full bg-[#F2F2F2] text-[#9A9A9A]">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </span>
                          ) : (
                            <span className="text-[#9A9A9A]">{val as string}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </RevealSection>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="bg-white p-8 sm:p-10 lg:p-[42px]">
          <RevealSection>
            <div className="flex items-start justify-between gap-6 mb-8">
              <h2 className="font-display text-[clamp(40px,5.4vw,76px)] m-0 max-w-[14ch]">People<br />like it.</h2>
              <div className="max-w-[46ch] flex-col gap-3 pt-2 hidden sm:flex">
                <span className="text-[11px] tracking-[0.14em] uppercase font-medium text-[#6B6B6B]">Early users</span>
                <p className="text-[#6B6B6B] text-[16.5px] leading-[1.55] m-0">
                  Moodboard is brand new. But the people using it right now have been very vocal about it.
                </p>
              </div>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {[
              {
                quote: '"I\'ve been screenshot-dumping into a Notion doc for two years and never finding anything. This just... works. Paste URL, done."',
                name: 'Arjun M.',
                role: 'UX researcher',
                initials: 'AM',
              },
              {
                quote: '"The AI tags are honestly better than what I\'d come up with myself. I saved a 45-minute design talk and it nailed the tags."',
                name: 'Leah T.',
                role: 'Product designer',
                initials: 'LT',
              },
              {
                quote: '"Finally replaced my 4-year-old Chrome bookmark folder graveyard. Searchable. I can actually find things I saved months ago."',
                name: 'Rohan K.',
                role: 'Software developer',
                initials: 'RK',
              },
            ].map(({ quote, name, role, initials }, i) => (
              <RevealSection key={name} delay={i * 80}>
                <article
                  className="border border-[rgba(0,0,0,0.1)] rounded-[20px] p-6 bg-white flex flex-col gap-4 min-h-[230px]"
                >
                  <blockquote className="m-0 font-[family-name:var(--font-inter-tight)] font-medium text-[19px] leading-[1.4] tracking-[-0.01em] text-[#0A0A0A] flex-1">
                    {quote}
                  </blockquote>
                  <div className="flex items-center gap-2.5 mt-auto">
                    <span className="w-9 h-9 rounded-full bg-[#E8E6E1] flex items-center justify-center font-semibold text-[#0A0A0A] text-[13px]">
                      {initials}
                    </span>
                    <div>
                      <p className="text-[13.5px] font-medium m-0">{name}</p>
                      <p className="text-[12.5px] text-[#6B6B6B] m-0">{role}</p>
                    </div>
                  </div>
                </article>
              </RevealSection>
            ))}
          </div>
        </section>

        {/* ── PRICING ── */}
        <section className="bg-white p-8 sm:p-10 lg:p-[42px] min-h-[70vh] flex flex-col justify-between" id="pricing">
          <RevealSection>
            <div className="flex items-start justify-between gap-6 mb-8">
              <h2 className="font-display text-[clamp(40px,5.4vw,76px)] m-0 max-w-[14ch]">Free.<br />No asterisk.</h2>
              <div className="max-w-[46ch] flex-col gap-3 pt-2 hidden sm:flex">
                <span className="text-[11px] tracking-[0.14em] uppercase font-medium text-[#6B6B6B]">Pricing</span>
                <p className="text-[#6B6B6B] text-[16.5px] leading-[1.55] m-0">
                  One plan. Every feature. No credit card. Free because we built it intentional and small — not to farm you for a future upsell.
                </p>
              </div>
            </div>
          </RevealSection>

          <RevealSection delay={80}>
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4 items-stretch">
              <div className="bg-[#0A0A0A] text-white rounded-[24px] p-9 border border-transparent flex flex-col gap-4">
                <span className="inline-flex items-center px-3.5 py-1.5 border border-[rgba(255,255,255,0.22)] rounded-full text-[13.5px] text-white self-start">
                  Forever free
                </span>
                <div className="flex items-end gap-1.5">
                  <span className="font-[family-name:var(--font-inter-tight)] font-medium text-[88px] leading-none tracking-[-0.04em]">$0</span>
                  <span className="text-[18px] text-[rgba(255,255,255,0.6)] font-medium mb-2.5">/ month, forever</span>
                </div>
                <ul className="list-none p-0 m-0 flex flex-col gap-2.5 mt-2">
                  {[
                    'Unlimited saves — any URL, any platform',
                    'Unlimited collections, public & private',
                    'Full AI suite — captions, tags, descriptions',
                    'Full‑text search across everything you save',
                    'Private by default, share only what you want',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-[14.5px]">
                      <span className="inline-grid place-items-center w-[22px] h-[22px] rounded-full bg-[rgba(255,255,255,0.12)] text-[#CFE3F0] flex-shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-[#0A0A0A] text-[13.5px] font-medium hover:bg-[#CFE3F0] transition-colors"
                  >
                    Start saving today
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M8 7h9v9"/></svg>
                  </Link>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {([
                  { num: '$0', desc: 'Cost to you. Today, tomorrow, forever. No upgrade path because there\'s nothing to upgrade to.', ice: true },
                  { num: '0%', desc: 'Of your data sold or shared. We\'re not building an ad business on top of your saves.', ice: false },
                  { num: '100%', desc: 'Of features available from day one. No gating, no "unlock with Pro", no dark patterns.', ice: true },
                ] as const).map(({ num, desc, ice }) => (
                  <div
                    key={num}
                    className={`rounded-[18px] p-6 flex flex-col justify-between gap-3 ${
                      ice ? 'bg-[#CFE3F0] text-[#0A1F2E]' : 'bg-[#222222] text-white'
                    }`}
                  >
                    <span className="font-[family-name:var(--font-inter-tight)] font-medium text-[38px] leading-none tracking-[-0.03em]">{num}</span>
                    <p className={`text-[13.5px] leading-snug m-0 ${ice ? 'text-[rgba(10,31,46,0.7)]' : 'text-[rgba(255,255,255,0.7)]'}`}>
                      {desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </RevealSection>
        </section>

        {/* ── FAQ ── */}
        <section className="bg-white p-8 sm:p-10 lg:p-[42px]" id="faq">
          <RevealSection>
            <div className="flex items-start justify-between gap-6 mb-8">
              <h2 className="font-display text-[clamp(40px,5.4vw,76px)] m-0 max-w-[14ch]">Questions,<br />answered.</h2>
              <div className="max-w-[46ch] flex-col gap-3 pt-2 hidden sm:flex">
                <span className="text-[11px] tracking-[0.14em] uppercase font-medium text-[#6B6B6B]">FAQ</span>
                <p className="text-[#6B6B6B] text-[16.5px] leading-[1.55] m-0">
                  If you have a question not answered here, reach out on socials.
                </p>
              </div>
            </div>
          </RevealSection>

          <div className="border-t border-[rgba(0,0,0,0.06)]">
            {[
              {
                q: 'Is Moodboard really free?',
                a: 'Yes — genuinely, permanently free for personal use. No credit card, no 30-day trial, no "free tier that blocks real features." We\'ll introduce optional paid plans for teams eventually, but the personal version stays free.',
              },
              {
                q: 'Which platforms can I save from?',
                a: 'Anything with a URL — YouTube, Instagram, TikTok, Pinterest, Twitter/X, Reddit, Vimeo, Spotify, SoundCloud, Behance, Dribbble, and any site on the open web. You can also drag & drop your own photos, PDFs, and screenshots.',
              },
              {
                q: 'How does the AI tagging work? Is my content used to train models?',
                a: 'Each save gets passed through a vision-capable AI model that proposes a title, tags, and a short description. You always review the output before it\'s saved, and can edit or regenerate anything. Your content is never used to train AI models.',
              },
              {
                q: 'Can I keep my saves private?',
                a: 'Yes — everything is private by default. You choose what to make public or share. We also don\'t build a public profile for you unless you explicitly set one up.',
              },
              {
                q: 'How is Moodboard different from Pinterest, Are.na, or Raindrop?',
                a: 'Pinterest is images-only and ad-driven. Are.na is paid and image-first. Raindrop is bookmark-centric and doesn\'t handle video, audio, or AI tagging. Moodboard treats every type of content as first-class and makes AI tagging part of every save — all free.',
              },
              {
                q: 'Who built this?',
                a: 'Moodboard is built by Aryan S Rao — a solo indie developer based in India. Independent, bootstrapped, no outside investment.',
              },
            ].map(({ q, a }) => (
              <details key={q} className="group border-b border-[rgba(0,0,0,0.06)] py-5">
                <summary className="list-none cursor-pointer flex justify-between items-center gap-5 font-[family-name:var(--font-inter-tight)] font-medium text-[21px] tracking-[-0.01em] text-[#0A0A0A] hover:text-[#2E4050] transition-colors">
                  {q}
                  <span className="w-8 h-8 rounded-full border border-[rgba(0,0,0,0.16)] flex-shrink-0 flex items-center justify-center group-open:rotate-45 group-open:bg-[#0A0A0A] group-open:text-white group-open:border-[#0A0A0A] transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                  </span>
                </summary>
                <p className="mt-3.5 text-[#6B6B6B] text-[15.5px] leading-[1.65] max-w-[78ch]">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="bg-[#0A0A0A] text-white p-8 sm:p-10 lg:p-[42px] min-h-[50vh] flex items-center">
          <RevealSection className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center w-full">
              <h2 className="font-display text-[clamp(44px,6vw,88px)] m-0">
                Start your<br />internet archive.
              </h2>
              <div className="flex flex-col gap-3.5 items-start">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-white text-[#0A0A0A] text-[15px] font-medium hover:bg-[#CFE3F0] transition-colors"
                >
                  Sign up — it&apos;s free
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M8 7h9v9"/></svg>
                </Link>
                <p className="text-[rgba(255,255,255,0.6)] text-[14.5px] m-0">
                  No credit card. No confirmation hoops. Save your first link in under 30 seconds.
                </p>
              </div>
            </div>
          </RevealSection>
        </section>

        {/* ── FOOTER ── */}
        <footer className="bg-[#0A0A0A] text-[rgba(255,255,255,0.7)] p-8 sm:p-10 lg:p-[42px] border-t border-[rgba(255,255,255,0.06)]">
          <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr] gap-7">
            <div>
              <Link href="/" className="inline-flex items-center gap-2.5 text-white font-semibold text-lg">
                <span className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0">
                  <img src="/logo.png" alt="Moodboard" width={28} height={28} className="w-full h-full object-cover" />
                </span>
                Moodboard
              </Link>
              <p className="mt-3.5 text-sm text-[rgba(255,255,255,0.65)] max-w-[30ch] leading-[1.55]">
                Save anything, from anywhere. Your personal internet archive — private, searchable, free.
              </p>
            </div>

            <div>
              <h5 className="font-[family-name:var(--font-inter-tight)] font-medium text-[13px] tracking-[0.08em] uppercase text-[rgba(255,255,255,0.5)] m-0 mb-3.5">
                Product
              </h5>
              <ul className="list-none p-0 m-0 flex flex-col gap-2.5 text-sm">
                {[
                  { label: 'Home', href: '/home' },
                  { label: 'Collections', href: '/collections' },
                  { label: 'Search', href: '/search' },
                  { label: 'Sign up free', href: '/signup' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-[rgba(255,255,255,0.8)] hover:text-white transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-[42px] pt-5 border-t border-[rgba(255,255,255,0.08)] text-[13px] text-[rgba(255,255,255,0.5)] flex flex-wrap items-center justify-between gap-3">
            <span>
              © 2026 Moodboard — Built by{' '}
              <a href="https://aryansrao.vercel.app" target="_blank" rel="noopener noreferrer" className="text-white font-medium hover:opacity-80 transition-opacity">Aryan S Rao</a>
            </span>
            <a
              href="https://github.com/aryansrao/moodboard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
              Open source · GPL-3.0
            </a>
          </div>
        </footer>

      </div>
    </div>
  )
}
