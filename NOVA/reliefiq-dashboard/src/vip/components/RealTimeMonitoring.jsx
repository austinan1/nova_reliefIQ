import React, { useState, useEffect } from 'react'
import axios from 'axios'

const RealTimeMonitoring = ({ selectedRegion, regionData }) => {
  const [earthquakeData, setEarthquakeData] = useState(null)
  const [weatherData, setWeatherData] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Fetch real-time data every 10 minutes
    fetchRealTimeData()
    const interval = setInterval(fetchRealTimeData, 10 * 60 * 1000) // 10 minutes

    return () => clearInterval(interval)
  }, [selectedRegion])

  const fetchRealTimeData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch earthquake data from USGS (mock implementation)
      // In production, use: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson
      const mockEarthquakeData = {
        events: [
          {
            id: 'mock1',
            magnitude: 4.2,
            location: 'Near Kathmandu',
            time: new Date().toISOString(),
            affected_districts: selectedRegion ? [selectedRegion] : []
          }
        ]
      }

      // Fetch weather data (mock - in production use OpenWeatherMap API)
      const mockWeatherData = {
        temperature: 18,
        condition: 'Partly Cloudy',
        windSpeed: 12,
        alerts: []
      }

      setEarthquakeData(mockEarthquakeData)
      setWeatherData(mockWeatherData)

      // Generate alerts based on data
      const newAlerts = []
      
      if (mockEarthquakeData.events.length > 0) {
        mockEarthquakeData.events.forEach(event => {
          if (event.affected_districts.includes(selectedRegion)) {
            newAlerts.push({
              type: 'earthquake',
              severity: event.magnitude >= 5 ? 'high' : 'medium',
              message: `Earthquake detected: ${event.magnitude} magnitude near ${event.location}`,
              timestamp: event.time
            })
          }
        })
      }

      setAlerts(newAlerts)
    } catch (err) {
      console.error('[VIP] Error fetching real-time data:', err)
      setError('Failed to fetch real-time monitoring data')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getAlertIcon = (type) => {
    switch (type) {
      case 'earthquake':
        return '🌍'
      case 'weather':
        return '🌦️'
      default:
        return '⚠️'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">Real-Time Monitoring</h2>
        <button
          onClick={fetchRealTimeData}
          disabled={loading}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Active Alerts</h3>
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border-l-4 ${
                  alert.severity === 'high' ? 'bg-red-50 border-red-500' :
                  alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-green-50 border-green-500'
                }`}
              >
                <div className="flex items-start space-x-2">
                  <span className="text-lg">{getAlertIcon(alert.type)}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)}`}></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earthquake Data */}
      {earthquakeData && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Seismic Activity</h3>
          <div className="space-y-2">
            {earthquakeData.events.map((event, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Magnitude {event.magnitude} - {event.location}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.time).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    event.magnitude >= 5 ? 'bg-red-100 text-red-800' :
                    event.magnitude >= 4 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {event.magnitude >= 5 ? 'High' : event.magnitude >= 4 ? 'Medium' : 'Low'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weather Data */}
      {weatherData && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Weather Conditions</h3>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">{weatherData.condition}</p>
                <p className="text-xs text-gray-500">
                  {weatherData.temperature}°C, Wind: {weatherData.windSpeed} km/h
                </p>
              </div>
              <span className="text-2xl">🌦️</span>
            </div>
          </div>
        </div>
      )}

      {!loading && alerts.length === 0 && !earthquakeData && !weatherData && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-center text-sm">
            No active alerts. Monitoring updates every 10 minutes.
          </p>
        </div>
      )}
    </div>
  )
}

export default RealTimeMonitoring

