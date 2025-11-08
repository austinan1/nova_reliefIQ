import React, { useState, useEffect } from 'react'
import { generateChatResponse } from '../utils/aiClient'
import { capitalizeDistrictName } from '../utils/formatUtils'

const DistrictGuidance = ({ regionData, ngo, allData }) => {
  const [actionPlan, setActionPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (regionData && ngo) {
      generateActionPlan()
    } else {
      setActionPlan(null)
    }
  }, [regionData, ngo])

  const generateActionPlan = async () => {
    if (!regionData || !ngo) return

    setLoading(true)
    setError(null)

    try {
      const prompt = `Generate a comprehensive "How to Help" action plan for ${ngo} volunteers in ${regionData.district} district, Nepal.

Current Situation:
- Damage Level: ${regionData.damage_pct?.toFixed(1) || 0}% of houses destroyed
- Urgency Score: ${regionData.urgency?.toFixed(1) || 0}/100
- Accessibility: ${regionData.accessibility || 'unknown'}
- Health Facility Status: ${regionData.health_status || 'unknown'}
- NGO Coverage: ${regionData.ngo_coverage?.toFixed(1) || 0}/100

Provide a structured action plan with:
1. **How to Act**: Immediate actions volunteers should take
2. **Where to Go**: Specific locations or areas to focus on
3. **What to Deliver**: Priority items and resources needed
4. **Coordination**: How to coordinate with other NGOs and local authorities
5. **Safety Guidelines**: Important safety considerations

Format as clear, actionable sections with bullet points.`

      const context = `Region: ${regionData.district}
NGO: ${ngo}
Damage: ${regionData.damage_pct}%
Urgency: ${regionData.urgency}/100`

      const response = await generateChatResponse(prompt, context, regionData, ngo, allData)
      setActionPlan(response)
    } catch (err) {
      console.error('[VIP] Error generating action plan:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!regionData || !ngo) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 h-full">
        <h2 className="text-lg font-bold text-gray-800 mb-4">District-Specific Guidance</h2>
        <p className="text-gray-500 text-center">Select a region and NGO to view guidance</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">How to Help: {capitalizeDistrictName(regionData.district)}</h2>
          <p className="text-sm text-gray-600 mt-1">Volunteer Action Plan for {ngo}</p>
        </div>
        <button
          onClick={generateActionPlan}
          disabled={loading}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Generating...' : 'Refresh'}
        </button>
      </div>

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-gray-600">Severity Score</p>
          <p className="text-lg font-bold text-red-700">
            {((regionData.damage_pct || 0) * 0.6 + (regionData.urgency || 0) * 0.4).toFixed(1)}/100
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-gray-600">NGO Match</p>
          <p className="text-lg font-bold text-blue-700">
            {regionData.ngo_coverage?.toFixed(0) || 0}%
          </p>
        </div>
      </div>

      {/* Urgent Needs */}
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">⚠️ Urgent Needs</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          {regionData.damage_pct > 50 && (
            <li>• Emergency shelter and housing reconstruction</li>
          )}
          {regionData.health_status === 'critical' && (
            <li>• Medical supplies and health facility support</li>
          )}
          {regionData.accessibility === 'red' && (
            <li>• Route clearance and transportation coordination</li>
          )}
          {regionData.urgency > 70 && (
            <li>• Immediate food and water distribution</li>
          )}
        </ul>
      </div>

      {/* Action Plan */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Generating action plan...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {!loading && actionPlan && (
        <div className="flex-1 overflow-y-auto">
          <div className="prose prose-sm max-w-none">
            <div className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-4 border border-gray-200">
              {actionPlan}
            </div>
          </div>
        </div>
      )}

      {!loading && !actionPlan && !error && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-center text-sm">Click "Refresh" to generate action plan</p>
        </div>
      )}
    </div>
  )
}

export default DistrictGuidance

