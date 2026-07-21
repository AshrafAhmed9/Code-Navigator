import { useState } from 'react'

export interface ChecklistItem {
  id: string
  label: string
  href?: string
}

/**
 * Reframes the file view's existing data (impact, tests, consumers) into an
 * actionable "before you edit" checklist instead of a pile of numbers —
 * composes data already computed elsewhere in FilePanel, no new data source.
 */
export function SafeChangeChecklist({ items, risk }: { items: ChecklistItem[]; risk: 'LOW' | 'MEDIUM' | 'HIGH' }) {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="cn-section">
      <div className="cn-label">
        Before you edit this file
        <span className={`cn-risk cn-risk-${risk.toLowerCase()}`}>{risk} risk</span>
      </div>
      <div className="cn-card">
        {items.map((item) => (
          <label key={item.id} className="cn-checklist-row">
            <button className={`cn-tour-check ${checked.has(item.id) ? 'cn-tour-step-done' : ''}`} onClick={() => toggle(item.id)} type="button">
              {checked.has(item.id) ? '✓' : ''}
            </button>
            {item.href ? (
              <a href={item.href} className="cn-link cn-checklist-label">
                {item.label}
              </a>
            ) : (
              <span className="cn-checklist-label">{item.label}</span>
            )}
          </label>
        ))}
      </div>
    </div>
  )
}
