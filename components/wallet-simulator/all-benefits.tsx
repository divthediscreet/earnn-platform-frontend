'use client'

// "See all benefits": every benefit on the wallet's cards, laid out like the My Benefits page
// (same sections, same tile pictures), with whatever has no tile of its own under "Others".

import { useEffect, useMemo, useState } from 'react'
import TravelBenefitPanel from '@/components/life-moments/TravelBenefitPanel'
import BenefitImage from '@/components/my-benefits/BenefitImage'
import { fetchAllBenefits, type LifeMomentGroup } from '@/lib/life-moments/api'
import { benefitSections, categoriesForFeature, type BenefitFeature } from '@/lib/my-benefits/features'

type Tile = { feature: BenefitFeature; groups: LifeMomentGroup[]; benefits: number }

const countBenefits = (groups: LifeMomentGroup[]) => groups.reduce((sum, g) => sum + g.cards.reduce((n, c) => n + c.benefits.length, 0), 0)

export function AllBenefitsDialog({ cardIds, onClose }: { cardIds: string[]; onClose: () => void }) {
  const [groups, setGroups] = useState<LifeMomentGroup[] | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<string | null>(null) // slug of the tile whose benefits are showing
  const key = cardIds.join(',')

  useEffect(() => {
    let cancelled = false
    fetchAllBenefits(cardIds)
      .then(r => { if (!cancelled) setGroups(r.groups) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'We could not load the benefits.') })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  // One tile per My Benefits feature that has benefits on these cards. A group is shown once: a feature
  // that only repeats groups already shown (or the all-in-one My Next Trip) is skipped.
  const { sections, others } = useMemo(() => {
    const byName = new Map((groups ?? []).map(g => [g.display_group, g]))
    const used = new Set<string>()
    const sections = benefitSections().map(section => ({
      category: section.category,
      tiles: section.features.flatMap((feature): Tile[] => {
        if (feature.momentId === 'travel') return []
        const own = feature.groups.filter(name => byName.has(name) && !used.has(name)).map(name => byName.get(name)!)
        own.forEach(g => used.add(g.display_group))
        return own.length ? [{ feature, groups: own, benefits: countBenefits(own) }] : []
      }),
    })).filter(section => section.tiles.length > 0)
    // anything not claimed by a tile (including the backend's own "Others")
    const others = (groups ?? []).filter(g => !used.has(g.display_group))
    return { sections, others }
  }, [groups])

  const active = sections.flatMap(s => s.tiles).find(t => t.feature.slug === open)

  return (
    <div className="fixed inset-0 z-[1060] flex items-start justify-center overflow-y-auto bg-black/45 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="All benefits on your cards"
        className="relative my-auto w-full max-w-6xl rounded-3xl bg-surface-2 p-4 shadow-elevated sm:p-8" onClick={e => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Close"
          className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full bg-muted text-sm text-foreground hover:bg-muted/70">✕</button>
        <h2 className="font-display text-[24px] font-bold text-ws-fg sm:text-[32px]">All benefits on your cards</h2>
        <p className="mt-1 text-[14px] text-ws-muted">Tap a tile to see which of your cards offer it.</p>

        {!groups && !error && <p role="status" className="py-16 text-center text-[15px] text-ws-muted">Finding every benefit on your cards…</p>}
        {error && <p role="alert" className="py-16 text-center text-[15px] text-ws-muted">{error}</p>}

        {groups && sections.map(section => (
          <section key={section.category} className="mt-8" aria-label={section.category}>
            <h3 className="font-display text-[20px] font-bold text-ws-fg">{section.category}</h3>
            <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {section.tiles.map(({ feature, benefits }) => {
                const selected = open === feature.slug
                return (
                  <li key={feature.slug}>
                    <button type="button" aria-pressed={selected} onClick={() => setOpen(selected ? null : feature.slug)}
                      className="group flex w-full cursor-pointer flex-col gap-1 border-0 bg-transparent p-0 text-left">
                      <BenefitImage feature={feature}
                        className={`aspect-square w-full rounded-2xl shadow-md transition group-hover:-translate-y-0.5 ${selected ? 'ring-4 ring-[#F7C948]' : ''}`} />
                      <span className="mt-1 text-[15px] leading-tight font-extrabold text-ws-fg">{feature.name}</span>
                      <span className="text-[12px] text-ws-muted">{benefits} {benefits === 1 ? 'benefit' : 'benefits'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {active && section.tiles.some(t => t === active) && (
              <div className="mt-5 space-y-4">
                {active.groups.map(g => (
                  <TravelBenefitPanel key={g.display_group} group={g}
                    icon={categoriesForFeature(active.feature).find(c => c.name === g.display_group)?.icon ?? 'ti-plane'} />
                ))}
              </div>
            )}
          </section>
        ))}

        {groups && (
          <section className="mt-10" aria-label="Others">
            <h3 className="font-display text-[20px] font-bold text-ws-fg">Others</h3>
            {others.length === 0
              ? <p className="mt-2 text-[14px] text-ws-muted">Nothing else: every benefit on these cards is shown above.</p>
              : <div className="mt-3 space-y-4">{others.map(g => <TravelBenefitPanel key={g.display_group} group={g} icon="ti-dots" />)}</div>}
          </section>
        )}
      </div>
    </div>
  )
}
