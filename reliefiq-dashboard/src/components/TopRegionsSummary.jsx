import React from 'react'

const TopRegionsSummary = ({ data, selectedNGO, onDistrictClick }) => {
  if (!data || data.length === 0) return null

  // Get top 5 best matches sorted by match score
  const top5Regions = [...data]
    .sort((a, b) => {
      const matchA = a.match <= 1 ? a.match * 100 : a.match
      const matchB = b.match <= 1 ? b.match * 100 : b.match
      return matchB - matchA
    })
    .slice(0, 5)

  const handleDistrictClick = (district) => {
    if (onDistrictClick) {
      onDistrictClick(district)
    }
  }

  return (
    <div className="h-full bg-white rounded-lg shadow-lg p-6 overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        🎯 Top 5 Best Fit Regions
      </h2>
      
      {selectedNGO && (
        <p className="text-sm text-gray-600 mb-6">
          Best matches for <span className="font-semibold text-primary-600">{selectedNGO}</span>
        </p>
      )}

      <div className="space-y-4">
        {top5Regions.map((region, index) => {
          const matchValue = region.match <= 1 ? region.match * 100 : region.match
          const urgencyValue = region.urgency <= 1 ? region.urgency * 100 : region.urgency
          const fitnessValue = region.fitness_score <= 1 ? region.fitness_score * 100 : region.fitness_score
          
          return (
            <div
              key={index}
              onClick={() => handleDistrictClick(region)}
              className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-300 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold text-sm">
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {region.district.charAt(0).toUpperCase() + region.district.slice(1)}
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-yellow-500"></div>
                  <span className="text-xs text-gray-600 font-semibold">Top Match</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="text-xs text-gray-600 mb-1">Match Score</div>
                  <div className="text-xl font-bold text-blue-600">
                    {matchValue.toFixed(1)}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-red-200">
                  <div className="text-xs text-gray-600 mb-1">Urgency</div>
                  <div className="text-xl font-bold text-red-600">
                    {urgencyValue.toFixed(1)}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="text-xs text-gray-600 mb-1">Fitness</div>
                  <div className="text-xl font-bold text-green-600">
                    {fitnessValue.toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-white rounded-lg p-2 border border-gray-200">
                  <div className="text-xs text-gray-600">Damage %</div>
                  <div className="text-sm font-semibold text-gray-800">
                    {region.damage_pct?.toFixed(1) || 0}%
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-2 border border-gray-200">
                  <div className="text-xs text-gray-600">Population Density</div>
                  <div className="text-sm font-semibold text-gray-800">
                    {region.population_density?.toFixed(1) || 0}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600 text-center">
          💡 Click on any region to view detailed information and generate an AI action plan
        </p>
      </div>
    </div>
  )
}

export default TopRegionsSummary

