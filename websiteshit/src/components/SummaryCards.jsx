import React from 'react'
import './SummaryCards.css'

const SummaryCards = ({ data, ngos, selectedNGO }) => {
  if (!data || data.length === 0) return null

  // Calculate metrics
  const totalDistricts = data.length
  const totalNGOs = ngos.length
  const avgDamage = data.reduce((sum, d) => sum + (parseFloat(d.houses_destroyed_pct) || 0), 0) / totalDistricts
  const highestUrgency = data.reduce((max, d) => {
    const urgency = parseFloat(d.urgency) || 0
    return urgency > (parseFloat(max.urgency) || 0) ? d : max
  }, data[0])
  const avgMatch = data.reduce((sum, d) => sum + (parseFloat(d.match) || 0), 0) / totalDistricts

  return (
    <div className="summary-cards">
      <div className="summary-card">
        <div className="card-icon">🏢</div>
        <div className="card-content">
          <div className="card-value">{totalNGOs}</div>
          <div className="card-label">Total NGOs</div>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-icon">🗺️</div>
        <div className="card-content">
          <div className="card-value">{totalDistricts}</div>
          <div className="card-label">Total Districts</div>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-icon">💥</div>
        <div className="card-content">
          <div className="card-value">{avgDamage.toFixed(1)}%</div>
          <div className="card-label">Avg Damage %</div>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-icon">⚠️</div>
        <div className="card-content">
          <div className="card-value">
            {highestUrgency?.district?.charAt(0).toUpperCase() + highestUrgency?.district?.slice(1) || 'N/A'}
          </div>
          <div className="card-label">Highest Urgency</div>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-icon">🎯</div>
        <div className="card-content">
          <div className="card-value">{avgMatch.toFixed(1)}</div>
          <div className="card-label">Avg Match Score</div>
        </div>
      </div>
    </div>
  )
}

export default SummaryCards

