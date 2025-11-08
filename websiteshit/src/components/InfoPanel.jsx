import React, { useState, useEffect } from 'react'
import { generateActionPlan } from '../utils/aiService'
import './InfoPanel.css'

const InfoPanel = ({ district, selectedNGO, ngoCapabilities, onClose }) => {
  const [actionPlan, setActionPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchActionPlan = async () => {
      setLoading(true)
      setError(null)
      
      const result = await generateActionPlan(district, selectedNGO, ngoCapabilities)
      
      if (result.error) {
        setError(result.error)
      } else {
        setActionPlan(result.content)
      }
      
      setLoading(false)
    }

    if (district && selectedNGO) {
      fetchActionPlan()
    }
  }, [district, selectedNGO, ngoCapabilities])

  if (!district) return null

  const districtName = district.district?.charAt(0).toUpperCase() + district.district?.slice(1) || 'Unknown'

  return (
    <div className="info-panel">
      <div className="info-panel-header">
        <h2>📍 {districtName}</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="info-panel-content">
        <div className="district-metrics">
          <h3>Key Metrics</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Match Score</div>
              <div className="metric-value">{(parseFloat(district.match) || 0).toFixed(1)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Urgency</div>
              <div className="metric-value">{(parseFloat(district.urgency) || 0).toFixed(1)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Fitness Score</div>
              <div className="metric-value">{(parseFloat(district.fitness_score) || 0).toFixed(1)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Damage %</div>
              <div className="metric-value">{(parseFloat(district.houses_destroyed_pct) || 0).toFixed(1)}%</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Population Density</div>
              <div className="metric-value">{(parseFloat(district.pop_density) || 0).toFixed(1)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Health Facilities Damaged</div>
              <div className="metric-value">{(parseFloat(district.health_facilities_damaged_pct) || 0).toFixed(1)}%</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Water Facilities Damaged</div>
              <div className="metric-value">{(parseFloat(district.water_facilities_damaged_pct) || 0).toFixed(1)}%</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Food Insecure Households</div>
              <div className="metric-value">{(parseFloat(district.food_insecure_households_pct) || 0).toFixed(1)}%</div>
            </div>
          </div>
        </div>

        <div className="action-plan-section">
          <h3>🤖 AI-Generated Action Plan</h3>
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Generating action plan...</p>
            </div>
          )}
          {error && (
            <div className="error-state">
              <p>{error}</p>
            </div>
          )}
          {actionPlan && !loading && (
            <div className="action-plan-content">
              <div 
                className="markdown-content"
                dangerouslySetInnerHTML={{ 
                  __html: actionPlan
                    .replace(/\n/g, '<br>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InfoPanel

