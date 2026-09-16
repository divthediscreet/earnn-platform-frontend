type Block =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'address'; lines: string[] }

export type LegalSection = { heading: string; blocks: Block[] }

const COLORS = {
  text: '#0D1828',
  body: '#3D4C66',
  muted: '#8090A8',
}

function p(text: string): Block { return { type: 'p', text } }
function ul(items: string[]): Block { return { type: 'ul', items } }
function address(lines: string[]): Block { return { type: 'address', lines } }

export { p, ul, address }

export default function LegalPage({ title, lastUpdated, sections }: { title: string; lastUpdated: string; sections: LegalSection[] }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 20px 100px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: COLORS.text, margin: 0 }}>{title}</h1>
      <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 8, fontWeight: 600 }}>Last updated: {lastUpdated}</div>

      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 30 }}>
        {sections.map((s, i) => (
          <section key={i}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, margin: '0 0 10px' }}>{s.heading}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {s.blocks.map((b, j) => {
                if (b.type === 'p') return <p key={j} style={{ fontSize: 14, color: COLORS.body, lineHeight: 1.65, margin: 0 }}>{b.text}</p>
                if (b.type === 'ul') return (
                  <ul key={j} style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {b.items.map((it, k) => <li key={k} style={{ fontSize: 14, color: COLORS.body, lineHeight: 1.6 }}>{it}</li>)}
                  </ul>
                )
                if (b.type === 'address') return (
                  <div key={j} style={{ fontSize: 14, color: COLORS.body, lineHeight: 1.7 }}>
                    {b.lines.map((l, k) => <div key={k}>{l}</div>)}
                  </div>
                )
                return null
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
