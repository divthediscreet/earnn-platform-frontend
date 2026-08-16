'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import styles from './Navbar.module.css'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navLinkStyle = { padding: '8px 14px', borderRadius: 6, color: 'var(--earnn-text-muted)', fontSize: 15, fontWeight: 500, textDecoration: 'none' }

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
        maxWidth: 1200,
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
            Analyse
          </Link>
          <Link href="/compare" style={navLinkStyle}>
            Compare
          </Link>
          <Link href="/how-it-works" style={navLinkStyle}>
            How Earnn Works
          </Link>
          <Link href="/chat" style={navLinkStyle}>
            Ask Earnie
          </Link>
          <Link href="/analyse" className="btn-primary" style={{ padding: '10px 24px', fontSize: 14, marginLeft: 8 }}>
            Get Started Free
          </Link>
        </div>
        <button className={styles.mobileMenuButton} onClick={() => setMenuOpen(v => !v)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
          <i className={`ti ${menuOpen ? 'ti-x' : 'ti-menu-2'}`} />
        </button>
      </div>
      {menuOpen && (
        <div className={styles.mobileNavMenu}>
          <Link href="/analyse" onClick={() => setMenuOpen(false)}>Analyse</Link>
          <Link href="/compare" onClick={() => setMenuOpen(false)}>Compare</Link>
          <Link href="/how-it-works" onClick={() => setMenuOpen(false)}>How Earnn Works</Link>
          <Link href="/chat" onClick={() => setMenuOpen(false)}>Ask Earnie</Link>
          <Link href="/analyse" onClick={() => setMenuOpen(false)} className={styles.mobileNavCta}>Get Started Free</Link>
        </div>
      )}
    </nav>
  )
}
