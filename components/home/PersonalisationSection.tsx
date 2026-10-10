import s from './Home.module.css'

type Outcome = 'card' | 'wallet' | 'flight'

const PROFILES: {
  amount: string
  spends: { label: string; icon: string }[]
  outcome: Outcome
  tone: string
  tint: string
  dark: string
  panel: { icon: string; title: string; text: string }
}[] = [
  {
    amount: 'AED 8K',
    spends: [
      { label: 'Groceries', icon: 'ti-shopping-cart' },
      { label: 'Fuel', icon: 'ti-gas-station' },
      { label: 'Everyday essentials', icon: 'ti-shopping-bag' },
    ],
    outcome: 'card',
    tone: '#2F7D6B',
    tint: 'rgba(47, 125, 107, .08)',
    dark: '#1F5F4A',
    panel: { icon: 'ti-chart-bar', title: 'Your best card', text: 'Maximise rewards on your everyday spending.' },
  },
  {
    amount: 'AED 15K',
    spends: [
      { label: 'Dining', icon: 'ti-tools-kitchen-2' },
      { label: 'Shopping', icon: 'ti-shopping-bag' },
      { label: 'Travel', icon: 'ti-plane' },
    ],
    outcome: 'wallet',
    tone: '#B7791F',
    tint: 'rgba(183, 121, 31, .08)',
    dark: '#8A5A12',
    panel: { icon: 'ti-wallet', title: 'Your best wallet', text: 'A combination of cards that gives you more, across categories.' },
  },
  {
    amount: 'AED 25K',
    spends: [
      { label: 'Family', icon: 'ti-home' },
      { label: 'School fees', icon: 'ti-school' },
      { label: 'Travel', icon: 'ti-plane' },
    ],
    outcome: 'flight',
    tone: '#3B5BDB',
    tint: 'rgba(59, 91, 219, .07)',
    dark: '#3B5BDB',
    panel: { icon: 'ti-plane', title: 'Turn spending into your next flight', text: 'Earnn turns your spending into a plan for your next flight.' },
  },
]

function OutcomeArt({ kind }: { kind: Outcome }) {
  if (kind === 'card') {
    return (
      <div className={s.fan} aria-hidden>
        <i style={{ background: 'linear-gradient(135deg,#7b8aa3,#434f66)', transform: 'rotate(-10deg) translate(-34px,8px)' }} />
        <i style={{ background: 'linear-gradient(135deg,#2f63c9,#0E3785 70%,#0a2a6b)', transform: 'rotate(6deg) translate(12px,-4px)' }}><em /></i>
      </div>
    )
  }
  if (kind === 'wallet') {
    return (
      <div className={s.fan} aria-hidden>
        <i style={{ background: 'linear-gradient(135deg,#ecd28b,#b8892f)', transform: 'rotate(-14deg) translate(-44px,10px)' }} />
        <i style={{ background: 'linear-gradient(135deg,#25b995,#0A7A60)', transform: 'rotate(-3deg) translate(-4px,-6px)' }} />
        <i style={{ background: 'linear-gradient(135deg,#2a2f38,#0e1116)', transform: 'rotate(9deg) translate(34px,2px)' }}><em /></i>
      </div>
    )
  }
  return (
    <div className={s.flightPhoto}>
      <img
        src="/images/home/outcome-flight-cabin.webp"
        width={830}
        height={368}
        alt="Inside a business-class cabin: a window with a soft city view, a glass of champagne and a meal"
        loading="lazy"
        decoding="async"
      />
      <span className={s.flightBadge} aria-hidden><i className="ti ti-plane" /></span>
    </div>
  )
}

export default function PersonalisationSection() {
  return (
    <section className={s.personal} aria-labelledby="personal-title">
      <div className={s.personalInner}>
        <div className={s.personalHead}>
          <h2 id="personal-title">Because everyone&rsquo;s money looks different.</h2>
          <p>How you spend matters as much as how much you spend.</p>
        </div>

        <ul className={s.profiles}>
          {PROFILES.map(p => (
            <li
              key={p.amount}
              className={s.profile}
              style={{ ['--tone' as string]: p.tone, ['--tint' as string]: p.tint, ['--dark' as string]: p.dark }}
            >
              <div className={s.profileTop}>
                <strong>{p.amount}</strong><span>/ month</span>
              </div>
              <ul className={s.spendList}>
                {p.spends.map(x => <li key={x.label}><i className={`ti ${x.icon}`} aria-hidden />{x.label}</li>)}
              </ul>
              <i className={`ti ti-arrow-down ${s.arrow}`} aria-hidden />
              <OutcomeArt kind={p.outcome} />
              <div className={`${s.outcomePanel} ${p.outcome === 'flight' ? s.outcomePanelStacked : ''}`}>
                {p.outcome !== 'flight' && <span className={s.outcomeIcon} aria-hidden><i className={`ti ${p.panel.icon}`} /></span>}
                <div>
                  <strong>{p.panel.title}</strong>
                  <span>{p.panel.text}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p className={s.statement}>
          Earnn doesn&rsquo;t find the best card.<br />
          It finds <span>what&rsquo;s best for you.</span>
        </p>
      </div>
    </section>
  )
}
