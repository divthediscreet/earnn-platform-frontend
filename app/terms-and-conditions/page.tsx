import LegalPage, { p, ul, address, type LegalSection } from '@/components/LegalPage'

const sections: LegalSection[] = [
  {
    heading: '1. Introduction',
    blocks: [
      p('These Terms & Conditions ("Terms") govern your access to and use of earnn.money and the services, tools and features provided through it (collectively, the "Platform").'),
      p('The Platform is operated by:'),
      address(['Earnn Technologies Ltd', 'Registered in the Dubai International Financial Centre ("DIFC")', 'Dubai, United Arab Emirates']),
      p('By accessing or using the Platform, you agree to these Terms.'),
      p('If you do not agree to these Terms, you should not use the Platform.'),
    ],
  },
  {
    heading: '2. About Earnn',
    blocks: [
      p('Earnn is a technology platform designed to help users understand and compare financial products, optimise financial choices and work towards financial and lifestyle goals.'),
      p('The Platform may provide tools and information including:'),
      ul([
        'credit card comparisons;',
        'credit card recommendations;',
        'merchant-specific card comparisons;',
        'rewards, cashback and miles calculations;',
        'goal-based calculations and planning;',
        'product information and comparisons; and',
        'AI-assisted financial information and decision-support tools.',
      ]),
      p('Features available through Earnn may change as the Platform develops.'),
    ],
  },
  {
    heading: '3. Eligibility',
    blocks: [
      p('You must be at least 18 years old and legally capable of entering into these Terms to use the Platform.'),
      p('The availability of individual financial products shown on Earnn may depend on factors including residency, income, age, creditworthiness and criteria determined by the relevant financial institution.'),
    ],
  },
  {
    heading: '4. Information and Recommendations',
    blocks: [
      p('Earnn uses product information, calculations, rules, assumptions, algorithms, automated systems and information provided by users to generate comparisons, rankings, estimates and recommendations.'),
      p('The results displayed to you may therefore depend on:'),
      ul([
        'the information you provide;',
        'information available to Earnn about financial products;',
        'assumptions used in our calculations;',
        'merchant and transaction classifications;',
        'reward programme rules; and',
        'the methodology used by individual Earnn tools.',
      ]),
      p('A product being ranked, highlighted or described as the "best", "recommended", "smartest" or similar means that it performs favourably according to the methodology, information and assumptions used by the relevant Earnn feature. It does not mean that the product is necessarily the best or most suitable financial product for every individual.'),
    ],
  },
  {
    heading: '5. Financial Product Information',
    blocks: [
      p('Earnn may display information including:'),
      ul([
        'fees and annual fees;',
        'interest rates or other charges where applicable;',
        'reward rates;',
        'cashback;',
        'points and airline miles;',
        'welcome bonuses;',
        'minimum-spend requirements;',
        'reward caps and exclusions;',
        'eligibility requirements;',
        'airport lounge and travel benefits;',
        'merchant offers; and',
        'other financial-product features.',
      ]),
      p('Banks, card issuers, loyalty programmes and other providers may change these terms at any time.'),
      p('Although Earnn aims to provide accurate and useful information, we cannot guarantee that all product information will always be complete, accurate or current.'),
      p('You should verify material product terms directly with the relevant financial institution before applying for a product or making a financial decision.'),
    ],
  },
  {
    heading: '6. Estimates and Calculations',
    blocks: [
      p('Rewards, cashback, points, miles, savings, annual value, time-to-goal calculations and other values displayed by Earnn may be estimates.'),
      p('Actual outcomes may differ for reasons including:'),
      ul([
        'your actual spending;',
        'merchant classification by the card issuer or payment network;',
        'excluded transactions;',
        'reward caps;',
        'minimum-spend requirements;',
        'changes to reward programmes;',
        'changes to airline or loyalty-programme redemption requirements;',
        'card fees and charges;',
        'eligibility criteria; and',
        'information or assumptions used in the calculation.',
      ]),
      p('Calculations should therefore be treated as decision-support information rather than guaranteed outcomes.'),
    ],
  },
  {
    heading: '7. AI and Automated Outputs',
    blocks: [
      p('Certain Earnn features may use artificial intelligence, automated models, algorithms or other computational systems.'),
      p('These systems can make mistakes. Outputs may contain inaccuracies, omissions or outdated information.'),
      p('AI-generated or automated information should therefore not be relied upon as the sole basis for an important financial decision.'),
    ],
  },
  {
    heading: '8. No Financial Advice',
    blocks: [
      p('Earnn provides information, comparisons, calculations and technology-based decision-support tools.'),
      p('Earnn does not provide regulated financial, investment, legal or tax advice.'),
      p('Information and recommendations presented through the Platform do not constitute a personalised financial advisory service, suitability assessment or guarantee that a particular financial product is appropriate for your circumstances.'),
      p('You remain responsible for your financial decisions and should obtain independent professional advice where appropriate.'),
    ],
  },
  {
    heading: '9. Credit Applications and Eligibility',
    blocks: [
      p('Earnn is not a bank, credit card issuer or lender.'),
      p('Unless expressly stated otherwise, Earnn does not:'),
      ul([
        'issue credit cards;',
        'provide loans;',
        'determine your creditworthiness;',
        'approve or reject financial-product applications; or',
        'determine credit limits.',
      ]),
      p('A product appearing in an Earnn recommendation or comparison does not guarantee that you will qualify for or be approved for that product.'),
      p('Eligibility, approval, pricing, credit limits and final product terms are determined by the relevant financial institution.'),
    ],
  },
  {
    heading: '10. Third-Party Products and Services',
    blocks: [
      p('Earnn may display information about or provide links to products and services offered by banks, financial institutions, airlines, merchants and other third parties.'),
      p("These products and services are provided by the relevant third party and are subject to that provider's terms, eligibility requirements and policies."),
      p('Earnn does not control changes made by third parties to their products, reward programmes, pricing, eligibility criteria or services.'),
    ],
  },
  {
    heading: '11. Commercial Relationships',
    blocks: [
      p('Earnn may enter into commercial relationships with financial institutions, merchants and other partners.'),
      p('Earnn may receive a fee, commission or other compensation when a user clicks on, applies for or obtains certain products or services through Earnn.'),
      p('Where relevant, we aim to clearly identify sponsored or commercial content.'),
      p('Unless clearly stated otherwise, commercial compensation does not guarantee that a particular product will receive a higher ranking or recommendation.'),
    ],
  },
  {
    heading: '12. Acceptable Use',
    blocks: [
      p('You agree not to:'),
      ul([
        'use the Platform for unlawful or fraudulent purposes;',
        'attempt to gain unauthorised access to the Platform or its systems;',
        'interfere with the operation or security of the Platform;',
        'introduce malicious software or harmful code;',
        "systematically scrape, extract, copy or download Earnn's proprietary data or databases without permission;",
        'use automated systems to access the Platform in a manner that places unreasonable demand on our infrastructure;',
        'reverse engineer protected elements of the Platform except where expressly permitted by applicable law; or',
        "use Earnn's content or data in a manner that infringes our rights or the rights of another person.",
      ]),
    ],
  },
  {
    heading: '13. Intellectual Property',
    blocks: [
      p('The Platform and its original content, software, databases, methodologies, calculations, design, branding, logos and other materials are owned by or licensed to Earnn Technologies Ltd and may be protected by applicable intellectual-property laws.'),
      p("Your use of the Platform does not transfer ownership of Earnn's intellectual property to you."),
      p('You may use the Platform for your personal, non-commercial use subject to these Terms.'),
    ],
  },
  {
    heading: '14. Platform Availability',
    blocks: [
      p('We aim to keep Earnn available and operating reliably, but we do not guarantee that the Platform or any individual feature will always be available, uninterrupted, secure or error-free.'),
      p('We may modify, suspend or discontinue features as the Platform evolves.'),
    ],
  },
  {
    heading: '15. Limitation of Liability',
    blocks: [
      p('To the maximum extent permitted by applicable law, Earnn Technologies Ltd will not be liable for indirect, incidental, special or consequential losses arising from your use of, or reliance upon, information, calculations, recommendations or other outputs provided through the Platform.'),
      p('Nothing in these Terms excludes or limits liability that cannot lawfully be excluded or limited.'),
    ],
  },
  {
    heading: '16. Privacy',
    blocks: [
      p('Your use of the Platform is also subject to our Privacy Policy, which explains how Earnn handles personal data.'),
    ],
  },
  {
    heading: '17. Changes to These Terms',
    blocks: [
      p('We may update these Terms from time to time to reflect changes to the Platform, our services, our business practices or applicable legal and regulatory requirements.'),
      p('The latest version will be published on this page together with its effective date.'),
    ],
  },
  {
    heading: '18. Governing Law and Jurisdiction',
    blocks: [
      p('The governing law and jurisdiction applicable to these Terms are being finalised and will be confirmed here.'),
    ],
  },
  {
    heading: '19. Contact Us',
    blocks: [
      p('If you have questions about these Terms, please contact:'),
      address(['Earnn Technologies Ltd', 'Dubai International Financial Centre (DIFC)', 'Dubai, United Arab Emirates', 'earnn.money@outlook.com']),
    ],
  },
]

export default function TermsAndConditionsPage() {
  return <LegalPage title="Terms & Conditions" lastUpdated="September 2026" sections={sections} />
}
