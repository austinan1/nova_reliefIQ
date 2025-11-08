import React, { useEffect, useState } from 'react'
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

const InlineRouteMap = ({ district, districtCoords, geojson }) => {
  const [route, setRoute] = useState(null)
  const [travelTime, setTravelTime] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Get district center coordinates from GeoJSON
  useEffect(() => {
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
          const routeData = data.routes[0]
          const routeGeometry = routeData.geometry.coordinates
          // Convert from [lng, lat] to [lat, lng] for Leaflet
          const routeCoords = routeGeometry.map(coord => [coord[1], coord[0]])
          setRoute(routeCoords)
          
          // Extract travel time in seconds and convert to minutes
          const durationInSeconds = routeData.duration || 0
          const durationInMinutes = Math.round(durationInSeconds / 60)
          setTravelTime(durationInMinutes)
        } else {
          // Fallback: create a straight line if routing fails
          setRoute([KATHMANDU_AIRPORT, destinationCoords])
          setError('Routing service unavailable')
        }
      } catch (err) {
        console.error('Error fetching route:', err)
        // Fallback: create a straight line
        setRoute([KATHMANDU_AIRPORT, destinationCoords])
        setError('Unable to fetch route')
      } finally {
        setLoading(false)
      }
    }

    const coords = getDistrictCoords()
    if (coords) {
      fetchRoute(coords)
    }
  }, [district, districtCoords, geojson])

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

  // Default center (Kathmandu area) if no destination
  const mapCenter = destinationCoords 
    ? [(KATHMANDU_AIRPORT[0] + destinationCoords[0]) / 2, (KATHMANDU_AIRPORT[1] + destinationCoords[1]) / 2]
    : KATHMANDU_AIRPORT

  return (
    <div className="w-full">
      <h3 className="text-lg font-bold text-gray-800 mb-3">🗺️ Route from Airport</h3>
      
      {/* Map Container */}
      <div className="relative w-full h-64 rounded-lg overflow-hidden border-2 border-gray-200 mb-3">
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Loading route...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute top-2 left-2 bg-yellow-100 border border-yellow-400 text-yellow-800 px-2 py-1 rounded text-xs z-10">
            {error}
          </div>
        )}

        {destinationCoords ? (
          <MapContainer
            center={mapCenter}
            zoom={8}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
            zoomControl={true}
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
                weight={3}
                opacity={0.7}
              />
            )}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <p className="text-gray-600 text-sm">Unable to locate district</p>
            </div>
          </div>
        )}
      </div>

      {/* Travel Time Display */}
      {travelTime !== null && (
        <div className="bg-primary-50 rounded-lg p-3 border-l-4 border-primary-600">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Estimated Travel Time</div>
              <div className="text-2xl font-bold text-primary-600">
                {travelTime} {travelTime === 1 ? 'minute' : 'minutes'}
              </div>
            </div>
            <div className="text-3xl">🚗</div>
          </div>
        </div>
      )}

      {loading && travelTime === null && (
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-sm text-gray-500">Calculating route...</div>
        </div>
      )}
    </div>
  )
}

export default InlineRouteMap

