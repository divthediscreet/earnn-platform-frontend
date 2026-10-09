'use client'

// "Only my existing cards" pop-up (spec v4 §4.A): one row per bank the user holds. Each bank takes one or more cards,
// chosen in a second pop-up that lists ALL of that bank's cards (with small images) as tick boxes, like the bank picker in step 3.
// Both pop-ups render through a portal on document.body, so the card picker is never sized or clipped by the summary pop-up.
// A card that earns no miles is flagged at once and is not counted.
// `picks` keeps the old Record<string,string> shape: the first card of a bank is keyed by the bank code, further ones by `<bank>#<n>`.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getCardImageUrl } from '@/lib/api'
import { getBankCards, type BankCard, type BankOption } from '@/lib/trip-planner/api'
import { bankLogo } from '@/lib/trip-planner/bank-logos'
import styles from './ExistingCardsDialog.module.css'

interface Props {
  banks: BankOption[]
  picks: Record<string, string>
  onConfirm: (picks: Record<string, string>) => void
  onCancel: () => void
  /** Label of the confirm button (default "Use these cards"). */
  confirmLabel?: string
}

const slotsFromPicks = (banks: BankOption[], picks: Record<string, string>) => Object.fromEntries(banks.map(bank => {
  const ids = Object.entries(picks).filter(([key, id]) => id && (key === bank.bank_code || key.startsWith(`${bank.bank_code}#`))).map(([, id]) => id)
  return [bank.bank_code, ids]
}))

function CardThumb({ id }: { id: string }) {
  const [failed, setFailed] = useState(false)
  // eslint-disable-next-line @next/next/no-img-element
  return <span className={styles.thumb}>{failed ? <i className="ti ti-credit-card" aria-hidden="true" /> : <img src={getCardImageUrl(id)} alt="" loading="lazy" onError={() => setFailed(true)} />}</span>
}

function BankMark({ code }: { code: string }) {
  const src = bankLogo(code)
  // eslint-disable-next-line @next/next/no-img-element
  return <span className={styles.bankMark}>{src ? <img src={src} alt="" /> : <i className="ti ti-building-bank" aria-hidden="true" />}</span>
}

export default function ExistingCardsDialog({ banks, picks, onConfirm, onCancel, confirmLabel = 'Use these cards' }: Props) {
  const [cards, setCards] = useState<Record<string, BankCard[]>>({})
  const [slots, setSlots] = useState<Record<string, string[]>>(() => slotsFromPicks(banks, picks))
  const [error, setError] = useState('')
  const [picker, setPicker] = useState<string | null>(null)
  const [draft, setDraft] = useState<string[]>([])
  const [query, setQuery] = useState('')

  // The page behind must not scroll while a pop-up is open.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  useEffect(() => {
    let current = true
    Promise.all(banks.map(bank => getBankCards(bank.bank_code).then(response => [bank.bank_code, response.cards] as const)))
      .then(entries => current && setCards(Object.fromEntries(entries)))
      .catch(reason => current && setError(reason instanceof Error ? reason.message : 'We could not load your banks’ cards.'))
    return () => { current = false }
  }, [banks])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { if (picker) setPicker(null); else onCancel() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [picker, onCancel])

  const removeCard = (bank: string, id: string) => setSlots(current => ({ ...current, [bank]: current[bank].filter(item => item !== id) }))
  const openPicker = (bank: string) => { setDraft(slots[bank] ?? []); setQuery(''); setPicker(bank) }

  const chosenIds = banks.flatMap(bank => slots[bank.bank_code] ?? []).filter(Boolean)
  const milesIds = new Set(Object.values(cards).flat().filter(card => card.is_miles_card).map(card => card.earnn_card_id))
  const anyMiles = chosenIds.some(id => milesIds.has(id))

  const confirm = () => onConfirm(Object.fromEntries(banks.flatMap(bank => (slots[bank.bank_code] ?? []).map((id, index) => [index === 0 ? bank.bank_code : `${bank.bank_code}#${index}`, id] as const))))

  const pickerBank = picker ? banks.find(bank => bank.bank_code === picker) : undefined
  const pickerCards = picker ? (cards[picker] ?? []).filter(card => card.card_name.toLowerCase().includes(query.trim().toLowerCase())) : []

  return <>
    {createPortal(<div className={`${styles.overlay} ${picker ? styles.dimmed : ''}`} role="dialog" aria-modal="true" aria-label="Your existing cards" onClick={onCancel}>
      <section className={`${styles.dialog} ${banks.length >= 4 ? styles.tall : ''}`} onClick={event => event.stopPropagation()}>
        <header className={styles.head}>
          <div><h2>Which cards do you already have?</h2><p>Select your cards. We’ll show what they can unlock.</p></div>
          <button type="button" className={styles.close} aria-label="Close" onClick={onCancel}><i className="ti ti-x" aria-hidden="true" /></button>
        </header>
        <div className={`${styles.body} ${picker ? styles.frozen : ''}`}>
          {banks.map(bank => {
            const list = slots[bank.bank_code] ?? []
            return <div className={styles.bank} key={bank.bank_code}>
              <div className={styles.bankName}><BankMark code={bank.bank_code} /><strong>{bank.bank_name}</strong></div>
              <div className={styles.slots}>
                <button type="button" className={styles.field} disabled={!cards[bank.bank_code]} onClick={() => openPicker(bank.bank_code)}>
                  <i className="ti ti-search" aria-hidden="true" /><span>{cards[bank.bank_code] ? 'Search or select card(s)' : 'Loading cards…'}</span><i className="ti ti-chevron-down" aria-hidden="true" />
                </button>
                {list.length ? <div className={styles.chips}>{list.map(id => {
                  const card = cards[bank.bank_code]?.find(item => item.earnn_card_id === id)
                  const noMiles = !!card && !card.is_miles_card
                  return <span className={`${styles.chip} ${noMiles ? styles.chipWarn : ''}`} key={id}>
                    {card?.card_name ?? 'Loading…'}
                    {noMiles && <span className={styles.warnIcon} tabIndex={0} role="img" aria-label="This card doesn’t earn miles, so it won’t be counted." data-tip="This card doesn’t earn miles, so it won’t be counted."><i className="ti ti-alert-circle-filled" aria-hidden="true" /></span>}
                    <button type="button" aria-label={`Remove ${card?.card_name ?? 'card'}`} onClick={() => removeCard(bank.bank_code, id)}><i className="ti ti-x" aria-hidden="true" /></button>
                  </span>
                })}</div> : null}
              </div>
            </div>
          })}
          {error && <p className={styles.notice} role="alert"><i className="ti ti-alert-circle" aria-hidden="true" /><span>{error}</span></p>}
          {chosenIds.length > 0 && !anyMiles && <p className={styles.notice} role="status"><i className="ti ti-info-circle" aria-hidden="true" /><span><b>None of the selected cards earn miles,</b> so there is nothing to calculate yet.</span></p>}
        </div>
        <footer className={styles.foot}>
          <button type="button" className={styles.back} onClick={onCancel}><i className="ti ti-arrow-left" aria-hidden="true" /> Back</button>
          <button type="button" className={styles.primary} disabled={!anyMiles} onClick={confirm}>{confirmLabel} <i className="ti ti-arrow-right" aria-hidden="true" /></button>
        </footer>
      </section>
    </div>, document.body)}

    {picker && pickerBank && createPortal(<div className={styles.pickBack} role="dialog" aria-modal="true" aria-label={`Select your ${pickerBank.bank_name} cards`} onClick={() => setPicker(null)}>
      <div className={styles.pickBox} onClick={event => event.stopPropagation()}>
        <header className={styles.head}>
          <div><h3>Select your {pickerBank.bank_name} cards</h3><p>Choose all the cards you currently hold.</p></div>
          <button type="button" className={styles.close} aria-label="Close" onClick={() => setPicker(null)}><i className="ti ti-x" aria-hidden="true" /></button>
        </header>
        <div className={styles.searchRow}><label className={styles.search}><i className="ti ti-search" aria-hidden="true" /><input type="search" autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${pickerBank.bank_name} cards…`} aria-label="Search for a card" /></label></div>
        <div className={styles.pickList}>
          {pickerCards.map(card => <label key={card.earnn_card_id} className={draft.includes(card.earnn_card_id) ? styles.pickOn : ''}>
            <input type="checkbox" checked={draft.includes(card.earnn_card_id)} onChange={() => setDraft(current => current.includes(card.earnn_card_id) ? current.filter(id => id !== card.earnn_card_id) : [...current, card.earnn_card_id])} />
            <CardThumb id={card.earnn_card_id} /><span className={styles.cardName}>{card.card_name}</span>
            <em className={card.is_miles_card ? styles.milesTag : styles.noMilesTag}>{card.is_miles_card ? 'Miles card' : 'No miles'}</em>
          </label>)}
          {!cards[picker] && <p className={styles.hint}>Loading cards…</p>}
          {cards[picker] && !pickerCards.length && <p className={styles.hint}>No card matches “{query}”.</p>}
        </div>
        <footer className={styles.foot}>
          <span className={styles.count}>{draft.length} {draft.length === 1 ? 'card' : 'cards'} selected</span>
          <button type="button" className={styles.ghost} onClick={() => setPicker(null)}>Cancel</button>
          <button type="button" className={styles.primary} onClick={() => { setSlots(current => ({ ...current, [picker]: draft })); setPicker(null) }}>{draft.length ? `Add ${draft.length} ${draft.length === 1 ? 'card' : 'cards'}` : 'Done'} <i className="ti ti-arrow-right" aria-hidden="true" /></button>
        </footer>
      </div>
    </div>, document.body)}
  </>
}
