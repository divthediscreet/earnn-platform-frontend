import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar"
import FeedbackWidget from "@/components/FeedbackWidget";

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
          padding: '40px 24px 28px',
          fontSize: 14
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src="/earnn_logo.jpeg" alt="earnn" style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover' }} />
                <span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>earnn.money</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>AI-Powered Financial Intelligence</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              Designed for clarity. Built for trust.
            </div>
          </div>
          <div style={{ maxWidth: 1200, margin: '24px auto 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            © 2026 earnn Financial Technologies · UAE Credit Card Rewards Platform · Built for UAE residents 🇦🇪
          </div>
        </footer>
      </body>
    </html>
  );
}
