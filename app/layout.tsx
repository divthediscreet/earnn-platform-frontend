import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Navbar from "@/components/Navbar"
import FeedbackWidget from "@/components/FeedbackWidget";
import FooterFeedbackLink from "@/components/FooterFeedbackLink";

export const metadata: Metadata = {
  title: "earnn.money — UAE Credit Card Rewards Optimizer",
  description: "Upload your credit card statement. Discover how much rewards you are missing. Find the best UAE credit card for your spending.",
  keywords: "UAE credit card, rewards, cashback, miles, Dubai, ENBD, FAB, ADCB",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      </head>
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ flex: 1 }}>
          {children}
        </main>
        <FeedbackWidget />
        <footer style={{
          background: '#0A1A33',
          color: 'rgba(255,255,255,0.65)',
          padding: '48px 24px 28px',
          fontSize: 14
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 40 }}>
            <div style={{ flex: '1 1 260px', minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src="/earnn_logo.jpeg" alt="earnn" style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover' }} />
                <span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>earnn.money</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>AI-Powered Financial Intelligence</div>
              <div style={{ marginTop: 4, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Registered in the Dubai International Financial Centre (DIFC)</div>
            </div>

            <div style={{ minWidth: 140 }}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 13, letterSpacing: '0.03em', marginBottom: 12 }}>Company</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5, color: 'rgba(255,255,255,0.6)' }}>
                <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>About</Link>
                <FooterFeedbackLink style={{ color: 'rgba(255,255,255,0.6)' }} />
              </div>
            </div>

            <div style={{ minWidth: 180 }}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 13, letterSpacing: '0.03em', marginBottom: 12 }}>Support</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5, color: 'rgba(255,255,255,0.6)' }}>
                <Link href="/contact-us" style={{ color: 'inherit', textDecoration: 'none' }}>Contact Us</Link>
                <Link href="/privacy-policy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</Link>
                <Link href="/terms-and-conditions" style={{ color: 'inherit', textDecoration: 'none' }}>Terms &amp; Conditions</Link>
              </div>
            </div>
          </div>
          <div style={{ maxWidth: 1200, margin: '32px auto 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            © 2026 earnn Financial Technologies · Dubai, UAE &nbsp;·&nbsp; Designed for clarity. Built for trust.
          </div>
        </footer>
      </body>
    </html>
  );
}
