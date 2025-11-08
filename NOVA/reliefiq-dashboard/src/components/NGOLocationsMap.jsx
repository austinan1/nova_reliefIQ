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

    // Create a map of district names to urgency/need scores (base colors)
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

    // Find max and min urgency for base color scale
    const urgencyValues = Array.from(districtUrgencyMap.values())
    const maxUrgency = urgencyValues.length > 0 ? Math.max(...urgencyValues, 1) : 100
    const minUrgency = urgencyValues.length > 0 ? Math.min(...urgencyValues, 0) : 0

    // Base color scale: green (low need) to red (high need) - initial colors
    const baseColorScale = d3.scaleSequential()
      .domain([minUrgency, maxUrgency])
      .interpolator(d3.interpolateRgb('#22c55e', '#dc2626')) // Green to red

    // Create a map of district names to NGO counts for current step
    const districtCountsMap = new Map()
    ngoLocations.forEach(loc => {
      districtCountsMap.set(loc.district, loc.ngoCount)
    })

    // Find max NGO count for green blending
    const maxCount = ngoLocations.length > 0 
      ? Math.max(...ngoLocations.map(loc => loc.ngoCount), 1) 
      : 1

    // Helper function to blend base color with green based on NGO count
    const blendWithGreen = (baseColor, ngoCount, maxNGOs) => {
      if (ngoCount === 0) return baseColor
      
      // Convert hex to RGB
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null
      }

      const rgbToHex = (r, g, b) => {
        return "#" + [r, g, b].map(x => {
          const hex = Math.round(x).toString(16)
          return hex.length === 1 ? "0" + hex : hex
        }).join("")
      }

      const baseRgb = hexToRgb(baseColor)
      if (!baseRgb) return baseColor

      // Green color to blend with (#22c55e = rgb(34, 197, 94))
      const greenRgb = { r: 34, g: 197, b: 94 }
      
      // Calculate blend factor based on NGO count (0 to 1)
      // Increase blend intensity - more NGOs = stronger green tint
      const blendFactor = Math.min(ngoCount / Math.max(maxNGOs, 1), 1) * 0.8 // Max 80% green blend
      
      // Blend colors
      const blendedR = baseRgb.r + (greenRgb.r - baseRgb.r) * blendFactor
      const blendedG = baseRgb.g + (greenRgb.g - baseRgb.g) * blendFactor
      const blendedB = baseRgb.b + (greenRgb.b - baseRgb.b) * blendFactor
      
      return rgbToHex(blendedR, blendedG, blendedB)
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
        : '#22c55e' // Default green for districts without data (assume low need)
      
      // Get NGO count for current step
      const ngoCount = districtCountsMap.get(normalizedName) || 0
      
      // Blend base color with green based on NGO count
      return blendWithGreen(baseColor, ngoCount, maxCount)
    }

    // Draw district boundaries with colors: base (urgency) + green blend (NGO count)
    const districtPaths = svg.selectAll('path.district')
      .data(geojson.features)
    
    // Update existing paths - this ensures colors update when step changes
    districtPaths
      .attr('fill', getDistrictColor)
    
    // Enter new paths
    districtPaths.enter()
      .append('path')
      .attr('class', 'district')
      .attr('d', path)
      .attr('fill', getDistrictColor)
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
  }, [geojson, ngoLocations, ngoRegionScores, currentStep])

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
            <div className="w-6 h-4 rounded" style={{ background: '#22c55e', border: '1px solid #ccc' }}></div>
            <span className="text-xs text-gray-600 flex-1">Low Need</span>
          </div>
          <div className="flex items-center space-x-2 mb-1">
            <div className="flex-1 h-4 rounded" style={{ 
              background: 'linear-gradient(to right, #22c55e, #dc2626)' 
            }}></div>
          </div>
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-6 h-4 rounded" style={{ background: '#dc2626', border: '1px solid #ccc' }}></div>
            <span className="text-xs text-gray-600 flex-1">High Need</span>
          </div>
          <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
            + More NGOs = More Green added
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

