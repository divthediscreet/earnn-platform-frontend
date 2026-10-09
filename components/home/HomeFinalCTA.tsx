import Link from 'next/link'
import s from './Home.module.css'

export default function HomeFinalCTA() {
  return (
    <section className={s.final} aria-labelledby="final-title">
      <div className={s.finalInner}>
        <h2 id="final-title">Your spending already tells a story.</h2>
        <p className={s.finalLead}>Let Earnn show you what to do with it.</p>
        <Link href="/analyse" className="btn-primary">Find what&rsquo;s best for me <i className="ti ti-arrow-right" aria-hidden /></Link>
        <p className={s.finalSmall}>Enter your spending or upload a statement.</p>
        <p className={s.finalUae}>Built for UAE credit cards &amp; rewards.</p>
      </div>
    </section>
  )
}
