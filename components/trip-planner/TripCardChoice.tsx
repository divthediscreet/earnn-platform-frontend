'use client'

// Last step of Customize My Trip: use only the cards the user already holds, or apply for a new card and count its welcome bonus.
// Either choice is saved the way CustomizeExistingToggle saves it (session storage) and then runs the plan through onDone.
import { useEffect, useState } from 'react'
import { getBanks, type BankOption } from '@/lib/trip-planner/api'
import { readOwnedPicks, saveExistingOnly, saveExistingPicks } from '@/lib/trip-planner/session'
import ExistingCardsDialog from './ExistingCardsDialog'
import local from './TripCustomizeWizard.module.css'

interface Props {
  bankCodes: string[]
  onDone: () => void
}

export default function TripCardChoice({ bankCodes, onDone }: Props) {
  const [allBanks, setAllBanks] = useState<BankOption[]>([])
  const [open, setOpen] = useState(false)
  const [picks, setPicks] = useState<Record<string, string>>({})

  useEffect(() => {
    let current = true
    getBanks().then(response => current && setAllBanks(response.banks)).catch(() => undefined)
    // sessionStorage only exists after hydration, so the saved picks are read in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPicks(readOwnedPicks())
    return () => { current = false }
  }, [])

  const banks = allBanks.filter(bank => bankCodes.includes(bank.bank_code))

  return <section className={local.choiceStep} aria-label="One more thing">
    <button type="button" className={local.choice} onClick={() => setOpen(true)}>
      <i className="ti ti-credit-card" aria-hidden="true" /><span>Using my existing cards only</span>
    </button>
    <button type="button" className={local.choice} onClick={() => { saveExistingOnly(false); onDone() }}>
      <i className="ti ti-gift" aria-hidden="true" /><span>Apply for a new card and get the welcome bonus</span>
    </button>
    {open && <ExistingCardsDialog banks={banks} picks={picks} confirmLabel="Show my plan using my miles card" onCancel={() => setOpen(false)}
      onConfirm={next => { setOpen(false); saveExistingPicks(next, banks.map(bank => bank.bank_code)); setPicks(readOwnedPicks()); saveExistingOnly(true); onDone() }} />}
  </section>
}
