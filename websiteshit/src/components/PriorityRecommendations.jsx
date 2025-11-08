import React from 'react'
import './PriorityRecommendations.css'

const PriorityRecommendations = ({ data, selectedNGO }) => {
  if (!data || data.length === 0) return null

  // Get top 5 priority districts
  const topDistricts = [...data]
    .sort((a, b) => (parseFloat(b.fitness_score) || 0) - (parseFloat(a.fitness_score) || 0))
    .slice(0, 5)

  return (
    <div className="priority-recommendations">
      <h3>🎯 Top 5 Priority Districts</h3>
      <div className="recommendations-list">
        {topDistricts.map((district, index) => (
          <div key={index} className="recommendation-item">
            <div className="recommendation-rank">#{index + 1}</div>
            <div className="recommendation-content">
              <div className="recommendation-name">
                {district.district?.charAt(0).toUpperCase() + district.district?.slice(1) || 'Unknown'}
              </div>
              <div className="recommendation-scores">
                <span className="score-badge match">
                  Match: {(parseFloat(district.match) || 0).toFixed(1)}
                </span>
                <span className="score-badge urgency">
                  Urgency: {(parseFloat(district.urgency) || 0).toFixed(1)}
                </span>
                <span className="score-badge fitness">
                  Fitness: {(parseFloat(district.fitness_score) || 0).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PriorityRecommendations

