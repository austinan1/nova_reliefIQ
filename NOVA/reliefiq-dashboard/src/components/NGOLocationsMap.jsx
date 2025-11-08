import React, { useEffect, useRef, useMemo, useState } from 'react'
import * as d3 from 'd3'
import { normalizeDistrictName } from '../utils/dataLoader'

const NGOLocationsMap = ({ ngoRegionScores, geojson }) => {
  const svgRef = useRef()
  const containerRef = useRef()
  const [currentStep, setCurrentStep] = useState(0)

  // Calculate NGO locations based on current step
  // Step 0 = top 5 districts, Step 1 = next 5 (6th-10th), Step 2 = next 5 (11th-15th), etc.
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

    // Get districts for current step (5 districts per step)
    // Step 0: districts 0-4 (top 5)
    // Step 1: districts 5-9 (next 5)
    // Step 2: districts 10-14 (next 5), etc.
    const ngoStepDistricts = {}
    Object.keys(ngoScores).forEach(ngo => {
      const sorted = ngoScores[ngo].sort((a, b) => b.fitness - a.fitness)
      const startIdx = currentStep * 5
      const endIdx = startIdx + 5
      const stepDistricts = sorted.slice(startIdx, endIdx)
      ngoStepDistricts[ngo] = stepDistricts.map(d => d.district)
    })

    // Count NGOs per district for current step
    const districtCounts = {}
    Object.values(ngoStepDistricts).forEach(districts => {
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
  }, [ngoRegionScores, geojson, currentStep])

  useEffect(() => {
    if (!geojson || !svgRef.current || !containerRef.current || !ngoRegionScores || ngoRegionScores.length === 0) return

    // Clear everything to force a complete reload on every step change
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

    // Recalculate NGO locations for current step directly here
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

    // Get districts for current step (5 districts per step)
    const ngoStepDistricts = {}
    Object.keys(ngoScores).forEach(ngo => {
      const sorted = ngoScores[ngo].sort((a, b) => b.fitness - a.fitness)
      const startIdx = currentStep * 5
      const endIdx = startIdx + 5
      const stepDistricts = sorted.slice(startIdx, endIdx)
      ngoStepDistricts[ngo] = stepDistricts.map(d => d.district)
    })

    // Count NGOs per district for current step
    const districtCounts = {}
    Object.values(ngoStepDistricts).forEach(districts => {
      districts.forEach(district => {
        if (!districtCounts[district]) {
          districtCounts[district] = 0
        }
        districtCounts[district]++
      })
    })

    // Create a map of district names to urgency/need scores (base colors)
    const districtUrgencyMap = new Map()
    ngoRegionScores.forEach(score => {
      const districtName = normalizeDistrictName(score.district)
      if (!districtUrgencyMap.has(districtName)) {
        // Urgency might be 0-1 or 0-100, normalize to 0-100 for consistency
        const urgency = parseFloat(score.urgency || 0)
        const urgencyNormalized = urgency <= 1 ? urgency * 100 : urgency
        districtUrgencyMap.set(districtName, urgencyNormalized)
      }
    })

    // Find max and min urgency for base color scale
    const urgencyValues = Array.from(districtUrgencyMap.values())
    const maxUrgency = urgencyValues.length > 0 ? Math.max(...urgencyValues, 1) : 100
    const minUrgency = urgencyValues.length > 0 ? Math.min(...urgencyValues, 0) : 0

    // Base color scale: light red (low need) to dark red (high need) - all red initially
    const baseColorScale = d3.scaleSequential()
      .domain([minUrgency, maxUrgency])
      .interpolator(d3.interpolateRgb('#fecaca', '#dc2626')) // Light red to dark red

    // Create a map of district names to NGO counts for current step
    const districtCountsMap = new Map()
    Object.keys(districtCounts).forEach(district => {
      districtCountsMap.set(district, districtCounts[district])
    })

    // Find max NGO count for green blending
    const maxCount = Object.keys(districtCounts).length > 0
      ? Math.max(...Object.values(districtCounts), 1) 
      : 1
    
    // Debug: log current step and NGO counts
    console.log(`Step ${currentStep}: Max NGO count: ${maxCount}, Districts with NGOs: ${Object.keys(districtCounts).length}`)

    // Create a color scale that goes from red (base) to green (with NGOs)
    // More NGOs = less red, more green
    const createNGOColorScale = (baseColor, maxNGOs) => {
      return d3.scaleSequential()
        .domain([0, maxNGOs])
        .interpolator(d3.interpolateRgb(baseColor, '#22c55e')) // Interpolate from red to green
    }

    // Helper function to get final color - shifts from red to green based on NGO count
    // At maximum NGOs, should be fully green
    const getColorWithGradient = (baseColor, ngoCount, maxNGOs) => {
      if (ngoCount === 0 || maxNGOs === 0) return baseColor
      
      // Normalize NGO count to 0-1 range
      const normalizedCount = Math.min(ngoCount / maxNGOs, 1)
      
      // Create a scale for this specific base color (red) to green
      const colorScale = createNGOColorScale(baseColor, maxNGOs)
      
      // Use the normalized count directly, but apply a curve for smoother transition
      // At normalizedCount = 1 (max NGOs), we want maxNGOs value to get full green
      const curvedValue = Math.pow(normalizedCount, 0.75) * maxNGOs
      
      // Ensure maximum NGOs gives us the full green color
      const finalValue = normalizedCount >= 1 ? maxNGOs : curvedValue
      
      return colorScale(finalValue)
    }

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

    // Helper function to calculate district color
    const getDistrictColor = (d) => {
      const props = d.properties
      const normalizedName = props.normalized_name || normalizeName(
        props.NAME || props.DISTRICT || props.name || props.district || ''
      )
      
      // Get base color from urgency/need score
      const urgency = districtUrgencyMap.get(normalizedName)
      const baseColor = urgency !== undefined 
        ? baseColorScale(urgency) 
        : '#fecaca' // Default light red for districts without data
      
      // Get NGO count for current step - use fresh data from districtCountsMap
      const ngoCount = districtCountsMap.get(normalizedName) || 0
      
      // Get color with gradient - more NGOs = more green
      return getColorWithGradient(baseColor, ngoCount, maxCount)
    }

    // Draw district boundaries with colors: base (urgency) + green blend (NGO count)
    // Force complete redraw to ensure colors update
    svg.selectAll('path.district')
      .data(geojson.features)
      .enter()
      .append('path')
      .attr('class', 'district')
      .attr('d', path)
      .attr('fill', d => {
        // Calculate color directly here to ensure it's fresh
        const props = d.properties
        const normalizedName = props.normalized_name || normalizeName(
          props.NAME || props.DISTRICT || props.name || props.district || ''
        )
        
        // Get base color from urgency/need score
        const urgency = districtUrgencyMap.get(normalizedName)
        const baseColor = urgency !== undefined 
          ? baseColorScale(urgency) 
          : '#fecaca' // Default light red
        
        // Get NGO count for current step
        const ngoCount = districtCountsMap.get(normalizedName) || 0
        
        // Get color with gradient - more NGOs = more green
        return getColorWithGradient(baseColor, ngoCount, maxCount)
      })
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.8)

    // Get district centroids and create marker locations
    const markerLocations = []
    Object.keys(districtCounts).forEach(districtName => {
      const feature = geojson.features.find(f => {
        const props = f.properties
        const normalizedName = props.normalized_name || normalizeDistrictName(
          props.NAME || props.DISTRICT || props.name || props.district || ''
        )
        return normalizedName === districtName
      })

      if (feature) {
        // Calculate centroid
        let allCoords = []
        const geomType = feature.geometry.type
        
        if (geomType === 'Polygon') {
          allCoords = feature.geometry.coordinates[0] || []
        } else if (geomType === 'MultiPolygon') {
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
            markerLocations.push({
              district: districtName,
              lng: lngSum / count,
              lat: latSum / count,
              ngoCount: districtCounts[districtName]
            })
          }
        }
      }
    })

    // Draw blue dots for NGO locations
    const markerGroups = svg.selectAll('g.marker-group')
      .data(markerLocations)
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
  }, [geojson, ngoRegionScores, currentStep])

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
      
      {/* Step Controls */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10 border border-gray-200">
        <div className="text-sm font-semibold text-gray-700 mb-3">Step: {currentStep}</div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            ← Previous
          </button>
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold"
          >
            Next →
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Step {currentStep}: NGOs at their {currentStep === 0 ? 'top 5' : `${currentStep * 5 + 1}-${(currentStep + 1) * 5}`} best-fit regions
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10 border border-gray-200 max-w-xs">
        <div className="text-sm font-semibold text-gray-700 mb-3">NGO Locations</div>
        
        {/* Color scale legend */}
        <div className="mb-3">
          <div className="text-xs font-semibold text-gray-700 mb-2">Base Color (Need Score)</div>
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-6 h-4 rounded" style={{ background: '#fecaca', border: '1px solid #ccc' }}></div>
            <span className="text-xs text-gray-600 flex-1">Low Need (Light Red)</span>
          </div>
          <div className="flex items-center space-x-2 mb-1">
            <div className="flex-1 h-4 rounded" style={{ 
              background: 'linear-gradient(to right, #fecaca, #dc2626)' 
            }}></div>
          </div>
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-6 h-4 rounded" style={{ background: '#dc2626', border: '1px solid #ccc' }}></div>
            <span className="text-xs text-gray-600 flex-1">High Need (Dark Red)</span>
          </div>
          <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
            More NGOs = Less Red, More Green
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white"></div>
            <span className="text-xs text-gray-600">Blue dots show exact locations</span>
          </div>
          <div className="text-xs text-gray-500">
            Each NGO moves to next best-fit regions with each step
          </div>
        </div>
      </div>
    </div>
  )
}

export default NGOLocationsMap

