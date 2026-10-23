'use client'

// Trip Planner results: "Where your spending could take you" (spec v4 §4.B).
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBanks, planTrips, type BankOption, type TripItem, type TripPlannerRequest, type TripPlannerResponse } from '@/lib/trip-planner/api'
import { readExistingOnly, readFromWallet, readTripForm, readTripRequest, readTripResult, saveExistingOnly, saveExistingPicks, saveResultsScroll, saveSelectedTrip, saveTripResult, takeResultsScroll } from '@/lib/trip-planner/session'
import ExistingCardsDialog from '@/components/trip-planner/ExistingCardsDialog'
import { CustomizeCta } from '@/components/trip-planner/TripShowcase'
import TripResults from '@/components/trip-planner/TripResults'
import TripCustomizeWizard from '@/components/trip-planner/TripCustomizeWizard'
import MilesLoadingState from '@/components/miles-goal/MilesLoadingState'
import styles from '../../bulk-spend-miles/page.module.css'
import pageStyles from '../../bulk-spend-miles/results/results-page.module.css'
import loadingStyles from '../../bulk-spend-miles/BulkSpendLoading.module.css'
import show from '@/components/trip-planner/TripShowcase.module.css'

export default function TripPlannerResultsPage() {
  const router = useRouter()
  const [request, setRequest] = useState<TripPlannerRequest | null>(null)
  const [result, setResult] = useState<TripPlannerResponse | null>(null)
  const [error, setError] = useState('')
  const [useExisting, setUseExisting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  // ?customize=1 (the result page's New Search) reopens Customize My Trip at its first step.
  const [customizeOpen, setCustomizeOpen] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('customize') === '1')
  const [allBanks, setAllBanks] = useState<BankOption[]>([])
  const [picks, setPicks] = useState<Record<string, string>>({})

  const [fromWallet, setFromWallet] = useState(false) // opened through the Smart Wallet result
  const edit = () => router.push('/trip-planner?edit=1')

  useEffect(() => {
    const saved = readTripRequest()
    if (!saved) {
      router.replace('/trip-planner')
      return
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    setRequest(saved)
    setPicks(readTripForm()?.existingPicks ?? {})
    setUseExisting(readExistingOnly())
    setFromWallet(readFromWallet())
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [router])

  useEffect(() => {
    if (!request) return
    let current = true
    const saved = readTripResult(request)   // coming back from a trip page: show the same results at once
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(saved)
      return () => { current = false }
    }
    planTrips(request)
      .then(response => { if (current) { setResult(response); saveTripResult(request, response) } })
      .catch(reason => current && setError(reason instanceof Error ? reason.message : 'We could not work out your trips right now.'))
    return () => { current = false }
  }, [request])

  // Back from a trip page: return to where the user was on the results.
  useEffect(() => {
    if (!result) return
    const y = takeResultsScroll()
    if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y))
  }, [result])

  // Arriving from a Miles Goal "New Search": show the bottom of the page, where "Customize My Trip" sits, behind the wizard.
  // The page has `scroll-behavior: smooth`, which a still-loading page cuts short, so jump instantly and repeat while content settles.
  const [fromNewSearch] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('customize') === '1')
  useEffect(() => {
    if (!result || !fromNewSearch) return
    const toBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })
    toBottom()
    const timers = [100, 300, 700, 1500].map(delay => window.setTimeout(toBottom, delay))
    return () => timers.forEach(window.clearTimeout)
  }, [result, fromNewSearch])

  const openTrip = (trip: TripItem) => {
    saveSelectedTrip(trip)
    saveResultsScroll(window.scrollY)
    router.push('/trip-planner/trip')
  }

  useEffect(() => { getBanks().then(response => setAllBanks(response.banks)).catch(() => undefined) }, [])

  const heldBanks = useMemo(() => allBanks.filter(bank => request?.banks_held?.includes(bank.bank_code)), [allBanks, request])

  const onToggle = (checked: boolean) => {
    setUseExisting(checked)
    saveExistingOnly(checked)
    if (checked && !Object.keys(picks).length && heldBanks.length) setDialogOpen(true)
  }

  const confirmPicks = (next: Record<string, string>) => {
    saveExistingPicks(next)
    setPicks(next)
    setDialogOpen(false)
    setResult(null)
    setRequest(current => current && { ...current, existing_card_ids: Object.values(next) })
  }

  if (error) {
    return <div className={styles.page}><main className={pageStyles.errorWrap}>
      <p className={styles.error}><i className="ti ti-alert-circle" /> {error}</p>
      <button type="button" className="btn-primary" onClick={edit}><i className="ti ti-arrow-left" /> Edit spending</button>
    </main></div>
  }
  if (!request || !result) {
    return <main className={loadingStyles.screen}><MilesLoadingState destination="your next trip" headline="Finding where your spending could take you…" supportingText="Checking every eligible miles card against your spending." /></main>
  }

  const holdsBanks = (request.banks_held?.length ?? 0) > 0
  const view = useExisting ? result.existing_cards : result.new_cards
  const waitingForPicks = useExisting && !result.existing_cards
  const ignored = result.ignored_non_miles_cards

  const bar = <div className={show.discoverTop}>
    <div className={show.topLeft}>
      <button type="button" className={show.editSpend} onClick={edit}>Edit spending <i className="ti ti-pencil" aria-hidden="true" /></button>
      {fromWallet && <button type="button" className={show.backLink} onClick={() => router.push('/analyse/result')}><i className="ti ti-arrow-left" /> Back to Smart wallet result</button>}
    </div>
    {holdsBanks && <div className={show.existingBox}>
      <label className={show.switch}><input type="checkbox" checked={useExisting} onChange={event => onToggle(event.target.checked)} /><i aria-hidden="true" /> Use only my existing cards</label>
      {useExisting && <button type="button" className={show.edit} onClick={() => setDialogOpen(true)}>Change cards</button>}
    </div>}
  </div>
  const notice = useExisting && ignored.length > 0 && <p className={show.notice} role="status"><i className="ti ti-info-circle" /> {ignored.map(card => card.card_name).join(', ')} {ignored.length === 1 ? 'doesn’t' : 'don’t'} earn miles, so {ignored.length === 1 ? 'it' : 'they'} won’t be counted.</p>
  const hasTrips = !waitingForPicks && !!view && view.trips.length > 0

  return <div className={show.discoverPage}>
    <main className={show.discoverContent}>
      {hasTrips
        ? <TripResults trips={view.trips} onOpen={openTrip} onCustomize={() => setCustomizeOpen(true)} toolbar={<>{bar}{notice}</>} />
        : <section>
          {bar}
          {notice}
          {waitingForPicks
            ? <div className={show.empty}><i className="ti ti-credit-card" /><h3>Choose the cards you already hold</h3><p>{holdsBanks ? 'Pick your card at each bank to see what only those cards could unlock.' : 'Add the banks where you hold a card in step 3 first.'}</p>{holdsBanks && <button type="button" className="btn-primary" onClick={() => setDialogOpen(true)}>Choose my cards</button>}</div>
            : <div className={show.empty}><i className="ti ti-plane-off" /><h3>No trip unlocked yet</h3><p>{view?.empty_reason ?? 'We could not find a trip for this spending.'}</p>{useExisting && <button type="button" className="btn-primary" onClick={() => setUseExisting(false)}>Show all cards instead</button>}</div>}
          <CustomizeCta onClick={() => setCustomizeOpen(true)} />
        </section>}
    </main>
    {customizeOpen && <TripCustomizeWizard request={request} bankCodes={request.banks_held ?? []} onClose={() => setCustomizeOpen(false)} />}
    {dialogOpen && <ExistingCardsDialog banks={heldBanks} picks={picks} onConfirm={confirmPicks} onCancel={() => { setDialogOpen(false); if (!Object.keys(picks).length) setUseExisting(false) }} />}
  </div>
}
