'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LifeMomentBenefit } from '@/lib/life-moments/api'
import { formatFrequency, formatGuestNote, formatMinimumSpend } from '@/lib/life-moments/format'
import styles from './ResultCards.module.css'

type Label = { text: string; kind: 'quantity' | 'spend' | 'guest' }

const labelsFor = (benefit: LifeMomentBenefit): Label[] => {
  const labels: Label[] = []
  const frequency = formatFrequency(benefit)
  const spend = formatMinimumSpend(benefit)
  const guest = formatGuestNote(benefit)
  if (frequency) labels.push({ text: frequency, kind: 'quantity' })
  if (spend) labels.push({ text: spend, kind: 'spend' })
  if (guest) labels.push({ text: guest, kind: 'guest' })
  return labels
}

const hasDetails = (benefit: LifeMomentBenefit) => !!(benefit.benefit_description || benefit.conditions || benefit.additional_info)

// The stored description, conditions and additional info, exactly as saved, in a pop-up over the page.
function BenefitDetailsDialog({ benefit, cardName, onClose }: { benefit: LifeMomentBenefit; cardName: string; onClose: () => void }) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div className={styles.dialogOverlay} role="dialog" aria-modal="true" aria-label={`Details: ${benefit.benefit_name ?? 'benefit'}`} onClick={onClose}>
      <section className={styles.dialogBox} onClick={event => event.stopPropagation()}>
        <header className={styles.dialogHead}>
          <div>
            <h2>{benefit.benefit_name}</h2>
            <p>{cardName}</p>
          </div>
          <button type="button" className={styles.dialogClose} aria-label="Close" onClick={onClose}><i className="ti ti-x" aria-hidden="true" /></button>
        </header>
        <div className={styles.dialogBody}>
          {benefit.benefit_description && <div className={styles.dialogSection}><h3>Description</h3><p>{benefit.benefit_description}</p></div>}
          {benefit.conditions && <div className={styles.dialogSection}><h3>Conditions</h3><p>{benefit.conditions}</p></div>}
          {benefit.additional_info && <div className={styles.dialogSection}><h3>Additional information</h3><p>{benefit.additional_info}</p></div>}
        </div>
      </section>
    </div>,
    document.body,
  )
}

// Shared by the "your cards" panel and the suggested-cards list so a benefit looks the same everywhere.
// Every benefit has its own View details button, on its name line, that opens that benefit's stored text in a pop-up.
export function BenefitList({ benefits, cardName }: { benefits: LifeMomentBenefit[]; cardName: string }) {
  const [active, setActive] = useState<LifeMomentBenefit | null>(null)

  return <>
    <ul className={styles.benefits}>
      {benefits.map(benefit => {
        const labels = labelsFor(benefit)
        return <li key={benefit.benefit_rule_id} className={styles.benefit}>
          <span className={styles.benefitIcon} aria-hidden="true"><i className="ti ti-check" /></span>
          <div className={styles.benefitBody}>
            {benefit.benefit_name && <strong>{benefit.benefit_name}</strong>}
            {benefit.featured_display_message && <span className={styles.featured}>{benefit.featured_display_message}</span>}
          </div>
          {hasDetails(benefit) && <button type="button" className={styles.detailsButton} onClick={() => setActive(benefit)} aria-haspopup="dialog">
            View details <i className="ti ti-arrow-up-right" aria-hidden="true" />
          </button>}
          {labels.length > 0 && <span className={styles.labels}>{labels.map(label => <em key={label.text} className={styles[`label_${label.kind}`]}>{label.text}</em>)}</span>}
        </li>
      })}
    </ul>
    {active && <BenefitDetailsDialog benefit={active} cardName={cardName} onClose={() => setActive(null)} />}
  </>
}
