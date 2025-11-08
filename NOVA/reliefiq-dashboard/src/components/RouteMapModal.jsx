import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Kathmandu Airport coordinates
const KATHMANDU_AIRPORT = [27.6966, 85.3591]

const RouteMapModal = ({ isOpen, onClose, district, districtCoords, geojson }) => {
  const [route, setRoute] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const mapRef = useRef(null)

  // Reset route when modal closes
  useEffect(() => {
    if (!isOpen) {
      setRoute(null)
      setError(null)
      setLoading(false)
    }
  }, [isOpen])

  // Get district center coordinates from GeoJSON
  useEffect(() => {
    if (!isOpen) return

    const getDistrictCoords = () => {
      if (districtCoords) {
        return districtCoords
      }

      if (!geojson || !district) return null

      // Find the district in GeoJSON
      const feature = geojson.features.find(f => {
        const props = f.properties
        const name = props.NAME || props.DISTRICT || props.name || props.district || ''
        return name.toLowerCase() === district.toLowerCase()
      })

      if (!feature) return null

      // Calculate centroid of the district polygon
      const coordinates = feature.geometry.coordinates[0]
      let latSum = 0
      let lngSum = 0
      let count = 0

      coordinates.forEach(coord => {
        lngSum += coord[0]
        latSum += coord[1]
        count++
      })

      return [latSum / count, lngSum / count]
    }

    const fetchRoute = async (destinationCoords) => {
      if (!destinationCoords) return

      setLoading(true)
      setError(null)

      try {
        // Use OSRM routing API (free and open source)
        const url = `https://router.project-osrm.org/route/v1/driving/${KATHMANDU_AIRPORT[1]},${KATHMANDU_AIRPORT[0]};${destinationCoords[1]},${destinationCoords[0]}?overview=full&geometries=geojson`
        
        const response = await fetch(url)
        const data = await response.json()

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const routeGeometry = data.routes[0].geometry.coordinates
          // Convert from [lng, lat] to [lat, lng] for Leaflet
          const routeCoords = routeGeometry.map(coord => [coord[1], coord[0]])
          setRoute(routeCoords)
        } else {
          // Fallback: create a straight line if routing fails
          setRoute([KATHMANDU_AIRPORT, destinationCoords])
          setError('Routing service unavailable. Showing direct path.')
        }
      } catch (err) {
        console.error('Error fetching route:', err)
        // Fallback: create a straight line
        setRoute([KATHMANDU_AIRPORT, destinationCoords])
        setError('Unable to fetch route. Showing direct path.')
      } finally {
        setLoading(false)
      }
    }

    const coords = getDistrictCoords()
    if (coords) {
      fetchRoute(coords)
    }
  }, [district, districtCoords, geojson, isOpen])

  const getDistrictCenter = () => {
    if (districtCoords) return districtCoords
    if (!geojson || !district) return null

    const feature = geojson.features.find(f => {
      const props = f.properties
      const name = props.NAME || props.DISTRICT || props.name || props.district || ''
      return name.toLowerCase() === district.toLowerCase()
    })

    if (!feature) return null

    const coordinates = feature.geometry.coordinates[0]
    let latSum = 0
    let lngSum = 0
    let count = 0

    coordinates.forEach(coord => {
      lngSum += coord[0]
      latSum += coord[1]
      count++
    })

    return [latSum / count, lngSum / count]
  }

  const destinationCoords = getDistrictCenter()

  if (!isOpen) return null

  // Default center (Kathmandu area) if no destination
  const mapCenter = destinationCoords 
    ? [(KATHMANDU_AIRPORT[0] + destinationCoords[0]) / 2, (KATHMANDU_AIRPORT[1] + destinationCoords[1]) / 2]
    : KATHMANDU_AIRPORT

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-primary-600">
              🗺️ Route from Kathmandu Airport
            </h2>
            <p className="text-gray-600 mt-1">
              {district ? `To ${district} District` : 'Route Map'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-3xl font-bold w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading route...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-4 left-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg z-10 shadow-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {destinationCoords ? (
            <MapContainer
              center={mapCenter}
              zoom={8}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Airport Marker */}
              <Marker position={KATHMANDU_AIRPORT}>
                <Popup>
                  <div className="text-center">
                    <strong>✈️ Tribhuvan International Airport</strong><br />
                    Kathmandu, Nepal
                  </div>
                </Popup>
              </Marker>

              {/* Destination Marker */}
              <Marker position={destinationCoords}>
                <Popup>
                  <div className="text-center">
                    <strong>📍 {district || 'Destination'}</strong><br />
                    District Center
                  </div>
                </Popup>
              </Marker>

              {/* Route Polyline */}
              {route && (
                <Polyline
                  positions={route}
                  color="#ef4444"
                  weight={4}
                  opacity={0.7}
                />
              )}
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <p className="text-gray-600 text-lg">Unable to locate district coordinates</p>
                <p className="text-gray-500 text-sm mt-2">Please ensure the district name matches the GeoJSON data</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                <span>Route Path</span>
              </div>
              <div className="flex items-center">
                <span className="text-2xl mr-2">✈️</span>
                <span>Airport</span>
              </div>
              <div className="flex items-center">
                <span className="text-2xl mr-2">📍</span>
                <span>Destination</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Powered by OpenStreetMap & OSRM
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RouteMapModal

