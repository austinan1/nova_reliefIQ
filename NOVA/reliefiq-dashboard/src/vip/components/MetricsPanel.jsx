import React from 'react'

const MetricsPanel = ({ metrics, nearbyNGOs, ongoingTasks }) => {
  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500 text-center">Select a region and NGO to view metrics</p>
      </div>
    )
  }

  const getAccessibilityColor = (status) => {
    switch (status) {
      case 'green':
        return 'bg-green-500'
      case 'orange':
        return 'bg-orange-500'
      case 'red':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getAccessibilityLabel = (status) => {
    switch (status) {
      case 'green':
        return 'Clear'
      case 'orange':
        return 'Limited'
      case 'red':
        return 'Blocked'
      default:
        return 'Unknown'
    }
  }

  const getHealthStatusColor = (status) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500'
      case 'limited':
        return 'bg-yellow-500'
      case 'critical':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getHealthStatusLabel = (status) => {
    switch (status) {
      case 'operational':
        return 'Operational'
      case 'limited':
        return 'Limited'
      case 'critical':
        return 'Critical'
      default:
        return 'Unknown'
    }
  }

  const getUrgencyColor = (urgency) => {
    if (urgency >= 70) return 'bg-red-500'
    if (urgency >= 40) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getDamageColor = (damage) => {
    if (damage >= 50) return 'bg-red-500'
    if (damage >= 25) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-4">
      {/* Summary Line */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Local operations bubble (10 mi radius):</span>{' '}
          {nearbyNGOs?.length || 0} NGOs active, {ongoingTasks?.length || 0} ongoing tasks,{' '}
          {metrics.accessibility === 'red' ? '1' : metrics.accessibility === 'orange' ? '0-1' : '0'} blocked route(s) (estimated)
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Damage % */}
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Damage %</h3>
            <span className="text-lg font-bold text-gray-800">
              {metrics.damage_pct?.toFixed(1) || 0}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getDamageColor(metrics.damage_pct || 0)}`}
              style={{ width: `${Math.min(metrics.damage_pct || 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Urgency */}
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Urgency</h3>
            <span className="text-lg font-bold text-gray-800">
              {metrics.urgency?.toFixed(1) || 0}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getUrgencyColor(metrics.urgency || 0)}`}
              style={{ width: `${Math.min(metrics.urgency || 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Population Density */}
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Population Density</h3>
            <span className="text-lg font-bold text-gray-800">
              {metrics.population_density?.toFixed(1) || 0} /km²
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((metrics.population_density || 0) / 10, 100)}%` }}
            />
          </div>
        </div>

        {/* Accessibility */}
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Accessibility</h3>
            <span className={`text-sm font-semibold px-2 py-1 rounded ${getAccessibilityColor(metrics.accessibility)} text-white`}>
              {getAccessibilityLabel(metrics.accessibility)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getAccessibilityColor(metrics.accessibility)}`}
              style={{
                width: metrics.accessibility === 'red' ? '100%' : metrics.accessibility === 'orange' ? '50%' : '25%'
              }}
            />
          </div>
        </div>

        {/* Health Facility Status */}
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500 md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Health Facility Status</h3>
            <span className={`text-sm font-semibold px-2 py-1 rounded ${getHealthStatusColor(metrics.health_status)} text-white`}>
              {getHealthStatusLabel(metrics.health_status)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getHealthStatusColor(metrics.health_status)}`}
              style={{
                width: metrics.health_status === 'critical' ? '100%' : metrics.health_status === 'limited' ? '50%' : '25%'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default MetricsPanel

