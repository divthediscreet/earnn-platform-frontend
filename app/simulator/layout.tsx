import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your Smart Wallet — earnn.money',
  description: 'See which UAE credit cards earn the most on how you spend, which card to use for what, and swap any card to watch your yearly rewards update.',
  // Not linked from the site yet (Phase D, pre-launch).
  robots: { index: false, follow: false },
}

export default function SimulatorLayout({ children }: { children: React.ReactNode }) {
  return children
}
