import LegalPage, { p, ul, address, type LegalSection } from '@/components/LegalPage'

const sections: LegalSection[] = [
  {
    heading: '1. Introduction',
    blocks: [
      p('Earnn Technologies Ltd ("Earnn", "we", "us" or "our") respects your privacy and is committed to handling personal data responsibly and transparently.'),
      p('This Privacy Policy explains how information may be collected, used, stored and otherwise processed when you access or use earnn.money and the services, tools and features available through it (collectively, the "Platform").'),
      p('Earnn Technologies Ltd is registered in the Dubai International Financial Centre ("DIFC"), Dubai, United Arab Emirates.'),
    ],
  },
  {
    heading: '2. Who We Are',
    blocks: [
      p('For the purposes of applicable data protection law, Earnn Technologies Ltd is responsible for the personal data processed in connection with the Platform where it acts as a controller.'),
      p('Data protection at Earnn is overseen by Divesh Mishra, Founder. You can reach them at earnn.money@outlook.com.'),
      p('For questions about this Privacy Policy or the processing of your personal data, contact:'),
      address(['Earnn Technologies Ltd', 'Dubai International Financial Centre (DIFC)', 'Dubai, United Arab Emirates', 'Email: earnn.money@outlook.com']),
    ],
  },
  {
    heading: '3. Information You Provide to Earnn',
    blocks: [
      p("Earnn's current Platform is designed to minimise the personal information required to use our tools."),
      p("You do not currently need to create an account to use Earnn's core recommendation tools."),
      p('Depending on the feature you use, you may provide information such as:'),
      ul([
        'estimated income or salary;',
        'estimated monthly spending and spending categories;',
        'credit cards you select or indicate that you hold;',
        'merchants, stores or services you search for;',
        'travel or financial goals you ask Earnn to analyse; and',
        'other preferences or information you voluntarily provide when using our tools.',
      ]),
      p('We use this information to provide the calculations, comparisons, recommendations and other results that you request.'),
      p('Earnn does not currently require you to provide your bank account credentials or full credit card details to use these core recommendation tools.'),
    ],
  },
  {
    heading: '4. Statement Uploads',
    blocks: [
      p('If you choose to upload a credit card statement and give your consent, Earnn processes it using automated and AI tools and trusted service providers to analyse your spending and recommend cards. Statements can contain sensitive information, including details that may reveal health, beliefs or lifestyle through merchant names. We mask your name, card number, phone number and address before processing by our service providers, and we do not keep your personal information or transaction details after processing. We may use masked statements for quality assurance and to improve our models. You can withdraw your consent, or ask a question, at any time at earnn.money@outlook.com. You may also complain to the DIFC Commissioner of Data Protection.'),
    ],
  },
  {
    heading: '5. Information Collected Automatically',
    blocks: [
      p('When you access the Platform, certain technical information may be processed automatically in order to operate, secure and maintain the service.'),
      p('Depending on the technology used to access the Platform, this may include:'),
      ul([
        'IP address;',
        'browser type and version;',
        'device and operating-system information;',
        'date and time of access;',
        'pages or features accessed;',
        'server, security and application logs; and',
        'similar technical information.',
      ]),
    ],
  },
  {
    heading: '6. Information You Provide When Contacting Us',
    blocks: [
      p('If you contact Earnn by email, through a feedback function or through another communication channel, we may process information such as your name, email address, the content of your communication and any information you choose to provide.'),
      p('We use this information to respond to you, investigate issues and improve our services.'),
    ],
  },
  {
    heading: '7. How We Use Information',
    blocks: [
      p('We may process information where necessary to:'),
      ul([
        'provide calculations, comparisons and recommendations requested by you;',
        'operate and maintain the Platform;',
        'personalise results based on information you provide;',
        'maintain the security and integrity of the Platform;',
        'prevent misuse and investigate technical or security issues;',
        'understand and improve the performance and usability of Earnn;',
        'respond to enquiries, feedback and support requests;',
        'maintain appropriate business and operational records; and',
        'comply with applicable legal and regulatory requirements.',
      ]),
      p('Where required under applicable law, we process personal data on an appropriate lawful basis, which may include your consent, performance of a contract, compliance with legal obligations, or our legitimate interests in operating, securing and improving the Platform, where those interests are not overridden by your rights.'),
    ],
  },
  {
    heading: '8. Cookies and Similar Technologies',
    blocks: [
      p('Earnn may use cookies and similar technologies that are necessary for the operation, security and performance of the Platform.'),
      p('Where we use analytics or other non-essential technologies that require consent under applicable law, we will provide appropriate information and choices.'),
      p('If you choose "Keep for this visit", Earnn holds the details you type into its planning tools (such as salary, monthly spending and planned payments) in your session storage in your browser so you do not have to enter them again while you use the site, including in another open tab. This information stays on your device, is never sent to Earnn, and is deleted automatically when you close the site. You can also clear it at any time using the "Clear now" link on those pages. Earnn does not store this information unless you choose to keep it.'),
      p('You can also control certain cookies through your browser settings. Disabling certain technologies may affect the operation of parts of the Platform.'),
    ],
  },
  {
    heading: '9. Service Providers',
    blocks: [
      p('We may use third-party service providers to help us host, operate, secure, maintain and improve the Platform.'),
      p('These may include hosting and cloud infrastructure providers, technology providers, analytics providers, professional advisers and other suppliers that support our operations.'),
      p('Where these providers process personal data on our behalf, we seek to apply appropriate contractual, technical and organisational safeguards.'),
    ],
  },
  {
    heading: '10. Third-Party Websites and Services',
    blocks: [
      p('The Platform may contain links to websites, products or services operated by banks, financial institutions, merchants, airlines or other third parties.'),
      p('These third parties operate independently from Earnn and may collect or process information under their own privacy policies.'),
      p('We encourage you to review the privacy information of a third party before providing personal data to them.'),
    ],
  },
  {
    heading: '11. International Transfers',
    blocks: [
      p('Some of our service providers may process information outside the DIFC.'),
      p('Where personal data is transferred outside the DIFC, we will take appropriate steps to ensure that the transfer is made in accordance with applicable DIFC data protection requirements.'),
    ],
  },
  {
    heading: '12. Data Retention',
    blocks: [
      p('We retain personal data only for as long as reasonably necessary for the purposes for which it was processed, including to meet applicable legal, regulatory, security and operational requirements.'),
      p('Retention periods may vary depending on the nature of the information and the purpose for which it is processed.'),
    ],
  },
  {
    heading: '13. Data Security',
    blocks: [
      p('We use reasonable technical and organisational measures designed to protect personal data against unauthorised access, alteration, disclosure, loss or misuse.'),
      p('However, no internet-based service or method of electronic storage can be guaranteed to be completely secure.'),
    ],
  },
  {
    heading: '14. Your Data Protection Rights',
    blocks: [
      p('Subject to applicable law and the circumstances of the processing, you may have rights relating to your personal data, including rights to:'),
      ul([
        'request access to personal data concerning you;',
        'request correction of inaccurate personal data;',
        'request deletion of personal data in certain circumstances;',
        'request restriction of certain processing;',
        'object to certain processing;',
        'request portability of personal data where applicable; and',
        'withdraw consent where processing is based on consent.',
      ]),
      p('To exercise your rights or ask a privacy-related question, contact us at: earnn.money@outlook.com'),
      p('You may also have the right to lodge a complaint with the DIFC Commissioner of Data Protection. DIFC law expressly provides for this right in the information given to data subjects.'),
    ],
  },
  {
    heading: "15. Children's Privacy",
    blocks: [
      p('The Platform is not intended for individuals under the age of 18.'),
      p('We do not knowingly seek to collect personal data from children through the Platform.'),
    ],
  },
  {
    heading: '16. Changes to This Privacy Policy',
    blocks: [
      p('We may update this Privacy Policy from time to time to reflect changes to Earnn, our technology, our data-processing practices or applicable legal and regulatory requirements.'),
      p('The latest version will be published on this page together with the date of the most recent update.'),
    ],
  },
  {
    heading: '17. Contact Us',
    blocks: [
      p("For questions about this Privacy Policy or how Earnn handles personal data:"),
      address(['Earnn Technologies Ltd', 'Dubai International Financial Centre (DIFC)', 'Dubai, United Arab Emirates', 'earnn.money@outlook.com']),
    ],
  },
]

export default function PrivacyPolicyPage() {
  return <LegalPage title="Privacy Policy" lastUpdated="October 2026" sections={sections} />
}
