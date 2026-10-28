'use client'

// The card tile's "Salary requirement" block. When the user's salary is known and below the card's minimum, the
// amount turns red with a short note; the card stays visible (the salary filter is the only thing that hides cards).
import { createContext, useContext } from 'react'

/** The user's monthly salary in AED (applied personalisation, else the saved one); 0 when unknown. */
export const UserSalaryContext = createContext(0)

export default function SalaryRequirement({ min }: { min: number | null }) {
  const salary = useContext(UserSalaryContext)
  const above = !!min && salary > 0 && min > salary
  return (
    <div>
      <div style={{ fontSize: 8.5, fontWeight: 800, color: '#7A8BA8', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.3 }}>Salary requirement</div>
      <div title={above ? 'Above the salary you entered. You can still look at this card.' : undefined}
        style={{ marginTop: 3, fontSize: 11, fontWeight: 800, color: above ? '#C0392B' : min ? '#0D1828' : '#00A67E', lineHeight: 1.3 }}>
        {min ? `AED ${Math.round(min).toLocaleString()} / mo` : 'No minimum salary'}
      </div>
      {above && <div style={{ fontSize: 9.5, fontWeight: 700, color: '#C0392B', lineHeight: 1.3 }}>Above your salary</div>}
    </div>
  )
}
