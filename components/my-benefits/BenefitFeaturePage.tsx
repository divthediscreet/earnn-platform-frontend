'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import SelectedCardsBar from '@/components/life-moments/SelectedCardsBar'
import SuggestedCards from '@/components/life-moments/SuggestedCards'
import TravelBenefitPanel from '@/components/life-moments/TravelBenefitPanel'
import TravelCategoryTiles from '@/components/life-moments/TravelCategoryTiles'
import { fetchLifeMoment, type CatalogueCard, type LifeMomentResponse } from '@/lib/life-moments/api'
import { setCards } from '@/lib/my-benefits/cardsSlice'
import { categoriesForFeature, type BenefitFeature } from '@/lib/my-benefits/features'
import { useAppDispatch, useAppSelector } from '@/lib/my-benefits/hooks'
import BenefitImage from './BenefitImage'
import CardSelectionFlow from './CardSelectionFlow'
import MyCardsDialog from './MyCardsDialog'
import styles from './BenefitFeaturePage.module.css'

// One My Benefits page. The selected cards come from the shared store, so they are picked once per session.
export default function BenefitFeaturePage({ feature }: { feature: BenefitFeature }) {
  const dispatch = useAppDispatch()
  const { cards, hydrated } = useAppSelector(state => state.selectedCards)
  const [result, setResult] = useState<LifeMomentResponse | null>(null)
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [flowOpen, setFlowOpen] = useState(false)
  const [cardsOpen, setCardsOpen] = useState(false)
  const [browseAll, setBrowseAll] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const autoLoaded = useRef(false)

  const load = useCallback(async (selected: CatalogueCard[]) => {
    setLoading(true)
    setError('')
    try {
      const next = await fetchLifeMoment(feature.momentId, selected.map(card => card.earnn_card_id))
      setResult(next)
      setActiveGroup(current => next.groups.some(group => group.display_group === current) ? current : next.groups[0]?.display_group ?? null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not load your benefits.')
    } finally {
      setLoading(false)
    }
  }, [feature.momentId])

  // Cards chosen earlier in this session (here or on another My Benefits page) are used straight away.
  useEffect(() => {
    if (hydrated && cards.length > 0 && !autoLoaded.current) {
      autoLoaded.current = true
      void load(cards)
    }
  }, [hydrated, cards, load])

  const confirm = (selected: CatalogueCard[]) => {
    autoLoaded.current = true
    setFlowOpen(false)
    setCardsOpen(false)
    setBrowseAll(false)
    dispatch(setCards(selected))
    void load(selected)
  }

  // "Show all best cards": skip the user's own cards and go straight to the best cards in this category.
  const browse = () => {
    setFlowOpen(false)
    setCardsOpen(false)
    setBrowseAll(true)
  }
  const categories = categoriesForFeature(feature)
  const activeData = result?.groups.find(group => group.display_group === activeGroup)

  return <div className={styles.page}>
    <section className={styles.hero}>
      <BenefitImage feature={feature} className={styles.heroImage} />
      <div className={styles.heroShade} aria-hidden="true" />
      <div className={styles.heroInner}>
        <Link href="/my-benefits" className={styles.back}><i className="ti ti-arrow-left" aria-hidden="true" /> My Benefits</Link>
        <div className={styles.heroRow}>
          <div className={styles.intro}>
            <h1>{feature.name}</h1>
            <p>{feature.subtitle}</p>
          </div>
          {browseAll ? <button type="button" className={styles.addCardsButton} onClick={() => setFlowOpen(true)}><i className="ti ti-credit-card" aria-hidden="true" /> Add my cards</button> : result && cards.length > 0 && <SelectedCardsBar cards={cards} onOpen={() => setCardsOpen(true)} />}
        </div>
      </div>
    </section>

    <div className={styles.content}>
      {browseAll ? <SuggestedCards key="browse-all" momentId={feature.momentId} ownedIds={[]} topic={feature.name.toLowerCase()} standalone /> : !hydrated || loading ? <div className={styles.status} role="status"><i className="ti ti-loader-2" aria-hidden="true" /><p>Finding benefits on your cards…</p></div> : !result ? <>
        <section className={styles.welcome} aria-label="Choose your cards">
          <div className={styles.welcomeText}>
            <span className={styles.welcomeKicker}>STEP 1 OF 2</span>
            <h2>Add your cards to see {feature.name}</h2>
            <p>Pick your bank, tick the cards you hold, and we’ll show exactly what each one offers. Nothing is saved after you close the tab.</p>
            <ul className={styles.covers} aria-label="What you will see">
              {(feature.groups.length > 1 ? feature.groups : [feature.hint]).slice(0, 8).map(item => <li key={item}><i className="ti ti-circle-check" aria-hidden="true" />{item}</li>)}
              {feature.groups.length > 8 && <li className={styles.coversMore}>+{feature.groups.length - 8} more</li>}
            </ul>
            <div className={styles.welcomeActions}>
              <button type="button" className={styles.launcherButton} onClick={() => setFlowOpen(true)}><i className="ti ti-credit-card" aria-hidden="true" /> Add your cards <i className="ti ti-arrow-right" aria-hidden="true" /></button>
              <button type="button" className={styles.launcherSkip} onClick={browse}>Or show me all the best cards</button>
            </div>
          </div>
        </section>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </> : <>
        {result.groups.length === 0 ? <div className={`${styles.status} ${styles.empty}`}><span className={styles.emptyIcon}><i className="ti ti-search-off" aria-hidden="true" /></span><h2>No {feature.name.toLowerCase()} benefits on your cards</h2><p>None of the cards you selected list benefits here. You can still see which cards do.</p></div> : <>
          {categories.length > 1 && <TravelCategoryTiles groups={result.groups} activeGroup={activeGroup} onSelect={setActiveGroup} categories={categories} />}
          {activeData && <TravelBenefitPanel key={activeData.display_group} group={activeData} icon={categories.find(category => category.name === activeData.display_group)?.icon ?? 'ti-plane'} />}
        </>}
        <SuggestedCards key={cards.map(card => card.earnn_card_id).join(',')} momentId={feature.momentId} ownedIds={cards.map(card => card.earnn_card_id)} topic={feature.name.toLowerCase()} />
      </>}

      {flowOpen && <CardSelectionFlow current={cards} onConfirm={confirm} onCancel={() => setFlowOpen(false)} onSkip={browse} />}
      {cardsOpen && <MyCardsDialog cards={cards} onSave={confirm} onClose={() => setCardsOpen(false)} onSkip={browse} />}
    </div>
  </div>
}
