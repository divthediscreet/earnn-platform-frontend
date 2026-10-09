import s from './Home.module.css'

const POINTS = [
  { icon: 'ti-lock', title: 'No login needed', text: 'Explore Earnn without creating an account.' },
  { icon: 'ti-user-shield', title: 'No personal details needed', text: "We don't need your name, card number or banking credentials." },
  { icon: 'ti-file-x', title: "Your statement isn't kept", text: 'Uploaded statements are processed to understand your spending, then deleted.' },
  { icon: 'ti-shield-check', title: 'Built for DIFC data protection requirements', text: 'Designed around the data-protection requirements applicable to Earnn in the DIFC.' },
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
