'use client'

// "Turn your everyday spend into a flight ticket" band on the Smart Wallet result page.
// Hands the user's monthly spend (already grouped into the 13 form groups by the backend, for manual and
// statement runs alike; unmapped spend sits under "miscellaneous") to Trip Planner and opens its second step.

/* eslint-disable @next/next/no-img-element */
import { useRouter } from 'next/navigation'
import type { SimulatorRequest, SpendGroup } from '@/lib/wallet-simulator/api'
import { patchProfile } from '@/lib/profile/storage'
import { AIRLINE_LOGO } from '@/lib/trip-planner/bank-logos'

/** Trip Planner's second step ("Upcoming Expenses"), reached with the first step already filled in. */
export const TRIP_PLANNER_FROM_RESULT = '/trip-planner?from=result'

/** The result's monthly spend per form group, in the shape the shared browser profile keeps it. */
function spendFromGroups(groups: SpendGroup[]): Record<string, string> {
  const spend: Record<string, number> = {}
  for (const g of groups) {
    const key = g.group === 'grocery' ? 'grocery_store' : g.group // results saved before the key was renamed
    spend[key] = (spend[key] ?? 0) + g.monthly_spend_aed
  }
  return Object.fromEntries(Object.entries(spend).map(([k, v]) => [k, Math.round(v)]).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, String(v)]))
}

export function FlightBand({ request, groups }: { request: SimulatorRequest; groups: SpendGroup[] }) {
  const router = useRouter()
  const open = () => {
    const spend = spendFromGroups(groups)
    patchProfile({ spend, monthly_total: undefined, ...(request.salary_aed ? { salary: String(request.salary_aed) } : {}) })
    router.push(TRIP_PLANNER_FROM_RESULT)
  }
  return (
    <section className="px-5 py-10 sm:px-8 md:py-14">
      <div className="mx-auto grid max-w-6xl items-stretch overflow-hidden rounded-[28px] bg-gradient-to-br from-[#EEF3FF] via-white to-[#F4F8FF] shadow-[0_18px_50px_rgba(14,55,133,0.12)] ring-1 ring-[#D6E0F5] md:grid-cols-[1.05fr_1fr]">
        {/* image side */}
        <div className="relative min-h-[260px] md:min-h-[380px]">
          <img src="/images/home/outcome-flight-cabin.webp" alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0D1828]/35 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-white/30" />
          <div className="absolute inset-x-5 bottom-5 rounded-2xl bg-white/95 p-4 shadow-[0_12px_32px_rgba(13,24,40,0.18)] backdrop-blur sm:inset-x-auto sm:left-6 sm:bottom-6 sm:w-[320px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold tracking-[0.08em] text-[#5A6A85] uppercase">Where could your spend take you?</span>
              <span className="flex shrink-0 -space-x-1.5">
                <img src={AIRLINE_LOGO.emirates} alt="" className="size-7 rounded-full bg-white object-contain p-1 ring-1 ring-[#D6E0F5]" />
                <img src={AIRLINE_LOGO.etihad} alt="" className="size-7 rounded-full bg-white object-contain p-1 ring-1 ring-[#D6E0F5]" />
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div><div className="text-[22px] leading-none font-bold text-[#0D1828]">DXB</div><div className="mt-1 text-[12px] text-[#5A6A85]">Dubai</div></div>
              <div aria-hidden className="flex flex-1 items-center gap-2 text-[#0E3785]"><span className="h-px flex-1 border-t border-dashed border-[#9DB6E6]" /><span className="text-[16px]">✈</span><span className="h-px flex-1 border-t border-dashed border-[#9DB6E6]" /></div>
              <div className="text-right"><div className="text-[22px] leading-none font-bold text-[#0D1828]">Anywhere</div><div className="mt-1 text-[12px] text-[#5A6A85]">your pick</div></div>
            </div>
          </div>
        </div>

        {/* text side */}
        <div className="flex flex-col items-start justify-center px-6 py-9 sm:px-10 md:px-12">
          <span className="rounded-full bg-[#E3ECFF] px-4 py-1.5 text-[12px] font-bold tracking-[0.04em] text-[#0E3785] uppercase">Next: turn rewards into travel</span>
          <h2 className="font-display mt-5 text-[28px] leading-[1.12] font-bold text-balance text-[#0D1828] sm:text-[38px]">
            Turn your everyday spend into a <span className="text-[#0E3785]">flight ticket.</span>
          </h2>
          <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-[#5A6A85] sm:text-[17px]">
            You&apos;ve found your best card(s). Now see how your spending could turn into real flight tickets.
          </p>
          <button type="button" onClick={open}
            className="mt-7 inline-flex min-h-12 cursor-pointer items-center gap-3 rounded-full border-0 bg-[#0E3785] px-7 py-3 text-[16px] font-bold text-white shadow-[0_8px_22px_rgba(14,55,133,0.28)] transition-transform hover:-translate-y-0.5">
            <span aria-hidden>✈</span> See where I can fly <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </section>
  )
}
