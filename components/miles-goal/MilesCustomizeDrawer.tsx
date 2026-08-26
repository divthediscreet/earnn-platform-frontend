'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MERCHANT_OPTIONS, SPEND_CATEGORIES, emptySpendProfile, normalizeSpendValue } from '@/lib/spend-categories'
import type { Airline, PersonalizedProfile } from '@/lib/miles-goal/contracts'
import { formatAed } from '@/lib/miles-goal/format'
import styles from './MilesCustomizeDrawer.module.css'

function initialProfile(existing?: PersonalizedProfile | null): PersonalizedProfile {
  if (existing) return existing
  return {
    salary_aed: 0,
    spend: { ...emptySpendProfile(), miscellaneous: 10000 },
    airline_preference: 'none',
    skywards_miles: 0,
    etihad_guest_miles: 0,
    merchant_prefs: {},
  }
}

export default function MilesCustomizeDrawer({ open, onClose, onSubmit, initial, submitting }: {
  open: boolean
  onClose: () => void
  onSubmit: (profile: PersonalizedProfile) => void
  initial?: PersonalizedProfile | null
  submitting: boolean
}) {
  const [profile, setProfile] = useState(() => initialProfile(initial))
  const [advanced, setAdvanced] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement
    const dialog = dialogRef.current
    const first = dialog?.querySelector<HTMLElement>('input,button,select')
    first?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !dialog) return
      const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled])')]
      if (!focusable.length) return
      const firstItem = focusable[0]
      const lastItem = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus() }
      if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('keydown', keydown); previousFocus.current?.focus() }
  }, [open, onClose])

  const total = useMemo(() => Object.values(profile.spend).reduce((sum, value) => sum + value, 0), [profile.spend])
  if (!open) return null

  const submit = () => {
    if (profile.salary_aed <= 0) { setError('Enter a monthly salary greater than AED 0.'); return }
    if (total <= 0) { setError('Enter monthly spending in at least one category.'); return }
    setError('')
    onSubmit(profile)
  }

  const toggleMerchant = (category: string, merchant: string) => {
    const current = profile.merchant_prefs?.[category] ?? []
    const next = current.includes(merchant) ? current.filter(item => item !== merchant) : [...current, merchant]
    setProfile(value => ({ ...value, merchant_prefs: { ...value.merchant_prefs, [category]: next } }))
  }

  return <div className={styles.backdrop} onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="customize-title" ref={dialogRef}>
      <header><div><span>PERSONALIZE YOUR PLAN</span><h2 id="customize-title">Tell us how you spend</h2><p>We use this profile only for your current browser session.</p></div><button onClick={onClose} aria-label="Close customization"><i className="ti ti-x" /></button></header>
      <div className={styles.body}>
        <section className={styles.primaryFields}>
          <label><span>Monthly salary <b>Required</b></span><div className={styles.moneyInput}><i>AED</i><input type="number" min="1" inputMode="numeric" value={profile.salary_aed || ''} onChange={event => setProfile(value => ({ ...value, salary_aed: normalizeSpendValue(event.target.value) }))} placeholder="e.g. 15,000" /></div></label>
          <label><span>Airline preference</span><select value={profile.airline_preference} onChange={event => setProfile(value => ({ ...value, airline_preference: event.target.value as 'none' | Airline }))}><option value="none">No preference</option><option value="emirates">Emirates</option><option value="etihad">Etihad</option></select></label>
          <label><span>Skywards miles <small>Optional</small></span><input type="number" min="0" value={profile.skywards_miles || ''} onChange={event => setProfile(value => ({ ...value, skywards_miles: normalizeSpendValue(event.target.value) }))} placeholder="0" /></label>
          <label><span>Etihad Guest miles <small>Optional</small></span><input type="number" min="0" value={profile.etihad_guest_miles || ''} onChange={event => setProfile(value => ({ ...value, etihad_guest_miles: normalizeSpendValue(event.target.value) }))} placeholder="0" /></label>
        </section>

        <div className={styles.spendHeading}><div><span>YOUR MONTHLY SPENDING</span><h3>Category breakdown</h3></div><strong>{formatAed(total)}<small> / month</small></strong></div>
        <section className={styles.categories}>{SPEND_CATEGORIES.map(category => (
          <label key={category.key} className={profile.spend[category.key] > 0 ? styles.active : ''}>
            <span className={styles.icon}>{category.icon}</span><span className={styles.categoryName}><b>{category.label}</b><small>{category.hint}</small></span>
            <span className={styles.categoryInput}><i>AED</i><input type="number" min="0" inputMode="numeric" value={profile.spend[category.key] || ''} onChange={event => setProfile(value => ({ ...value, spend: { ...value.spend, [category.key]: normalizeSpendValue(event.target.value) } }))} placeholder="0" /></span>
          </label>
        ))}</section>

        <button className={styles.advancedToggle} onClick={() => setAdvanced(value => !value)} aria-expanded={advanced}><i className="ti ti-adjustments-horizontal" /> Advanced merchant preferences <i className={`ti ti-chevron-${advanced ? 'up' : 'down'}`} /></button>
        {advanced && <section className={styles.advanced}>{Object.entries(MERCHANT_OPTIONS).map(([category, merchants]) => (
          <div key={category}><strong>{SPEND_CATEGORIES.find(item => item.key === category)?.label}</strong><div>{merchants?.map(merchant => {
            const selected = profile.merchant_prefs?.[category]?.includes(merchant.key)
            return <button type="button" key={merchant.key} aria-pressed={selected} onClick={() => toggleMerchant(category, merchant.key)}>{merchant.label}</button>
          })}</div></div>
        ))}</section>}
        {error && <p className={styles.error} role="alert"><i className="ti ti-alert-circle" /> {error}</p>}
      </div>
      <footer><div><small>Monthly spending</small><strong>{formatAed(total)}</strong></div><button className="btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Updating your plan…' : 'Build my miles plan'} <i className="ti ti-arrow-right" /></button></footer>
    </div>
  </div>
}
