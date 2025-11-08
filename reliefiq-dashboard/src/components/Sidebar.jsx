import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { generatePlan } from '../utils/aiClient'

const Sidebar = ({ district, districtData, selectedNGO, onClose, isOpen }) => {
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGeneratePlan = async () => {
    if (!district || !selectedNGO || !districtData) return

    setLoading(true)
    setError(null)
    setPlan(null)

    try {
      const generatedPlan = await generatePlan(district, selectedNGO, districtData)
      setPlan(generatedPlan)
    } catch (err) {
      setError(err.message || 'Failed to generate plan')
    } finally {
      setLoading(false)
    }
  }

  if (!district || !districtData) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                📍 {district.charAt(0).toUpperCase() + district.slice(1)}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-600">
                <div className="text-sm text-gray-600">Match Score</div>
                <div className="text-2xl font-bold text-blue-600">
                  {districtData.match?.toFixed(1) || 0}
                </div>
              </div>
              
              <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-600">
                <div className="text-sm text-gray-600">Urgency</div>
                <div className="text-2xl font-bold text-red-600">
                  {districtData.urgency?.toFixed(1) || 0}
                </div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-600">
                <div className="text-sm text-gray-600">Damage %</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {districtData.damage_pct?.toFixed(1) || 0}%
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-600">
                <div className="text-sm text-gray-600">Population Density</div>
                <div className="text-2xl font-bold text-green-600">
                  {districtData.population_density?.toFixed(1) || 0}
                </div>
              </div>
            </div>

            {/* Generate Plan Button */}
            <button
              onClick={handleGeneratePlan}
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            >
              {loading ? 'Generating Plan...' : '🤖 Generate AI Action Plan'}
            </button>

            {/* Plan Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {plan && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-3">AI-Generated Action Plan</h3>
                <div 
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ 
                    __html: plan
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

            {/* Top 3 Aid Categories */}
            <div className="mt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3">🎯 Priority Aid Categories</h3>
              <div className="space-y-2">
                <div className="bg-red-100 rounded-lg p-3 border-l-4 border-red-600">
                  <div className="font-semibold text-red-800">1. Emergency Shelter</div>
                  <div className="text-sm text-red-600">High priority due to damage</div>
                </div>
                <div className="bg-blue-100 rounded-lg p-3 border-l-4 border-blue-600">
                  <div className="font-semibold text-blue-800">2. Water & Sanitation</div>
                  <div className="text-sm text-blue-600">Critical infrastructure needs</div>
                </div>
                <div className="bg-green-100 rounded-lg p-3 border-l-4 border-green-600">
                  <div className="font-semibold text-green-800">3. Food Distribution</div>
                  <div className="text-sm text-green-600">Food security concerns</div>
                </div>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

export default Sidebar

