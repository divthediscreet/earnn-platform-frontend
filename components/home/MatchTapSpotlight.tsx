import Link from 'next/link'
import m from './MatchTap.module.css'

// Match & Tap spotlight: the checkout illustration as a still picture beside the copy.
export default function MatchTapSpotlight() {
  return (
    <section className={m.section} aria-labelledby="matchtap-title">
      <div className={m.inner}>
        <div className={m.text}>
          <p className={m.eyebrow}>Match &amp; Tap</p>
          <h2 id="matchtap-title">Have multiple cards? Which one should I use?</h2>
          <p className={m.lead}>Earnn helps you find the best card to use at the store, before you tap.</p>
          <Link href="/merchant-lookup" className="btn-primary">Which card to use <i className="ti ti-arrow-right" aria-hidden /></Link>
        </div>

        <div className={m.scene}>
          <img
            className={m.photo}
            src="/images/home/match-tap-checkout.webp"
            srcSet="/images/home/match-tap-checkout-960.webp 960w, /images/home/match-tap-checkout.webp 1672w"
            sizes="(max-width: 900px) 92vw, 600px"
            width={1672}
            height={941}
            alt="A shopper at a checkout wonders which of three credit cards to use: a Visa Signature card for dining, an Emirates NBD card for miles, crowned as the best choice, and a FAB card for cashback."
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </section>
  )
}
