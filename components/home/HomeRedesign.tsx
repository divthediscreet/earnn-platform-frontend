import Image from 'next/image'
import Link from 'next/link'
import { Caveat, Fraunces } from 'next/font/google'
import HomeTrustStrip from './HomeTrustStrip'
import TwoWays from './TwoWays'
import CardSetPicker from './CardSetPicker'
import sibCashback from '@/assets/home-cards/sib-cashback-titanium.webp'
import adcbTalabat from '@/assets/home-cards/adcb-talabat.webp'
import dibShams from '@/assets/home-cards/dib-shams-signature.webp'
import adcb365 from '@/assets/home-cards/adcb-365.webp'
import enbdLuluPlatinum from '@/assets/home-cards/enbd-lulu-platinum.webp'
import { EXPLORE_TOOLS } from './exploreTools'
import styles from './HomeRedesign.module.css'

const hand = Caveat({ subsets: ['latin'], weight: ['500'], display: 'swap', variable: '--font-hand' })
const serif = Fraunces({ subsets: ['latin'], weight: ['600', '700'], display: 'swap', variable: '--font-serif' })

const STEPS = [
  {
    n: '01', icon: 'ti-pencil', art: 'spend', title: 'Tell us how you spend',
    text: 'Enter your monthly expenses and any upcoming big payments.',
    chips: ['AED 12,000 / month', '+ AED 30,000 school fees'],
  },
  {
    n: '02', icon: 'ti-calculator', art: 'maths', title: 'We do the maths',
    text: 'Earnn checks UAE card rewards, limits, fees and spending rules.',
    list: ['Cashback & miles', 'Caps & minimum spends', 'Fees & restrictions'],
    flow: [['Card A', 'Groceries'], ['Card B', 'Dining'], ['Card C', 'Big payments']],
  },
  {
    n: '03', icon: 'ti-route', art: 'strategy', title: 'Get a set of cards',
    text: 'One card is never enough. Choose a set of 2 or 3 cards and see your earnings increase instantly.',
    note: 'Cap hit? We tell you when to switch cards.',
  },
  {
    n: '04', icon: 'ti-gift', art: 'rewards', title: 'Make your spending pay off',
    text: 'Maximise your cashback, turn everyday spending into flight tickets, and unlock more benefits from your cards.',
    list: ['Maximise your cashback', 'Turn spending into flights', 'Unlock card benefits'],
  },
] as const

const OLD_WAY = [
  { icon: 'ti-list-search', title: 'Browse available cards', text: 'Scroll through lists of cards from different banks.' },
  { icon: 'ti-scale', title: 'Compare advertised offers', text: 'Look at welcome bonuses and basic rewards.' },
  { icon: 'ti-credit-card', title: 'Choose one card', text: 'Pick a single card and hope it is the best fit.' },
] as const

const NEW_WAY = [
  { icon: 'ti-chart-pie', tone: 'toneGold', title: 'Start with your spending', text: 'Tell us how you spend and what you care about.' },
  { icon: 'ti-chart-bar', tone: 'tonePurple', title: 'Check rewards, caps & limits', text: 'We check the fine print for you.' },
  { icon: 'ti-cards', tone: 'toneGreen', title: 'Find the right card mix', text: 'Get a personalised combination of cards, not just one.' },
  { icon: 'ti-map-pin', tone: 'toneBlue', title: 'Know which card to use where', text: 'Simple guidance for everyday spending, travel and big purchases.' },
  { icon: 'ti-gift', tone: 'toneRed', title: 'Turn spending into cashback, flights & benefits', text: 'Make every purchase work harder for you.' },
] as const



function StepArt({ kind }: { kind: 'spend' | 'maths' | 'strategy' | 'rewards' }) {
  if (kind === 'spend') return (
    <div className={`${styles.art} ${styles.artSpend}`} aria-hidden>
      {[['ti-shopping-cart', 'Groceries', 78], ['ti-tools-kitchen-2', 'Dining', 52], ['ti-gas-station', 'Fuel', 30]].map(([icon, label, w]) => (
        <div key={label as string} className={styles.artRow}><i className={`ti ${icon}`} /><span>{label}</span><div><u style={{ width: `${w}%` }} /></div></div>
      ))}
      <span className={styles.artTag}><i className="ti ti-school" /> School fees</span>
    </div>
  )
  if (kind === 'maths') return (
    <div className={`${styles.art} ${styles.artMaths}`} aria-hidden>
      <div className={styles.mIn}>
        <span>Groceries</span><span>Dining</span><span>Fuel</span>
      </div>
      <i className="ti ti-arrow-down" />
      <div className={styles.mCore}>
        <Image src="/earnn_logo.jpeg" alt="" width={28} height={28} />
        <b>Earnn checks every card</b>
      </div>
      <i className="ti ti-arrow-down" />
      <div className={styles.mOut}>
        <span><i className="ti ti-circle-check" /> Rewards</span>
        <span><i className="ti ti-circle-check" /> Limits</span>
        <span><i className="ti ti-circle-check" /> Fees</span>
      </div>
    </div>
  )
  if (kind === 'strategy') return (
    <div className={`${styles.art} ${styles.artPicker}`}>
      <CardSetPicker />
    </div>
  )
  return (
    <div className={`${styles.art} ${styles.artRewards}`} aria-hidden>
      <svg className={styles.rwTrail} viewBox="0 0 240 150" preserveAspectRatio="none">
        <circle cx="196" cy="34" r="26" fill="#FFE6A0" opacity=".9" />
        <path d="M18 128 C 70 118, 110 80, 206 30" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />
      </svg>
      <i className={`ti ti-plane ${styles.rwPlane}`} />
      <span className={styles.rwGift}><i className="ti ti-gift" /></span>
      <div className={styles.rwCoins}>
        <u /><u /><u /><u />
        <b>$</b>
      </div>
      <span className={styles.rwCash}>+ Cashback</span>
      <div className={styles.rwTicket}>
        <b>Convert your spending into a flight ticket</b>
      </div>
    </div>
  )
}

export default function HomeRedesign() {
  return (
    <div className={`${styles.page} ${serif.variable} ${hand.variable}`}>
      {/* 1. Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <p className={styles.heroTag}>UAE’s First Multi-Credit Card Rewards Simulator</p>
            <h1>Get more from every dirham you spend.</h1>
            <p className={styles.lead}>Earnn helps you find the right credit cards, know which one to use, and get more cashback, miles and benefits from your everyday spending.</p>
            <div className={styles.actions}>
              <Link href="/find-my-best-cards" className="btn-primary">Find my best cards <i className="ti ti-arrow-right" aria-hidden /></Link>
              <Link href="/simulate-all-uae-cards" className={`btn-secondary ${styles.simLink}`}>UAE Credit Card Simulator <i className="ti ti-arrow-right" aria-hidden /></Link>
            </div>
          </div>
          <div className={styles.heroVisual} aria-hidden>
            <div className={styles.heroPlate} />
            <div className={`${styles.hCard} ${styles.hCardC}`}><Image src={dibShams} alt="" width={240} height={150} /><span>Card C · Big spends</span></div>
            <div className={`${styles.hCard} ${styles.hCardB}`}><Image src={adcb365} alt="" width={240} height={150} /><span>Card B · Dining</span></div>
            <div className={`${styles.hCard} ${styles.hCardA}`}><Image src={enbdLuluPlatinum} alt="" width={240} height={150} priority /><span>Card A · Groceries</span></div>
            <div className={styles.hPanel}>
              <p>This month <small>(example)</small></p>
              <ul>
                <li><i className="ti ti-shopping-cart" /><span>Groceries</span><b>5% back</b></li>
                <li><i className="ti ti-tools-kitchen-2" /><span>Dining</span><b>4x miles</b></li>
                <li><i className="ti ti-gas-station" /><span>Fuel</span><b>3% back</b></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 1b. Two ways to start (before How it works) */}
      <TwoWays />

      {/* 2. How it works */}
      <section id="how-it-works" className={styles.section}>
        <div className={styles.head}>
          <p className={styles.eyebrow}>How it works</p>
          <h2>From spending to reward in four steps.</h2>
        </div>
        <ol className={styles.steps}>
          {STEPS.map(step => (
            <li key={step.n} className={styles.step}>
              <div className={styles.stepTop}><span className={styles.stepNum}>{step.n}</span><i className={`ti ${step.icon}`} aria-hidden /></div>
              <StepArt kind={step.art} />
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              {'chips' in step && <div className={styles.stepChips}>{step.chips.map(c => <span key={c}>{c}</span>)}</div>}
              {'list' in step && <ul className={styles.stepList}>{step.list.map(c => <li key={c}><i className="ti ti-check" aria-hidden />{c}</li>)}</ul>}
              {'flow' in step && <ul className={styles.stepFlow}>{step.flow.map(([a, b]) => <li key={a}><b>{a}</b><i className="ti ti-arrow-right" aria-hidden />{b}</li>)}</ul>}
              {'note' in step && <p className={styles.stepNote}><i className="ti ti-bolt" aria-hidden /> {step.note}</p>}
            </li>
          ))}
        </ol>
      </section>

      {/* 3. Different */}
      <section className={`${styles.section} ${styles.white}`}>
        <div className={styles.head}>
          <p className={styles.eyebrow}>Why Earnn?</p>
          <h2>We don&rsquo;t just compare cards. <span className={styles.mark}>We make them work for you.</span></h2>
        </div>
        <div className={styles.vs}>
          <div className={styles.vsOld}>
            <h3>Traditional comparison</h3>
            <p className={styles.vsSub}>Find a card. Hope it&rsquo;s the right one.</p>
            <ul>
              {OLD_WAY.map(item => (
                <li key={item.title}>
                  <span className={styles.vsIcon}><i className={`ti ${item.icon}`} aria-hidden /></span>
                  <span><b>{item.title}</b><small>{item.text}</small></span>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.vsArrow} aria-hidden>
            <span className={styles.hand}>From comparing&hellip;</span>
            <svg viewBox="0 0 120 60" fill="none"><path d="M6 52 C 30 20, 70 14, 108 30" stroke="#F2B632" strokeWidth="5" strokeLinecap="round" /><path d="M92 14 L110 30 L90 42" stroke="#F2B632" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className={styles.hand}>&hellip;to getting more from every dirham.</span>
          </div>
          <div className={styles.vsNew}>
            <div className={styles.vsNewGrid}>
              <div>
                <h3>Earnn</h3>
                <p className={styles.vsSub}>A smarter way to use credit cards.</p>
                <ul>
                  {NEW_WAY.map(item => (
                    <li key={item.title}>
                      <span className={`${styles.vsIcon} ${styles[item.tone]}`}><i className={`ti ${item.icon}`} aria-hidden /></span>
                      <span><b>{item.title}</b><small>{item.text}</small></span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.vsVisual} aria-hidden>
                <span className={`${styles.vsChip} ${styles.chipA}`}><i className="ti ti-shopping-cart" /> Everyday spending</span>
                <span className={`${styles.vsChip} ${styles.chipB}`}><i className="ti ti-plane" /> Travel bookings</span>
                <span className={`${styles.vsChip} ${styles.chipC}`}><i className="ti ti-tools-kitchen-2" /> Dining &amp; food</span>
                <div className={styles.vsCards}>
                  <Image className={styles.vsCardBack} src={adcbTalabat} alt="" width={240} height={150} />
                  <Image className={styles.vsCardFront} src={sibCashback} alt="" width={240} height={150} />
                </div>
                <div className={styles.vsOutcomes}>
                  <span><i className="ti ti-coins" style={{ color: '#E0A412' }} />Cashback</span>
                  <span><i className="ti ti-plane-departure" style={{ color: '#2A7DE1' }} />Flights</span>
                  <span><i className="ti ti-gift" style={{ color: '#D0463B' }} />Exclusive benefits</span>
                </div>
                <p className={styles.hand}>More rewards.<br />More of what you love.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Tools */}
      <section className={`${styles.section} ${styles.tint}`}>
        <div className={styles.head}>
          <p className={styles.eyebrow}>Explore Earnn</p>
          <h2>Discover what Earnn can do for you.</h2>
        </div>
        <div className={styles.tools}>
          {EXPLORE_TOOLS.map(tool => (
            <Link key={tool.name} href={tool.href} className={styles.tool}>
              <Image src={tool.img} alt={tool.alt} width={800} height={430} sizes="(max-width: 640px) 94vw, (max-width: 1000px) 46vw, 400px" />
              <span className={styles.toolBody}>
                <b>{tool.name}</b>
                <span>{tool.text}</span>
                <em>Open <i className="ti ti-arrow-right" aria-hidden /></em>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 6. Trust + final CTA */}
      <HomeTrustStrip />
      <section className={styles.final} aria-labelledby="final-title">
        <h2 id="final-title">You&apos;re already spending. Why not get more back?</h2>
        <p>Find the right credit cards for your everyday spending and see how much more you could earn in rewards.</p>
        <Link href="/find-my-best-cards" className="btn-primary">See what I could earn <i className="ti ti-arrow-right" aria-hidden /></Link>
        <small>Free to explore. No sign-up needed.</small>
      </section>
    </div>
  )
}
