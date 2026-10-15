'use client'

import { useEffect } from 'react'
import type { CardInWallet, FeeDetail } from '@/lib/wallet-simulator/api'
import { aed } from '@/lib/wallet-simulator/groups'

/** One card's fee, step by step, in plain language. Every number comes from the backend (`fee_detail`). */
function CardFeeMath({ name, fee, detail }: { name: string; fee: number; detail: FeeDetail | null | undefined }) {
  if (!detail) {
    return (
      <div className="rounded-xl border border-ws-border p-4">
        <p className="text-[14px] font-semibold text-ws-fg">{name}</p>
        <p className="mt-1 text-[13px] text-ws-muted">Estimated annual fee: <strong className="text-ws-fg">{aed(fee)}</strong></p>
      </div>
    )
  }
  const d = detail
  const row = (label: string, value: string, strong = false) => (
    <div className="flex justify-between gap-4">
      <dt className="text-ws-muted">{label}</dt>
      <dd className={`text-right tabular-nums ${strong ? 'font-semibold text-ws-fg' : 'text-ws-fg'}`}>{value}</dd>
    </div>
  )
  const head = (
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-[14px] font-semibold text-ws-fg">{name}</p>
      <p className="shrink-0 text-[14px] font-semibold text-ws-fg tabular-nums">{d.free_for_life ? 'Free for Life' : <>{aed(fee)}<span className="text-[11px] font-normal text-ws-muted"> / year</span></>}</p>
    </div>
  )
  if (d.free_for_life) return <div className="rounded-xl border border-ws-border p-4">{head}</div>

  const hasTarget = d.waiver_threshold_aed !== null
  // fall back to the raw numbers if an older backend omits the newer fields
  const spendGap = d.spend_gap_aed ?? Math.max((d.waiver_threshold_aed ?? 0) - d.annual_spend_aed, 0)
  const waived = d.waiver_applied ?? fee === 0
  const gap = Math.round(spendGap)
  return (
    <div className="rounded-xl border border-ws-border p-4">
      {head}
      <dl className="mt-3 space-y-1.5 text-[13px]">
        {d.first_year_fee_aed !== null ? (
          <>
            {row('First year fee', d.first_year_fee_aed === 0 ? 'No fee' : aed(d.first_year_fee_aed))}
            {row('From the second year', aed(d.year2_fee_aed))}
          </>
        ) : row('Annual fee', aed(d.year2_fee_aed))}
        {hasTarget && row('Fee waived if you spend', `${aed(d.waiver_threshold_aed!)} a year`)}
        {hasTarget && row('Your expected yearly spend', aed(d.annual_spend_aed))}
        {d.fee_benefit_aed > 0 && row('Card benefits that offset the fee', aed(d.fee_benefit_aed))}
        <div className="border-t border-ws-border pt-1.5">{row('Expected annual fee', aed(fee), true)}</div>
      </dl>
      {hasTarget && (
        <p className="mt-3 text-[12px] leading-snug text-ws-muted">
          {spendGap <= 0
            ? <>With your {aed(d.annual_spend_aed)} of yearly spend you meet this target, so we count the fee as waived.</>
            : waived
              ? <>Earnn thinks that with a little effort of about {aed(gap)} more in a year you will be able to meet this target, so we count the fee as waived.</>
              : <>You would need about {aed(gap)} more spend in a year to reach this target, which is a big step, so we don&apos;t count the fee as waived.</>}
        </p>
      )}
    </div>
  )
}

function Shell({ heading, sub, onClose, children }: { heading: string; sub: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[1200] grid place-items-end bg-ws-ink/50 backdrop-blur-sm sm:place-items-center sm:p-6"
      onClick={onClose} role="dialog" aria-modal="true" aria-label={heading}>
      <div onClick={e => e.stopPropagation()}
        className="ws-animate-rise flex max-h-[88vh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-3xl bg-ws-card shadow-ws-plastic sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-ws-border px-6 pt-5 pb-4">
          <div>
            <h2 className="font-display text-[18px] font-semibold text-ws-fg">{heading}</h2>
            <p className="mt-0.5 text-[13px] text-ws-muted">{sub}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-full text-[20px] text-ws-muted hover:bg-ws-secondary">×</button>
        </div>
        <div className="ws-scrollbar flex-1 space-y-3 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

/** Popup explaining how the expected annual fee of each card in a wallet is worked out. */
export function FeeMathDialog({ title, cards, nameOf, onClose }: {
  title: string
  cards: CardInWallet[]
  nameOf: (id: string) => string
  onClose: () => void
}) {
  return (
    <Shell heading="How the annual fee is estimated" sub={title} onClose={onClose}>
      {cards.map(c => <CardFeeMath key={c.card_id} name={c.card_name || nameOf(c.card_id)} fee={c.annual_fee_aed} detail={c.fee_detail} />)}
      <p className="text-[12px] text-ws-muted">
        This is an estimate of what you would pay per year, based on your spending. The bank&apos;s own fee schedule applies when you apply.
      </p>
    </Shell>
  )
}

/** Popup showing monthly rewards less the monthly share of the yearly fee (cashback view, all in AED). */
export function NetOfFeesDialog({ title, monthlyReward, yearlyFee, onClose }: {
  title: string
  monthlyReward: number
  yearlyFee: number
  onClose: () => void
}) {
  const monthlyFee = yearlyFee / 12
  const line = (label: string, value: string, strong = false) => (
    <div className="flex justify-between gap-4">
      <dt className="text-ws-muted">{label}</dt>
      <dd className={`text-right tabular-nums ${strong ? 'font-semibold text-ws-fg' : 'text-ws-fg'}`}>{value}</dd>
    </div>
  )
  return (
    <Shell heading="How rewards after fees are worked out" sub={title} onClose={onClose}>
      <div className="rounded-xl border border-ws-border p-4">
        <dl className="space-y-1.5 text-[13px]">
          {line('Your rewards each month', aed(monthlyReward))}
          {line('Estimated annual fees', aed(yearlyFee))}
          {line('Fees each month', `${aed(yearlyFee)} ÷ 12 = ${aed(monthlyFee)}`)}
          <div className="border-t border-ws-border pt-1.5">
            {line('Rewards after fees', `${aed(monthlyReward)} − ${aed(monthlyFee)} = ${aed(monthlyReward - monthlyFee)} / mo`, true)}
          </div>
        </dl>
      </div>
      <p className="text-[12px] text-ws-muted">The annual fee is spread over 12 months so it can be compared with your monthly rewards.</p>
    </Shell>
  )
}
