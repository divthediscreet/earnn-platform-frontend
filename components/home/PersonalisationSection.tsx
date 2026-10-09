import s from './Home.module.css'

type Outcome = 'wallet-a' | 'wallet-b' | 'strategy'

const PROFILES: { amount: string; spends: string[]; outcome: Outcome; label: string; tone: string }[] = [
  { amount: 'AED 8K', spends: ['Groceries', 'Fuel', 'Everyday essentials'], outcome: 'wallet-a', label: 'A different best wallet', tone: '#2F7D6B' },
  { amount: 'AED 15K', spends: ['Dining', 'Shopping', 'Travel'], outcome: 'wallet-b', label: 'A different best wallet', tone: '#B7791F' },
  { amount: 'AED 25K', spends: ['Family', 'School fees', 'Travel'], outcome: 'strategy', label: 'A different strategy', tone: '#3B5BDB' },
]

function OutcomeArt({ kind }: { kind: Outcome }) {
  if (kind === 'wallet-a') {
    return (
      <div className={s.fan} aria-hidden>
        <i style={{ background: 'linear-gradient(135deg,#6a7a96,#3a465c)', transform: 'rotate(-9deg) translate(-16px,4px)' }} />
        <i style={{ background: 'linear-gradient(135deg,#2553A8,#0E3785)', transform: 'rotate(4deg) translate(10px,-2px)' }} />
      </div>
    )
  }
  if (kind === 'wallet-b') {
    return (
      <div className={s.fan} aria-hidden>
        <i style={{ background: 'linear-gradient(135deg,#e6c47a,#b8892f)', transform: 'rotate(-14deg) translate(-26px,6px)' }} />
        <i style={{ background: 'linear-gradient(135deg,#1DAA86,#0A7A60)', transform: 'rotate(-2deg) translate(0,0)' }} />
        <i style={{ background: 'linear-gradient(135deg,#232830,#0e1116)', transform: 'rotate(10deg) translate(26px,4px)' }} />
      </div>
    )
  }
  return (
    <div className={s.plan} aria-hidden>
      <span><i className="ti ti-school" /></span><b />
      <span><i className="ti ti-credit-card" /></span><b />
      <span><i className="ti ti-plane" /></span>
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
            <li key={p.amount} className={s.profile} style={{ ['--tone' as string]: p.tone }}>
              <div className={s.profileTop}>
                <strong>{p.amount}</strong><span>/ month</span>
              </div>
              <ul className={s.spendList}>
                {p.spends.map(x => <li key={x}>{x}</li>)}
              </ul>
              <i className={`ti ti-arrow-down ${s.arrow}`} aria-hidden />
              <OutcomeArt kind={p.outcome} />
              <p className={s.outcomeLabel}>{p.label}</p>
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
