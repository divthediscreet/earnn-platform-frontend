'use client'
import Link from 'next/link'

const SUPPORTED_BANKS = ['ENBD', 'FAB', 'ADCB', 'RAK', 'HSBC', 'Mashreq', 'DIB', 'CBD', 'ADIB', 'Citi']

const PROBLEM_STATS = [
  { value: 'AED 3,400+', label: 'Average rewards left unclaimed per year' },
  { value: '68%', label: 'Of purchases made on the wrong card' },
  { value: '12 hrs', label: 'Wasted yearly tracking statements manually' },
]

const PROBLEM_POINTS = [
  { icon: '💳', title: 'Using Skywards for groceries?', desc: 'Earn 0.5 miles instead of 5% cashback. That\'s AED 900 lost every year on grocery spend alone.' },
  { icon: '🔁', title: 'Cashback cap hit and forgotten', desc: 'FAB and ENBD cards cap rewards monthly. Most users hit the limit by week 3 and earn nothing after.' },
  { icon: '🎁', title: 'Miles expiring unused', desc: 'UAE Skywards members lose an average AED 600/year to expired miles and unredeemed vouchers.' },
  { icon: '✈️', title: 'FX fees on every trip abroad', desc: 'Using the wrong card internationally costs 2.99% per transaction — AED 1,200/year for a regular traveller.' },
  { icon: '📉', title: 'No card earns on everything', desc: 'Every card has blind spots. The right wallet of 2–3 cards covers every category at maximum rate.' },
]

const HOW_IT_WORKS = [
  { step: '01', icon: '🔗', title: 'Connect', desc: 'Upload your statement securely. No bank login, no credentials — just a PDF.' },
  { step: '02', icon: '🧠', title: 'Analyse', desc: 'We identify every merchant, category, and reward opportunity across your spending.' },
  { step: '03', icon: '⚡', title: 'Optimise', desc: 'See exactly which cards maximise your rewards — and how much you\'ve been leaving behind.' },
]

const SECURITY_POINTS = [
  { icon: '🕵️', title: 'Redacted before upload', desc: 'Card & personal details stripped before analysis.' },
  { icon: '🗑️', title: 'Nothing stored', desc: 'Your statement is deleted right after your results.' },
  { icon: '🇦🇪', title: 'UAE-based & compliant', desc: 'Processed within UAE, aligned with CBUAE guidelines.' },
  { icon: '🚫', title: 'Zero bank access', desc: 'No linking, no account — just a PDF and your answer.' },
]

function DataGridBackdrop() {
  const dots = [
    { top: '14%', left: '10%' }, { top: '22%', left: '78%' }, { top: '8%', left: '46%' },
    { top: '38%', left: '20%' }, { top: '32%', left: '64%' }, { top: '52%', left: '88%' },
    { top: '62%', left: '34%' }, { top: '70%', left: '8%' }, { top: '78%', left: '58%' },
    { top: '86%', left: '80%' }, { top: '46%', left: '6%' }, { top: '18%', left: '92%' },
  ]
  const streaks = [
    { top: '20%', left: '4%', width: 140, rotate: -12 }, { top: '34%', left: '70%', width: 180, rotate: 8 },
    { top: '60%', left: '14%', width: 160, rotate: -6 }, { top: '74%', left: '60%', width: 200, rotate: 14 },
    { top: '12%', left: '40%', width: 120, rotate: 5 }, { top: '84%', left: '30%', width: 150, rotate: -10 },
  ]
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Fine grid lines */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.18, backgroundImage: 'linear-gradient(rgba(120,170,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(120,170,255,0.18) 1px, transparent 1px)', backgroundSize: '38px 38px' }} />
      {/* Glow streaks */}
      {streaks.map((s, i) => (
        <div key={`s${i}`} style={{
          position: 'absolute', top: s.top, left: s.left, width: s.width, height: 1.5,
          background: 'linear-gradient(90deg, transparent, rgba(140,190,255,0.55), transparent)',
          transform: `rotate(${s.rotate}deg)`
        }} />
      ))}
      {/* Glowing data points */}
      {dots.map((d, i) => (
        <div key={`d${i}`} style={{
          position: 'absolute', top: d.top, left: d.left, width: 6, height: 6, borderRadius: '50%',
          background: '#BFE0FF', boxShadow: '0 0 14px 4px rgba(140,190,255,0.55)'
        }} />
      ))}
      {/* Central glow */}
      <div style={{ position: 'absolute', top: '38%', left: '50%', width: 420, height: 420, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,180,255,0.22) 0%, transparent 70%)' }} />
    </div>
  )
}

export default function HomePage() {
  return (
    <div style={{ background: 'white' }}>
      {/* HERO */}
      <section style={{
        position: 'relative', overflow: 'hidden', padding: '120px 24px 100px', textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(5,14,36,0.55) 0%, rgba(8,24,60,0.65) 60%, rgba(5,14,36,0.8) 100%), url(/hero-card-cover-2.png)',
        backgroundSize: 'cover', backgroundPosition: 'right center', backgroundRepeat: 'no-repeat'
      }}>
        <div style={{ maxWidth: 820, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 100, padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#9FC2FF', letterSpacing: '0.04em', marginBottom: 32 }}>
            ✨ AI Financial Intelligence · Now in Early Access
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 24, color: 'white' }}>
            Stop Using the<br />Wrong Credit Card.
          </h1>
          <p style={{ fontSize: 'clamp(17px, 2vw, 20px)', color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: 44, maxWidth: 660, margin: '0 auto 44px' }}>
            Earnn shows which cards maximise rewards for your actual spending habits.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/analyse" style={{ background: 'linear-gradient(90deg, #F5C842, #D4A017)', color: '#0E3785', padding: '16px 36px', borderRadius: 10, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 10px 30px rgba(212,160,23,0.4)' }}>
              Analyse If You Are Losing Money →
            </Link>
          </div>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section style={{ padding: '112px 24px', background: 'white' }}>
        <div style={{ maxWidth: 1152, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#3D6FD6', letterSpacing: '0.08em', marginBottom: 12 }}>THE PROBLEM</div>
            <h2 style={{ fontSize: 'clamp(32px, 4.5vw, 48px)', fontWeight: 600, color: '#0A1A33', marginBottom: 16 }}>
              Most people leave <span style={{ background: 'linear-gradient(90deg,#0E3785,#4E83E0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>thousands</span> on the table.
            </h2>
            <p style={{ fontSize: 16, color: '#5A6A85', maxWidth: 520, margin: '0 auto' }}>Banks design rewards to be confusing. We built AI to make them obvious.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, marginBottom: 24 }}>
            {PROBLEM_STATS.map((s, i) => (
              <div key={i} style={{ background: 'linear-gradient(135deg, #EEF3FF 0%, #F8FAFF 100%)', borderRadius: 16, padding: '40px 36px', border: '1px solid #E4ECFA', textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(32px, 4.5vw, 44px)', fontWeight: 600, color: '#0A1A33', marginBottom: 12, letterSpacing: '-0.02em' }}>{s.value}</div>
                <div style={{ fontSize: 14, color: '#5A6A85' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {PROBLEM_POINTS.map((p, i) => (
              <div key={i} style={{ background: 'white', border: '1px solid #E7ECF5', borderRadius: 14, padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#EEF3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, marginBottom: 16 }}>{p.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1A33', marginBottom: 6 }}>{p.title}</div>
                <div style={{ fontSize: 13, color: '#5A6A85', lineHeight: 1.6 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '112px 24px', background: '#F8FAFF' }}>
        <div style={{ maxWidth: 1152, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#3D6FD6', letterSpacing: '0.08em', marginBottom: 12 }}>HOW IT WORKS</div>
            <h2 style={{ fontSize: 'clamp(32px, 4.5vw, 48px)', fontWeight: 600, color: '#0A1A33' }}>
              From raw statements to smart <span style={{ background: 'linear-gradient(90deg,#0E3785,#4E83E0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>decisions</span>.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28 }}>
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 16, border: '1px solid #E7ECF5', padding: 32, position: 'relative', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #0E3785, #0A1A33)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, marginBottom: 20 }}>
                  <span style={{ filter: 'grayscale(1) brightness(3)' }}>{step.icon}</span>
                </div>
                <div style={{ position: 'absolute', top: 28, right: 28, fontSize: 12, fontWeight: 700, color: '#C8D4EA' }}>{step.step}</div>
                <h3 style={{ fontSize: 21, fontWeight: 700, color: '#0A1A33', marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: '#5A6A85', lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section style={{ padding: '112px 24px', background: 'white' }}>
        <div style={{ maxWidth: 1152, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 48, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#3D6FD6', letterSpacing: '0.08em', marginBottom: 12 }}>SECURITY</div>
            <h2 style={{ fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 600, color: '#0A1A33', marginBottom: 16, lineHeight: 1.2 }}>
              Bank-level security.<br /><span style={{ background: 'linear-gradient(90deg,#0E3785,#4E83E0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Privacy first.</span>
            </h2>
            <p style={{ fontSize: 15, color: '#5A6A85', lineHeight: 1.7, marginBottom: 24 }}>
              Earnn is built on the same security primitives that protect global financial infrastructure. Your data stays yours — encrypted, isolated, and visible only to you.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {['CBUAE-aligned', 'No data stored', 'No bank linking', 'UAE servers only'].map(t => (
                <span key={t} style={{ fontSize: 12, fontWeight: 600, color: '#5A6A85', border: '1px solid #E7ECF5', borderRadius: 100, padding: '6px 14px' }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {SECURITY_POINTS.map((s, i) => (
              <div key={i} style={{ background: '#F8FAFF', border: '1px solid #E7ECF5', borderRadius: 14, padding: 24 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EEF3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 14 }}>{s.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1A33', marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: '#5A6A85', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SUPPORTED BANKS */}
      <section style={{ padding: '80px 24px', background: '#F8FAFF', borderTop: '1px solid #E7ECF5' }}>
        <div style={{ maxWidth: 1152, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#5A6A85', letterSpacing: '0.1em', marginBottom: 28 }}>SUPPORTED UAE BANKS</div>
        </div>
        <style>{`
          @keyframes bankScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          .bank-ribbon-track:hover { animation-play-state: paused; }
        `}</style>
        <div style={{ overflow: 'hidden', maxWidth: 1152, margin: '0 auto', WebkitMaskImage: 'linear-gradient(90deg, transparent, white 8%, white 92%, transparent)', maskImage: 'linear-gradient(90deg, transparent, white 8%, white 92%, transparent)' }}>
          <div className="bank-ribbon-track" style={{ display: 'flex', gap: 16, width: 'max-content', animation: 'bankScroll 24s linear infinite' }}>
            {[...SUPPORTED_BANKS, ...SUPPORTED_BANKS].map((bank, i) => (
              <span key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 120, height: 56, padding: '0 24px', borderRadius: 12,
                border: '1.5px solid #E7ECF5', fontSize: 15, fontWeight: 700,
                color: '#0A1A33', background: 'white', boxShadow: '0 4px 16px rgba(14,55,133,0.05)',
                whiteSpace: 'nowrap'
              }}>{bank}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ background: 'linear-gradient(135deg, #0A1A33 0%, #0E3785 100%)', padding: '112px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(32px, 4.5vw, 48px)', fontWeight: 600, color: 'white', marginBottom: 16 }}>Find your rewards gap — free, in 60 seconds</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 40 }}>No account. No card details. Just upload your statement and see what you've been missing.</p>
          <Link href="/analyse" style={{ background: 'white', color: '#0A1A33', padding: '17px 44px', borderRadius: 10, fontSize: 17, fontWeight: 700, textDecoration: 'none', display: 'inline-block', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
            Analyse My Spending →
          </Link>
        </div>
      </section>
    </div>
  )
}
