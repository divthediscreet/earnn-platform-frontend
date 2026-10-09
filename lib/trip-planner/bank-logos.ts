// Bank logos for the Trip Planner "Your cards" step. All files live in public/trip-planner/banks/ (see CREDITS.md there).
// A bank without a file here (or whose file fails to load) shows a generic bank icon.
const LOGO_FILE: Record<string, string> = {
  ADCB: 'adcb.png', ADIB: 'adib.png', AJMAN: 'ajman.ico', ALHILAL: 'alhilal.png', CITI: 'citi.png', CBD: 'cbd.png', DIB: 'dib.png',
  EI: 'ei.jpg', ENBD: 'enbd.png', FAB: 'fab.svg', DUBAI_FIRST: 'dubai_first.png', HSBC: 'hsbc.png', LIV: 'liv.svg',
  MASHREQ: 'mashreq.png', RAK: 'rak.png', SIB: 'sib.png', STANC: 'stanc.png',
}

export const bankLogo = (bankCode: string): string | null => LOGO_FILE[bankCode.toUpperCase()] ? `/trip-planner/banks/${LOGO_FILE[bankCode.toUpperCase()]}` : null

/** Airline logos already in the project (also used by the Max Miles result filters). */
export const AIRLINE_LOGO = { emirates: '/airlines/emirates.svg', etihad: '/airlines/etihad.svg' } as const
