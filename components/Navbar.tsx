'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { EXPLORE_TOOLS } from './home/exploreTools'
import styles from './Navbar.module.css'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const toolsRef = useRef<HTMLDivElement>(null)
  // The "Explore Earnn" menu closes on an outside click or Escape.
  useEffect(() => {
    if (!toolsOpen) return
    const onClick = (event: MouseEvent) => { if (!toolsRef.current?.contains(event.target as Node)) setToolsOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setToolsOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [toolsOpen])
  const navLinkStyle = { padding: '8px 14px', borderRadius: 6, color: 'var(--earnn-text-muted)', fontSize: 15, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' as const }

  return (
    <nav style={{
      background: 'white',
      borderBottom: '1px solid var(--earnn-border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 12px rgba(14,55,133,0.07)'
    }}>
      <div style={{
        maxWidth: 1440,
        margin: '0 auto',
        padding: '0 24px',
        height: 68,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Image src="/earnn_logo.jpeg" alt="earnn" width={38} height={38} style={{ borderRadius: 8 }} />
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--earnn-blue)', letterSpacing: '-0.5px' }}>
            earnn<span style={{ color: 'var(--earnn-text-muted)', fontWeight: 400 }}>.money</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div style={{ alignItems: 'center', gap: 6 }} className={styles.desktopNav}>
          <Link href="/analyse" style={navLinkStyle}>
            Best card for me
          </Link>
          <Link href="/simulate-all-uae-cards" style={navLinkStyle}>
            Simulate All UAE Cards
          </Link>
          <Link href="/compare-all-uae-cards" style={navLinkStyle}>
            Compare All UAE Cards
          </Link>
          {/* Analyze-old (/analyse-old) is hidden from the nav for now; the page still works by URL. To be deleted later. */}
          <Link href="/merchant-lookup" style={navLinkStyle}>
            Check Before You Pay
          </Link>
          {/* Fly for Free (/miles) is hidden from the nav for now; the page itself still works. */}
          <div ref={toolsRef} className={styles.tools}>
            <button type="button" className={styles.toolsButton} style={navLinkStyle} onClick={() => setToolsOpen(v => !v)} aria-haspopup="menu" aria-expanded={toolsOpen}>
              Explore Earnn <i className={`ti ${toolsOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} aria-hidden="true" />
            </button>
            {/* Always mounted (hidden until opened) so the thumbnails are fetched at page load, not on first click. */}
            <div className={styles.toolsMenu} role="menu" hidden={!toolsOpen}>
              <p className={styles.exploreHead}>What Earnn offers</p>
              <div className={styles.exploreGrid}>
                {EXPLORE_TOOLS.map(tool => (
                  <Link key={tool.href} href={tool.href} role="menuitem" className={styles.exploreItem} onClick={() => setToolsOpen(false)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={tool.img.replace(/\/tile-([a-z]+)-\d+\.webp$/, '/nav-$1.webp')} alt="" width={96} height={60} loading="eager" decoding="async" />
                    <span><b>{tool.name}</b><small>{tool.text}</small></span>
                  </Link>
                ))}
              </div>
              <Link href="/chat" role="menuitem" className={styles.exploreFoot} onClick={() => setToolsOpen(false)}>Have a question? <b>Ask Earnie</b> <i className="ti ti-arrow-right" aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
        <button className={styles.mobileMenuButton} onClick={() => setMenuOpen(v => !v)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
          <i className={`ti ${menuOpen ? 'ti-x' : 'ti-menu-2'}`} />
        </button>
      </div>
      {menuOpen && (
        <div className={styles.mobileNavMenu}>
          <Link href="/analyse" onClick={() => setMenuOpen(false)}>Best card for me</Link>
          <Link href="/simulate-all-uae-cards" onClick={() => setMenuOpen(false)}>Simulate All UAE Cards</Link>
          <Link href="/compare-all-uae-cards" onClick={() => setMenuOpen(false)}>Compare All UAE Cards</Link>
          <Link href="/merchant-lookup" onClick={() => setMenuOpen(false)}>Check Before You Pay</Link>
          <span className={styles.mobileGroup}>Explore Earnn</span>
          <Link href="/bulk-spend-miles" onClick={() => setMenuOpen(false)}>Big Spend Planner</Link>
          <Link href="/my-benefits" onClick={() => setMenuOpen(false)}>My Benefits</Link>
          <Link href="/trip-planner" onClick={() => setMenuOpen(false)}>Turn Spending into Flights</Link>
          <Link href="/chat" onClick={() => setMenuOpen(false)}>Ask Earnie</Link>
        </div>
      )}
    </nav>
  )
}
