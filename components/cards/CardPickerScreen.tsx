'use client'

// "Which cards do you have?" as one two-pane screen, shared by the Trip Planner and My Benefits.
// Left: every bank with its logo and name. Right: the selected bank's cards with their pictures and names, ticked to pick.
// Both sides scroll on their own. What has been picked is not listed here; it is shown by the page once this closes.
// `picks` keeps the Trip Planner's shape: the first card of a bank is keyed by the bank code, further ones by `<bank>#<n>`.
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getCardImageUrl } from '@/lib/api'
import type { BankCard, BankOption } from '@/lib/trip-planner/api'
import { bankLogo } from '@/lib/trip-planner/bank-logos'
import styles from './CardPickerScreen.module.css'

type Props = {
  banks: BankOption[]
  /** Each bank's cards, keyed by bank code. A bank that has no entry yet shows "Loading cards…". */
  cardsByBank: Record<string, BankCard[]>
  picks: Record<string, string>
  onConfirm: (picks: Record<string, string>) => void
  onCancel: () => void
  title?: string
  subtitle?: string
  confirmLabel?: string
  /** Trip Planner only: tag cards as miles / no miles and require at least one miles card. */
  showMiles?: boolean
  error?: string
  /** Optional way out for people who hold no card or want to see the best cards anyway. The label depends on whether anything is ticked. */
  skip?: { labelNone: string; labelSome: string; onSkip: () => void }
}

const slotsFromPicks = (banks: BankOption[], picks: Record<string, string>): Record<string, string[]> => Object.fromEntries(banks.map(bank => {
  const ids = Object.entries(picks).filter(([key, id]) => id && (key === bank.bank_code || key.startsWith(`${bank.bank_code}#`))).map(([, id]) => id)
  return [bank.bank_code, ids]
}))

function BankMark({ code }: { code: string }) {
  const [failed, setFailed] = useState(false)
  const src = bankLogo(code)
  // eslint-disable-next-line @next/next/no-img-element
  return <span className={styles.bankMark}>{src && !failed ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /> : <i className="ti ti-building-bank" aria-hidden="true" />}</span>
}

function CardImage({ id }: { id: string }) {
  const [failed, setFailed] = useState(false)
  // eslint-disable-next-line @next/next/no-img-element
  return <span className={styles.cardImage}>{failed ? <i className="ti ti-credit-card" aria-hidden="true" /> : <img src={getCardImageUrl(id)} alt="" loading="lazy" onError={() => setFailed(true)} />}</span>
}

export default function CardPickerScreen({
  banks, cardsByBank, picks, onConfirm, onCancel,
  title = 'Which cards do you have?', subtitle = 'Choose a bank, then tick the cards you hold.', confirmLabel = 'Done', showMiles = false, error, skip,
}: Props) {
  const [slots, setSlots] = useState<Record<string, string[]>>(() => slotsFromPicks(banks, picks))
  // Open on the first bank that already has a pick; a short list (the Trip Planner's held banks) opens on its first bank.
  const [activeBank, setActiveBank] = useState<string | null>(() => {
    const held = banks.find(bank => (slotsFromPicks(banks, picks)[bank.bank_code] ?? []).length > 0)
    return held?.bank_code ?? (banks.length <= 4 ? banks[0]?.bank_code ?? null : null)
  })
  const [query, setQuery] = useState('')

  // The page behind must not scroll while the screen is open.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const bank = banks.find(item => item.bank_code === activeBank)
  const loaded = activeBank ? cardsByBank[activeBank] : undefined
  const visible = useMemo(() => (loaded ?? []).filter(card => card.card_name.toLowerCase().includes(query.trim().toLowerCase())), [loaded, query])

  const chosenIds = banks.flatMap(item => slots[item.bank_code] ?? [])
  const milesIds = useMemo(() => new Set(Object.values(cardsByBank).flat().filter(card => card.is_miles_card).map(card => card.earnn_card_id)), [cardsByBank])
  const anyMiles = chosenIds.some(id => milesIds.has(id))
  const canConfirm = showMiles ? anyMiles : chosenIds.length > 0

  const choose = (code: string) => { setActiveBank(code); setQuery('') }
  const toggle = (code: string, id: string) => setSlots(current => {
    const list = current[code] ?? []
    return { ...current, [code]: list.includes(id) ? list.filter(item => item !== id) : [...list, id] }
  })
  const confirm = () => onConfirm(Object.fromEntries(banks.flatMap(item => (slots[item.bank_code] ?? []).map((id, index) => [index === 0 ? item.bank_code : `${item.bank_code}#${index}`, id] as const))))

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={title} onClick={onCancel}>
      <section className={styles.screen} onClick={event => event.stopPropagation()}>
        <header className={styles.head}>
          <div><h2>{title}</h2><p>{subtitle}</p></div>
          <button type="button" className={styles.close} aria-label="Close" onClick={onCancel}><i className="ti ti-x" aria-hidden="true" /></button>
        </header>

        <div className={styles.body}>
          <nav className={styles.banks} aria-label="Banks">
            {banks.map(item => <button key={item.bank_code} type="button" className={item.bank_code === activeBank ? styles.bankOn : ''} aria-pressed={item.bank_code === activeBank} onClick={() => choose(item.bank_code)}>
              <BankMark code={item.bank_code} /><span>{item.bank_name}</span>
            </button>)}
            {!banks.length && <p className={styles.hint}>{error || 'Loading banks…'}</p>}
          </nav>

          <div className={styles.cards}>
            {!bank ? <div className={styles.placeholder}><i className="ti ti-building-bank" aria-hidden="true" /><strong>Choose a bank</strong><span>Its cards will appear here.</span></div> : <>
              <div className={styles.cardsHead}>
                <div className={styles.cardsTitle}><BankMark code={bank.bank_code} /><strong>{bank.bank_name}</strong></div>
                <label className={styles.search}><i className="ti ti-search" aria-hidden="true" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search cards…" aria-label={`Search ${bank.bank_name} cards`} /></label>
              </div>
              <div className={styles.cardGrid}>
                {visible.map(card => {
                  const on = (slots[bank.bank_code] ?? []).includes(card.earnn_card_id)
                  return <label key={card.earnn_card_id} className={`${styles.card} ${on ? styles.cardOn : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => toggle(bank.bank_code, card.earnn_card_id)} />
                    <span className={styles.tick} aria-hidden="true"><i className="ti ti-check" /></span>
                    <CardImage id={card.earnn_card_id} />
                    <span className={styles.cardName}>{card.card_name}</span>
                    {showMiles && <em className={card.is_miles_card ? styles.milesTag : styles.noMilesTag}>{card.is_miles_card ? 'Miles card' : 'No miles'}</em>}
                  </label>
                })}
                {!loaded && <p className={styles.hint}>{error || 'Loading cards…'}</p>}
                {loaded && !visible.length && <p className={styles.hint}>No card matches “{query}”.</p>}
              </div>
            </>}
          </div>
        </div>

        {showMiles && chosenIds.length > 0 && !anyMiles && <p className={styles.notice} role="status"><i className="ti ti-info-circle" aria-hidden="true" /><span><b>None of the selected cards earn miles,</b> so there is nothing to calculate yet.</span></p>}

        <footer className={styles.foot}>
          <span className={styles.count} aria-live="polite">{chosenIds.length} {chosenIds.length === 1 ? 'card' : 'cards'} selected</span>
          <button type="button" className={styles.back} onClick={onCancel}>Cancel</button>
          <button type="button" className={styles.primary} disabled={!canConfirm} onClick={confirm}>{confirmLabel} <i className="ti ti-arrow-right" aria-hidden="true" /></button>
        </footer>
        {skip && <button type="button" className={styles.skipBar} onClick={skip.onSkip}><i className="ti ti-sparkles" aria-hidden="true" /> {chosenIds.length > 0 ? skip.labelSome : skip.labelNone} <i className="ti ti-arrow-right" aria-hidden="true" /></button>}
      </section>
    </div>,
    document.body,
  )
}
