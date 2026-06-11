'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="desktop-nav">
          <Link href="/analyse" style={{ padding: '8px 16px', borderRadius: 6, color: 'var(--earnn-text-muted)', fontSize: 15, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}>
            Analyse
          </Link>
          <Link href="/compare" style={{ padding: '8px 16px', borderRadius: 6, color: 'var(--earnn-text-muted)', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
            Compare Cards
          </Link>
          <Link href="/chat" style={{ padding: '8px 16px', borderRadius: 6, color: 'var(--earnn-text-muted)', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
            Ask earnn
          </Link>
          <Link href="/analyse" className="btn-primary" style={{ padding: '10px 24px', fontSize: 14, marginLeft: 8 }}>
            Get Started Free
          </Link>
        </div>
      </div>
    </nav>
  )
}
