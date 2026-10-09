'use client'

// The "Use only my existing cards" switch for the Customize step (spec v4 §4.C).  It starts from whatever the trip
// results page used; changing it here (or the cards behind it) is applied only when the user confirms.
import { useEffect, useState } from 'react'
import { getBanks, type BankOption } from '@/lib/trip-planner/api'
import { readTripForm, saveExistingOnly, saveExistingPicks } from '@/lib/trip-planner/session'
import ExistingCardsDialog from './ExistingCardsDialog'
import styles from './TripShowcase.module.css'

interface Props {
  bankCodes: string[]
  value: boolean
  /** Called after the user confirms a change; the page re-runs the calculation. */
  onChange: (useExistingOnly: boolean, existingCardIds: string[]) => void
  /** When set, confirming the cards also runs the plan straight away (the dialog's button then reads "Show my plan"). */
  onPlan?: () => void
}

export default function CustomizeExistingToggle({ bankCodes, value, onChange, onPlan }: Props) {
  const [allBanks, setAllBanks] = useState<BankOption[]>([])
  const [open, setOpen] = useState(false)
  const [picks, setPicks] = useState<Record<string, string>>({})

  useEffect(() => {
    let current = true
    getBanks().then(response => current && setAllBanks(response.banks)).catch(() => undefined)
    // sessionStorage only exists after hydration, so the saved picks are read in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPicks(readTripForm()?.existingPicks ?? {})
    return () => { current = false }
  }, [])

  if (!bankCodes.length) return null
  const banks = allBanks.filter(bank => bankCodes.includes(bank.bank_code))
  const apply = (next: boolean, nextPicks: Record<string, string>) => {
    saveExistingPicks(nextPicks)
    saveExistingOnly(next)
    setPicks(nextPicks)
    onChange(next, Object.values(nextPicks))
  }

  return <>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', margin: '4px 0 14px' }}>
      <label className={styles.switch}>
        <input type="checkbox" checked={value} onChange={event => {
          if (!event.target.checked) return apply(false, picks)
          if (Object.keys(picks).length) return apply(true, picks)
          setOpen(true)
        }} /><i aria-hidden="true" /> Use only my existing cards
      </label>
      {value && <button type="button" className={styles.edit} onClick={() => setOpen(true)}>Change cards</button>}
    </div>
    {open && <ExistingCardsDialog banks={banks} picks={picks} onCancel={() => setOpen(false)} confirmLabel={onPlan ? 'Show my plan using my miles card' : undefined} onConfirm={next => { setOpen(false); apply(true, next); onPlan?.() }} />}
  </>
}
