const COLORS = {
  text: '#0D1828',
  body: '#3D4C66',
  muted: '#8090A8',
  primary: '#0E3785',
}

function ContactBlock({ heading, question, email }: { heading: string; question: string; email: string }) {
  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, margin: '0 0 6px' }}>{heading}</h2>
      <p style={{ fontSize: 14, color: COLORS.body, lineHeight: 1.6, margin: '0 0 6px' }}>{question}</p>
      <a href={`mailto:${email}`} style={{ fontSize: 14, color: COLORS.primary, fontWeight: 600, textDecoration: 'none' }}>{email}</a>
    </div>
  )
}

export default function ContactUsPage() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 20px 100px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: COLORS.text, margin: 0 }}>Contact Us</h1>
      <p style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginTop: 18 }}>We'd love to hear from you.</p>
      <p style={{ fontSize: 14.5, color: COLORS.body, marginTop: 8, lineHeight: 1.65 }}>
        Whether you have a question about Earnn, spotted something that doesn't look right, have feedback on our
        recommendations, or want to explore a partnership, we'd be happy to hear from you.
      </p>

      <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 26 }}>
        <ContactBlock
          heading="General Enquiries"
          question="For general questions, business enquiries or partnerships:"
          email="earnn.money@outlook.com"
        />
        <ContactBlock
          heading="Help & Feedback"
          question="Found incorrect card information, need help using Earnn, or have an idea that could make Earnn better?"
          email="earnn.money@outlook.com"
        />
        <ContactBlock
          heading="Privacy Enquiries"
          question="For questions about your personal data, this Privacy Policy, or to exercise your data protection rights:"
          email="earnn.money@outlook.com"
        />
      </div>

      <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #E5ECF8' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, margin: '0 0 8px' }}>Company Information</h2>
        <div style={{ fontSize: 14, color: COLORS.body, lineHeight: 1.7 }}>
          <div>Earnn Technologies Ltd</div>
          <div>Registered in the Dubai International Financial Centre (DIFC)</div>
          <div>Dubai, United Arab Emirates</div>
        </div>
      </div>
    </div>
  )
}
