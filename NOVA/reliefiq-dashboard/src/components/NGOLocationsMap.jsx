import React, { useEffect, useRef, useMemo } from 'react'
import * as d3 from 'd3'
import { normalizeDistrictName } from '../utils/dataLoader'

const NGOLocationsMap = ({ ngoRegionScores, geojson }) => {
  const svgRef = useRef()
  const containerRef = useRef()

  // Calculate NGO locations: for each NGO, get their top 5 districts
  // Then count how many NGOs are in each district
  const ngoLocations = useMemo(() => {
    if (!ngoRegionScores || ngoRegionScores.length === 0 || !geojson) return []

    // Group scores by NGO
    const ngoScores = {}
    ngoRegionScores.forEach(score => {
      const ngo = String(score.NGO).trim()
      if (!ngoScores[ngo]) {
        ngoScores[ngo] = []
      }
      ngoScores[ngo].push({
        district: normalizeDistrictName(score.district),
        fitness: parseFloat(score.fitness_score || 0)
      })
    })

    // Get top 5 districts for each NGO (sorted by fitness)
    const ngoTopDistricts = {}
    Object.keys(ngoScores).forEach(ngo => {
      const top5 = ngoScores[ngo]
        .sort((a, b) => b.fitness - a.fitness)
        .slice(0, 5)
      ngoTopDistricts[ngo] = top5.map(d => d.district)
    })

    // Count NGOs per district
    const districtCounts = {}
    Object.values(ngoTopDistricts).forEach(districts => {
      districts.forEach(district => {
        if (!districtCounts[district]) {
          districtCounts[district] = 0
        }
        districtCounts[district]++
      })
    })

    // Get district centroids from GeoJSON
    const locations = []
    Object.keys(districtCounts).forEach(districtName => {
      const feature = geojson.features.find(f => {
        const props = f.properties
        const normalizedName = props.normalized_name || normalizeDistrictName(
          props.NAME || props.DISTRICT || props.name || props.district || ''
        )
        return normalizedName === districtName
      })

      if (feature) {
        // Calculate centroid - handle both Polygon and MultiPolygon
        let allCoords = []
        const geomType = feature.geometry.type
        
        if (geomType === 'Polygon') {
          allCoords = feature.geometry.coordinates[0] || []
        } else if (geomType === 'MultiPolygon') {
          // Flatten all polygons
          feature.geometry.coordinates.forEach(polygon => {
            if (polygon && polygon[0]) {
              allCoords = allCoords.concat(polygon[0])
            }
          })
        }
        
        if (allCoords && allCoords.length > 0) {
          let lngSum = 0
          let latSum = 0
          let count = 0

          allCoords.forEach(coord => {
            if (Array.isArray(coord) && coord.length >= 2 && typeof coord[0] === 'number') {
              lngSum += coord[0]
              latSum += coord[1]
              count++
            }
          })

          if (count > 0) {
            locations.push({
              district: districtName,
              lng: lngSum / count,
              lat: latSum / count,
              ngoCount: districtCounts[districtName]
            })
          }
        }
      }
    })

    return locations
  }, [ngoRegionScores, geojson])

  useEffect(() => {
    if (!geojson || !svgRef.current || !containerRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight

    svg.attr('width', width).attr('height', height)

    // Create projection for Nepal
    const projection = d3.geoMercator()
      .center([84.1240, 28.3949]) // Nepal center
      .scale(3000)
      .translate([width / 2, height / 2])

    const path = d3.geoPath().projection(projection)

    // Create a map of district names to urgency/need scores
    // Urgency is the same for all NGOs for a given district, so we can get it from any score
    const districtUrgencyMap = new Map()
    if (ngoRegionScores && ngoRegionScores.length > 0) {
      ngoRegionScores.forEach(score => {
        const districtName = normalizeDistrictName(score.district)
        if (!districtUrgencyMap.has(districtName)) {
          // Urgency might be 0-1 or 0-100, normalize to 0-100 for consistency
          const urgency = parseFloat(score.urgency || 0)
          const urgencyNormalized = urgency <= 1 ? urgency * 100 : urgency
          districtUrgencyMap.set(districtName, urgencyNormalized)
        }
      })
    }

    // Find max and min urgency for color scale
    const urgencyValues = Array.from(districtUrgencyMap.values())
    const maxUrgency = urgencyValues.length > 0 ? Math.max(...urgencyValues, 1) : 100
    const minUrgency = urgencyValues.length > 0 ? Math.min(...urgencyValues, 0) : 0

    // Create color scale: light (low need) to red (high need)
    const colorScale = d3.scaleSequential()
      .domain([minUrgency, maxUrgency])
      .interpolator(d3.interpolateRgb('#f0f0f0', '#dc2626')) // Light gray to red

    // Normalize district name helper
    const normalizeName = (name) => {
      if (!name) return ''
      return String(name).trim().toLowerCase()
    }

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 8])
      .on('zoom', (event) => {
        svg.selectAll('path.district')
          .attr('transform', event.transform)
        svg.selectAll('g.marker-group')
          .attr('transform', d => {
            const [x, y] = projection([d.lng, d.lat])
            const transform = event.transform
            return `translate(${transform.applyX(x)},${transform.applyY(y)})`
          })
      })

    svg.call(zoom)

    // Draw district boundaries with colors based on urgency/need score
    svg.selectAll('path.district')
      .data(geojson.features)
      .enter()
      .append('path')
      .attr('class', 'district')
      .attr('d', path)
      .attr('fill', d => {
        const props = d.properties
        const normalizedName = props.normalized_name || normalizeName(
          props.NAME || props.DISTRICT || props.name || props.district || ''
        )
        const urgency = districtUrgencyMap.get(normalizedName)
        if (urgency !== undefined) {
          return colorScale(urgency)
        }
        return '#f0f0f0' // Default light gray for districts without data
      })
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.8)

    // Draw blue dots for NGO locations
    const markerGroups = svg.selectAll('g.marker-group')
      .data(ngoLocations)
      .enter()
      .append('g')
      .attr('class', 'marker-group')
      .attr('transform', d => {
        const [x, y] = projection([d.lng, d.lat])
        return `translate(${x},${y})`
      })

    // Blue circle for each location
    markerGroups.append('circle')
      .attr('r', d => Math.max(8, Math.min(20, 8 + d.ngoCount * 2))) // Size based on count
      .attr('fill', '#2563eb') // Blue
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('opacity', 1)
          .attr('r', d => Math.max(10, Math.min(22, 10 + d.ngoCount * 2)))
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('opacity', 0.8)
          .attr('r', d => Math.max(8, Math.min(20, 8 + d.ngoCount * 2)))
      })

    // Labels showing NGO count
    markerGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => Math.max(8, Math.min(20, 8 + d.ngoCount * 2)) + 15)
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#1e40af')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', '0.5px')
      .attr('paint-order', 'stroke')
      .text(d => {
        const count = d.ngoCount
        return `${count} ${count === 1 ? 'NGO' : 'NGOs'} here`
      })
      .style('pointer-events', 'none')

    // Handle window resize
    const handleResize = () => {
      const newWidth = containerRef.current.clientWidth
      const newHeight = containerRef.current.clientHeight
      
      projection.translate([newWidth / 2, newHeight / 2])
      
      svg.attr('width', newWidth).attr('height', newHeight)
      svg.selectAll('path.district').attr('d', path)
      
      // Update marker positions
      svg.selectAll('g.marker-group').attr('transform', d => {
        const [x, y] = projection([d.lng, d.lat])
        return `translate(${x},${y})`
      })
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [geojson, ngoLocations, ngoRegionScores])

  if (!geojson) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Loading map data...</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-96 bg-gray-50 rounded-lg border border-gray-200 relative">
      <svg ref={svgRef} className="w-full h-full"></svg>
      
      {/* Legend */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10 border border-gray-200 max-w-xs">
        <div className="text-sm font-semibold text-gray-700 mb-3">NGO Locations</div>
        
        {/* Color scale legend */}
        <div className="mb-3">
          <div className="text-xs font-semibold text-gray-700 mb-2">Need Score (District Color)</div>
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-6 h-4 rounded" style={{ background: '#f0f0f0', border: '1px solid #ccc' }}></div>
            <span className="text-xs text-gray-600 flex-1">Low Need</span>
          </div>
          <div className="flex items-center space-x-2 mb-1">
            <div className="flex-1 h-4 rounded" style={{ 
              background: 'linear-gradient(to right, #f0f0f0, #dc2626)' 
            }}></div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-4 rounded" style={{ background: '#dc2626', border: '1px solid #ccc' }}></div>
            <span className="text-xs text-gray-600 flex-1">High Need</span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white"></div>
            <span className="text-xs text-gray-600">Blue dots show exact locations</span>
          </div>
          <div className="text-xs text-gray-500">
            Each NGO is placed at their top 5 best-fit regions
          </div>
        </div>
      </div>
    </div>
  )
}

export default NGOLocationsMap

