'use client'

import { useEffect, useState } from 'react'
import CardNameLink from '@/components/CardNameLink'
import { discoverCards, type BankOption, type SuggestedCard } from '@/lib/life-moments/api'
import { ensureProfileLoaded, patchProfile, readProfile } from '@/lib/profile/storage'
import { BenefitList } from './BenefitItems'
import SuggestFilters from './SuggestFilters'
import CardThumb from './CardThumb'
import styles from './ResultCards.module.css'

type Props = {
  momentId: string
  ownedIds: string[]
  topic: string
  /** Shown on its own (the user chose "show all best cards"): starts at the salary question and cannot be dismissed. */
  standalone?: boolean
}

type Step = 'closed' | 'asking' | 'loading' | 'results'

const formatAmount = (value: number) => new Intl.NumberFormat('en-AE', { maximumFractionDigits: 0 }).format(value)

// Top three get a gold, silver and bronze rank badge; the rest a plain one.
const rankClass = (index: number) => index === 0 ? styles.rankGold : index === 1 ? styles.rankSilver : index === 2 ? styles.rankBronze : ''

// "Other cards you don't own" for the moment on this page: asks for a salary (or skips), then lists the best cards.
export default function SuggestedCards({ momentId, ownedIds, topic, standalone = false }: Props) {
  const [step, setStep] = useState<Step>(standalone ? 'asking' : 'closed')
  const [salaryInput, setSalaryInput] = useState('')
  const [salaryUsed, setSalaryUsed] = useState<number | null>(null)
  const [cards, setCards] = useState<SuggestedCard[]>([])
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [bankOptions, setBankOptions] = useState<BankOption[]>([])
  const [selectedBanks, setSelectedBanks] = useState<string[]>([])
  const [editingSalary, setEditingSalary] = useState(false)
  const [salaryDraft, setSalaryDraft] = useState('')

  // A salary saved earlier in this browser (Best for Me, Compare and so on) is used to prefill the question.
  useEffect(() => {
    void ensureProfileLoaded().then(() => {
      const saved = readProfile()?.salary
      if (saved) setSalaryInput(saved.replace(/\D/g, '').slice(0, 6))
    })
  }, [])

  const run = async (salary: number | null, offset: number, banks: string[] = selectedBanks) => {
    const first = offset === 0
    if (first) setStep('loading')
    else setLoadingMore(true)
    setError('')
    try {
      const response = await discoverCards(momentId, { owned_card_ids: ownedIds, ...(salary !== null ? { min_salary: salary } : {}), ...(banks.length ? { bank_names: banks } : {}), offset })
      setCards(current => first ? response.cards : [...current, ...response.cards])
      setTotal(response.total)
      setBankOptions(response.banks)
      setSelectedBanks(banks)
      setSalaryUsed(salary)
      setStep('results')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not load other cards.')
      setStep('asking')
    } finally {
      setLoadingMore(false)
    }
  }

  const applyFilters = (banks: string[]) => {
    setFiltersOpen(false)
    void run(salaryUsed, 0, banks)
  }

  const saveSalary = () => {
    const salary = salaryDraft ? Number(salaryDraft) : null
    if (salary !== null) patchProfile({ salary: String(salary) })
    setEditingSalary(false)
    void run(salary, 0, selectedBanks)
  }

  const startEditingSalary = () => {
    setSalaryDraft(salaryUsed === null ? '' : String(salaryUsed))
    setEditingSalary(true)
  }

  const submitSalary = () => {
    const salary = salaryInput ? Number(salaryInput) : null
    if (salary !== null) patchProfile({ salary: String(salary) })
    void run(salary, 0, [])
  }

  if (step === 'closed') {
    return <button type="button" className={styles.ctaBanner} onClick={() => setStep('asking')}>
      <span className={styles.ctaIcon}><i className="ti ti-sparkles" aria-hidden="true" /></span>
      <span className={styles.ctaText}>
        <strong>Want more from this category?</strong>
        <span>Show me other cards I don’t own that are best for {topic}</span>
      </span>
      <span className={styles.ctaArrow}><i className="ti ti-arrow-right" aria-hidden="true" /></span>
    </button>
  }

  return <section className={styles.suggest} aria-label={`Other cards for ${topic}`}>
    {(step === 'asking' || step === 'loading') && <div className={styles.bot}>
      <span className={styles.botAvatar}><i className="ti ti-sparkles" aria-hidden="true" /></span>
      <div className={styles.botBody}>
        <p className={styles.botLine}>Okay, help us narrow down the cards that fit your profile.</p>
        <label className={styles.botQuestion} htmlFor="suggest-salary">Please share your estimated monthly salary.</label>
        <form className={styles.salaryForm} onSubmit={event => { event.preventDefault(); submitSalary() }}>
          <span className={styles.salaryField}>
            <span className={styles.salaryPrefix}>AED</span>
            <input
              id="suggest-salary"
              inputMode="numeric"
              autoComplete="off"
              placeholder="15000"
              value={salaryInput}
              onChange={event => setSalaryInput(event.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={step === 'loading'}
            />
          </span>
          <button type="submit" className={styles.primaryButton} disabled={step === 'loading' || !salaryInput}>Show cards</button>
          <button type="button" className={styles.linkButton} onClick={() => void run(null, 0, [])} disabled={step === 'loading'}>Skip</button>
          {!standalone && <button type="button" className={styles.linkButton} onClick={() => setStep('closed')} disabled={step === 'loading'}>Cancel</button>}
        </form>
        {step === 'loading' && <p className={styles.botHint} role="status"><i className="ti ti-loader-2" aria-hidden="true" /> Looking through the cards…</p>}
        {error && <p className={styles.suggestError} role="alert">{error}</p>}
      </div>
    </div>}

    {step === 'results' && <div className={styles.suggestResults}>
      <header className={styles.sectionHead}>
        <span className={`${styles.sectionIcon} ${styles.sectionIconGold}`}><i className="ti ti-trophy" aria-hidden="true" /></span>
        <div className={styles.sectionTitle}>
          <h2>{ownedIds.length ? 'Other cards' : 'Best cards'} for {topic}</h2>
          <p className={styles.summaryLine}>
            <span>Best first, by card tier, then Earnn score.</span>
            {editingSalary ? <span className={styles.salaryEdit}>
              For a monthly salary of AED
              <input
                aria-label="Monthly salary in AED"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                value={salaryDraft}
                onChange={event => setSalaryDraft(event.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={event => { if (event.key === 'Enter') saveSalary(); if (event.key === 'Escape') setEditingSalary(false) }}
              />
              <button type="button" className={styles.salaryIconButton} onClick={saveSalary} aria-label="Save salary"><i className="ti ti-check" aria-hidden="true" /></button>
              <button type="button" className={styles.salaryIconButton} onClick={() => setEditingSalary(false)} aria-label="Cancel salary edit"><i className="ti ti-x" aria-hidden="true" /></button>
            </span> : <span className={styles.salaryShown}>
              {salaryUsed !== null ? `For a monthly salary of AED ${formatAmount(salaryUsed)}` : 'No salary applied'}
              <button type="button" className={styles.salaryIconButton} onClick={startEditingSalary} aria-label={salaryUsed !== null ? 'Edit salary' : 'Add salary'}><i className="ti ti-pencil" aria-hidden="true" /></button>
            </span>}
            {selectedBanks.length > 0 && <span>From {selectedBanks.length === 1 ? selectedBanks[0] : `${selectedBanks.length} banks`}.</span>}
            <span>Showing {cards.length} of {total}.</span>
          </p>
        </div>
        <button type="button" className={styles.filterButton} onClick={() => setFiltersOpen(true)}><i className="ti ti-adjustments-horizontal" aria-hidden="true" /> Filters{selectedBanks.length > 0 ? ` · ${selectedBanks.length}` : ''}</button>
      </header>
      {cards.length === 0 ? <p className={styles.suggestEmpty}>No other cards found{salaryUsed !== null || selectedBanks.length > 0 ? ' for these filters' : ''}. Try a higher salary or another bank.</p> : <ul className={styles.suggestList}>
        {cards.map((card, index) => {
          const tier = [card.network, card.variant].filter(Boolean).join(' ')
          return <li key={card.earnn_card_id} className={styles.resultCard}>
            <div className={styles.cardTop}>
              <span className={`${styles.rank} ${rankClass(index)}`}>{index + 1}</span>
              <CardThumb cardId={card.earnn_card_id} />
              <div className={styles.suggestTitle}>
                <h3><CardNameLink cardId={card.earnn_card_id}>{card.card_name}</CardNameLink></h3>
                <p className={styles.metaChips}>
                  <span className={styles.metaChip}>{card.bank_name}</span>
                  {tier && <span className={`${styles.metaChip} ${styles.metaTier}`}>{tier}</span>}
                  {card.min_salary_aed ? <span className={styles.metaChip}>Salary from AED {formatAmount(card.min_salary_aed)}</span> : null}
                </p>
              </div>
            </div>
            {card.groups.map(group => <div key={group.display_group}>
              {card.groups.length > 1 && <p className={styles.groupLabel}>{group.display_group}</p>}
              <BenefitList benefits={group.benefits} cardName={card.card_name} />
            </div>)}
          </li>
        })}
      </ul>}
      {cards.length < total && <div className={styles.moreRow}>
        <button type="button" className={styles.primaryButton} onClick={() => void run(salaryUsed, cards.length, selectedBanks)} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : `Show ${Math.min(5, total - cards.length)} more`}
        </button>
      </div>}
      {error && <p className={styles.suggestError} role="alert">{error}</p>}
      <SuggestFilters open={filtersOpen} banks={bankOptions} selected={selectedBanks} onApply={applyFilters} onClose={() => setFiltersOpen(false)} />
    </div>}
  </section>
}
