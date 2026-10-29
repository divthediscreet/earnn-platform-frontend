'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { STORIES, SpeakerAvatar, type Speaker, type StoryKey } from './HeroScenes'
import styles from './HeroStage.module.css'

// The home hero: "There is a right credit card for every ..." with the last word rotating through the five things Earnn does.
// Five small buttons pick one. What the picked tool does opens up under the headline, and on the right a
// small story shows it happening: someone asks their question, a picture shows the situation with real cards, Earnn answers.
const SCENES: readonly {
  word: string; tab: string; icon: string; blurb: string; cta: string; href: string
  story: StoryKey; speaker: Speaker; mind?: boolean; tall?: boolean; question: string; answer: string; stat: string; statLabel: string
}[] = [
  {
    word: 'person', tab: 'For you', icon: 'ti-user-check', cta: 'Find my best cards', href: '/find-my-best-cards',
    blurb: 'Tell us how you spend. We find the best set of cards for you.',
    story: 'person', tall: true, speaker: { skin: '#F2C9A0', hair: '#2B2B3A', shirt: '#0E3785' }, question: 'How can I maximize my cashback?',
    answer: 'Earnn recommends you have these 3 cards.', stat: '3 cards', statLabel: 'built around you',
  },
  {
    word: 'transaction', tab: 'Every swipe', icon: 'ti-scan', cta: 'Check before you pay', href: '/merchant-lookup',
    blurb: 'Search a shop or an app and see which card to use before you pay.',
    story: 'swipe', speaker: { skin: '#D9A77C', hair: '#1F1A17', shirt: '#7A5BD0' }, question: 'What card should I use at Lulu?',
    answer: 'Use this card here. It earns the most at this shop.', stat: '5% back', statLabel: 'at this shop',
  },
  {
    word: 'big purchase', tab: 'Big bills', icon: 'ti-calendar-dollar', cta: 'Plan big payments ahead', href: '/bulk-spend',
    blurb: 'Plan in advance for upcoming big payments like school fees, insurance or a holiday.',
    story: 'bills', speaker: { skin: '#E8B98F', hair: '#6B3F26', shirt: '#E0A412' }, question: 'I have to pay my child’s school fees. Which card should I use?',
    answer: 'This card earns on a payment you have to make anyway.', stat: '3% back', statLabel: 'on school fees',
  },
  {
    word: 'perk', tab: 'Perks', icon: 'ti-gift', cta: 'See my card perks', href: '/my-benefits',
    blurb: 'Find the gym, cinema, lounge and other perks your cards already give you.',
    story: 'perks', speaker: { skin: '#C98E66', hair: '#141414', shirt: '#0C7A5C' }, mind: true, question: 'Do any of my three cards give me free gym access?',
    answer: 'This card has gym access. See every perk in My Benefits.', stat: 'Gym', statLabel: 'access included',
  },
  {
    word: 'trip', tab: 'Trips', icon: 'ti-plane-departure', cta: 'Plan my flight', href: '/trip-planner',
    blurb: 'See how your everyday spending can become a business class ticket.',
    story: 'trip', speaker: { skin: '#F0C4A0', hair: '#B5651D', shirt: '#C0392B' }, question: 'I spend AED 120,000 a year. How can I turn that into a business class ticket?',
    answer: 'Spend on this card and your miles add up to the seat.', stat: 'Business', statLabel: 'class within reach',
  },
]

const ROTATE_MS = 6500

export default function HeroStage() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [locked, setLocked] = useState(false)
  const [calm, setCalm] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setCalm(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  // Rotates on its own until the visitor picks a button: hovering holds the current one, clicking stops the rotation for good
  useEffect(() => {
    if (paused || locked || calm) return
    const timer = window.setTimeout(() => setActive(index => (index + 1) % SCENES.length), ROTATE_MS)
    return () => window.clearTimeout(timer)
  }, [active, paused, locked, calm])

  const scene = SCENES[active]
  const Story = STORIES[scene.story]
  const running = !paused && !locked && !calm

  return (
    <section className={styles.hero} style={{ '--cycle': `${ROTATE_MS}ms` } as CSSProperties}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.tag}><i className="ti ti-sparkles" aria-hidden /> UAE’s First Multi-Credit Card Rewards Simulator</p>
          <h1>
            <span className={styles.lead}>There is a right credit card for every</span>
            <span className={styles.wordBox} aria-hidden>
              <span key={scene.word} className={styles.word}>{scene.word}</span>
              <span className={styles.dot}>.</span>
            </span>
            <span className={styles.visuallyHidden}>person, transaction, big purchase, perk and trip.</span>
          </h1>

          <p key={scene.word} className={styles.open} aria-live="polite">{scene.blurb}</p>

          <div className={styles.picker} role="group" aria-label="What Earnn does" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            {SCENES.map((item, index) => (
              <button key={item.word} type="button" className={`${styles.pick} ${index === active ? styles.pickOn : ''}`} aria-pressed={index === active}
                onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => { setActive(index); setLocked(true) }}>
                <i className={`ti ${item.icon}`} aria-hidden />
                <span>{item.tab}</span>
              </button>
            ))}
          </div>

          <div className={styles.actions}>
            <Link href={scene.href} className={styles.cta}>{scene.cta} <i className="ti ti-arrow-right" aria-hidden /></Link>
            <span className={styles.free}>Free to explore · No sign-up needed</span>
          </div>
        </div>

        <div className={styles.side} aria-hidden>
          <div key={scene.word} className={styles.frame}>
            <span className={styles.exampleTag}>Example</span>
            {scene.mind ? null : (
              <div className={styles.ask}>
                <SpeakerAvatar {...scene.speaker} />
                <p>{scene.question}</p>
              </div>
            )}
            <div className={`${styles.story} ${scene.mind || scene.tall ? styles.storyTall : ''}`}><Story question={scene.question} /></div>
            <div className={styles.answer}>
              <Image src="/earnn_logo.jpeg" alt="" width={34} height={34} />
              <p>{scene.answer}</p>
              <span className={styles.stat}><b>{scene.stat}</b><small>{scene.statLabel}</small></span>
            </div>
          </div>
          <div className={styles.dashes}>
            {SCENES.map((item, index) => (
              <i key={item.word} className={index === active ? styles.dashOn : ''}>
                {index === active ? <u key={`${active}-${paused}-${locked}`} className={running ? styles.dashRun : styles.dashFull} /> : null}
              </i>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
