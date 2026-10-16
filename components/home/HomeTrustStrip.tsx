import s from './Home.module.css'

const POINTS = [
  { icon: 'ti-lock', title: 'No login needed', text: 'Explore Earnn without creating an account.' },
  { icon: 'ti-user-shield', title: 'No personal details needed', text: "We don't need your name, card number or banking credentials." },
  { icon: 'ti-share-off', title: 'No data sharing', text: 'Your data is never shared with or sold to any third party.' },
  { icon: 'ti-shield-check', title: 'Privacy by design', text: 'Built with UAE regulatory data protection requirements in mind.' },
]

// A slim reassurance strip, not a full section.
export default function HomeTrustStrip() {
  return (
    <section className={s.trust} aria-labelledby="trust-title">
      <div className={s.trustInner}>
        <h2 id="trust-title">Your data stays yours.</h2>
        <ul className={s.trustList}>
          {POINTS.map(p => (
            <li key={p.title}>
              <i className={`ti ${p.icon}`} aria-hidden />
              <strong>{p.title}</strong>
              <span>{p.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
