import type { ReactNode } from 'react'
import BenefitsProvider from '@/components/my-benefits/BenefitsProvider'

export default function MyBenefitsLayout({ children }: { children: ReactNode }) {
  return <BenefitsProvider>{children}</BenefitsProvider>
}
