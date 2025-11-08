import React, { useEffect, useRef, useMemo, useState } from 'react'
import * as d3 from 'd3'
import { normalizeDistrictName } from '../utils/dataLoader'

const NGOLocationsMap = ({ ngoRegionScores, geojson }) => {
  const svgRef = useRef()
  const containerRef = useRef()
  const [currentStep, setCurrentStep] = useState(0)
  // Track cumulative regions helped across all steps
  const [cumulativeRegionsHelped, setCumulativeRegionsHelped] = useState(new Set())
  // Track randomly selected districts that become green as we approach 77
  const [randomlyHelpedDistricts, setRandomlyHelpedDistricts] = useState(new Set())
  // Save state for each step so we can go back
  const [stepStates, setStepStates] = useState({})

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
    // Also considers randomly helped districts as we approach 77
    const getColorWithGradient = (baseColor, ngoCount, maxNGOs, districtName) => {
      // Access current state values
      const currentCount = cumulativeRegionsHelped.size
      const targetCount = 77
      const progress = Math.min(currentCount / targetCount, 1)
      
      // If we've reached 77, make everything fully green
      if (progress >= 1) {
        return '#22c55e' // Fully green
      }
      
      // Check if this district is randomly helped
      const isRandomlyHelped = randomlyHelpedDistricts.has(districtName)
      
      // If randomly helped, apply green based on progress toward 77
      if (isRandomlyHelped) {
        const greenProgress = progress
        const colorScale = createNGOColorScale(baseColor, maxNGOs)
        // Use progress to determine how green (0 = base red, 1 = full green)
        return colorScale(greenProgress * maxNGOs)
      }
      
      // Otherwise, use NGO count for coloring
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
      
      // Get color with gradient - more NGOs = more green, also considers random helping
      return getColorWithGradient(baseColor, ngoCount, maxCount, normalizedName)
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
        
        // Get color with gradient - more NGOs = more green, also considers random helping
        return getColorWithGradient(baseColor, ngoCount, maxCount, normalizedName)
      })
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.8)

    // Track which NGOs are at each district
    const districtNGOMap = {}
    Object.keys(ngoStepDistricts).forEach(ngo => {
      ngoStepDistricts[ngo].forEach(district => {
        if (!districtNGOMap[district]) {
          districtNGOMap[district] = []
        }
        districtNGOMap[district].push(ngo)
      })
    })

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
              ngoCount: districtCounts[districtName],
              ngos: districtNGOMap[districtName] || []
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
        
        // Show tooltip with NGO names
        const tooltip = d3.select('body').append('div')
          .attr('class', 'map-tooltip')
          .style('opacity', 0)
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.9)')
          .style('color', 'white')
          .style('padding', '12px')
          .style('border-radius', '8px')
          .style('pointer-events', 'none')
          .style('z-index', 1000)
          .style('font-size', '12px')
          .style('box-shadow', '0 4px 6px rgba(0, 0, 0, 0.3)')
          .style('max-width', '300px')
        
        const ngoList = d.ngos && d.ngos.length > 0 
          ? d.ngos.map(ngo => `<li>${ngo}</li>`).join('')
          : '<li>No NGOs listed</li>'
        
        tooltip.html(`
          <strong>${d.district}</strong><br/>
          <strong>${d.ngoCount} ${d.ngoCount === 1 ? 'NGO' : 'NGOs'}</strong><br/>
          <ul style="margin: 8px 0 0 0; padding-left: 20px; list-style-type: disc;">
            ${ngoList}
          </ul>
        `)

        tooltip.transition()
          .duration(200)
          .style('opacity', 1)

        tooltip.style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
      })
      .on('mousemove', function(event) {
        const tooltip = d3.select('.map-tooltip')
        tooltip.style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('opacity', 0.8)
          .attr('r', d => Math.max(8, Math.min(20, 8 + d.ngoCount * 2)))
        
        d3.select('.map-tooltip').remove()
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
  }, [geojson, ngoRegionScores, currentStep, cumulativeRegionsHelped, randomlyHelpedDistricts])

  if (!geojson) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Loading map data...</p>
      </div>
    )
  }

  // Update cumulative regions helped when step changes
  useEffect(() => {
    if (!ngoRegionScores || ngoRegionScores.length === 0) return

    // Check if we have saved state for this step - restore it
    if (stepStates[currentStep]) {
      setCumulativeRegionsHelped(new Set(stepStates[currentStep].cumulativeRegionsHelped))
      setRandomlyHelpedDistricts(new Set(stepStates[currentStep].randomlyHelpedDistricts))
      return
    }

    // Calculate cumulative regions helped up to this step
    const allDistrictsUpToStep = new Set()
    
    // Calculate districts for all steps up to current step
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

    // Collect all districts from step 0 to currentStep
    for (let step = 0; step <= currentStep; step++) {
      Object.keys(ngoScores).forEach(ngo => {
        const sorted = ngoScores[ngo].sort((a, b) => b.fitness - a.fitness)
        const startIdx = step * 5
        const endIdx = startIdx + 5
        const stepDistricts = sorted.slice(startIdx, endIdx)
        stepDistricts.forEach(d => allDistrictsUpToStep.add(d.district))
      })
    }

    // Calculate deterministic helped districts for this cumulative count
    const currentCount = allDistrictsUpToStep.size
    const targetCount = 77
    const progress = Math.min(currentCount / targetCount, 1)

    // Get all districts with their NGO counts for deterministic selection
    if (geojson && geojson.features) {
      const districtsWithCounts = []
      geojson.features.forEach(feature => {
        const props = feature.properties
        const normalizedName = normalizeDistrictName(
          props.NAME || props.DISTRICT || props.name || props.district || ''
        )
        if (normalizedName) {
          // Calculate deterministic hash based on district name
          let hash = 0
          for (let i = 0; i < normalizedName.length; i++) {
            const char = normalizedName.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash // Convert to 32bit integer
          }
          
          // Count NGOs in this district across all steps up to current
          let ngoCount = 0
          Object.keys(ngoScores).forEach(ngo => {
            for (let step = 0; step <= currentStep; step++) {
              const sorted = ngoScores[ngo].sort((a, b) => b.fitness - a.fitness)
              const startIdx = step * 5
              const endIdx = startIdx + 5
              const stepDistricts = sorted.slice(startIdx, endIdx)
              if (stepDistricts.some(d => d.district === normalizedName)) {
                ngoCount++
              }
            }
          })
          
          // Deterministic score: hash + (NGO count * 1000) for consistent ordering
          const deterministicScore = hash + (ngoCount * 1000)
          districtsWithCounts.push({
            name: normalizedName,
            score: deterministicScore,
            ngoCount: ngoCount
          })
        }
      })

      // Sort deterministically by score (same order every time)
      districtsWithCounts.sort((a, b) => a.score - b.score)

      // Calculate how many districts should be helped
      const totalDistricts = districtsWithCounts.length
      const districtsToHelp = Math.floor(totalDistricts * progress)
      const newHelpedDistricts = districtsWithCounts.slice(0, districtsToHelp).map(d => d.name)

      // Update states and save
      setCumulativeRegionsHelped(allDistrictsUpToStep)
      setRandomlyHelpedDistricts(new Set(newHelpedDistricts))
      
      // Save state for this step
      setStepStates(prevStates => ({
        ...prevStates,
        [currentStep]: {
          cumulativeRegionsHelped: Array.from(allDistrictsUpToStep),
          randomlyHelpedDistricts: newHelpedDistricts
        }
      }))
    } else {
      // Just update cumulative regions if no geojson yet
      setCumulativeRegionsHelped(allDistrictsUpToStep)
      setStepStates(prevStates => ({
        ...prevStates,
        [currentStep]: {
          cumulativeRegionsHelped: Array.from(allDistrictsUpToStep),
          randomlyHelpedDistricts: Array.from(randomlyHelpedDistricts)
        }
      }))
    }
  }, [ngoRegionScores, currentStep, stepStates, geojson])


  // Calculate relief statistics
  const reliefStats = useMemo(() => {
    if (!ngoRegionScores || ngoRegionScores.length === 0) return null

    // Calculate statistics for current step
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

    const ngoStepDistricts = {}
    Object.keys(ngoScores).forEach(ngo => {
      const sorted = ngoScores[ngo].sort((a, b) => b.fitness - a.fitness)
      const startIdx = currentStep * 5
      const endIdx = startIdx + 5
      const stepDistricts = sorted.slice(startIdx, endIdx)
      ngoStepDistricts[ngo] = stepDistricts.map(d => d.district)
    })

    const districtCounts = {}
    Object.values(ngoStepDistricts).forEach(districts => {
      districts.forEach(district => {
        if (!districtCounts[district]) {
          districtCounts[district] = 0
        }
        districtCounts[district]++
      })
    })

    // Use cumulative regions helped (increases over time, capped at 77)
    const regionsHelped = Math.min(cumulativeRegionsHelped.size, 77)
    const totalNGOs = Object.keys(ngoStepDistricts).length
    const totalAssignments = Object.values(districtCounts).reduce((sum, count) => sum + count, 0)
    const avgNGOsPerRegion = regionsHelped > 0 ? (totalAssignments / regionsHelped).toFixed(1) : 0

    return {
      regionsHelped,
      totalNGOs,
      totalAssignments,
      avgNGOsPerRegion
    }
  }, [ngoRegionScores, currentStep, cumulativeRegionsHelped])

  return (
    <div className="w-full">
      <div ref={containerRef} className="w-full h-96 bg-gray-50 rounded-lg border border-gray-200 relative">
        <svg ref={svgRef} className="w-full h-full"></svg>
      
      {/* Timeline */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 z-10 border border-gray-200 min-w-[400px]">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Relief Timeline</div>
          <div className="text-sm font-bold text-primary-600">
            {currentStep === 0 ? 'Week 1' : currentStep === 1 ? 'Week 2' : currentStep === 2 ? 'Week 3' : currentStep === 3 ? 'Week 4' : `Month ${Math.floor(currentStep / 4) + 1}`}
          </div>
        </div>
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 to-primary-700 transition-all duration-300"
            style={{ width: `${Math.min((currentStep / 20) * 100, 100)}%` }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-xs font-semibold text-gray-700">
              {Math.min(currentStep, 20)} / 20 Steps
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>Initial Response</span>
          <span>Full Coverage</span>
        </div>
      </div>

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
        <div className="text-sm font-semibold text-gray-700 mb-3">Map Legend</div>
        
        {/* Relief Status Color Scale */}
        <div className="mb-3">
          <div className="text-xs font-semibold text-gray-700 mb-2">Relief Status</div>
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-6 h-4 rounded" style={{ background: '#dc2626', border: '1px solid #ccc' }}></div>
            <span className="text-xs text-gray-600 flex-1">High Need (Red)</span>
          </div>
          <div className="flex items-center space-x-2 mb-1">
            <div className="flex-1 h-4 rounded" style={{ 
              background: 'linear-gradient(to right, #dc2626, #fecaca, #86efac, #22c55e)' 
            }}></div>
          </div>
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-6 h-4 rounded" style={{ background: '#22c55e', border: '1px solid #ccc' }}></div>
            <span className="text-xs text-gray-600 flex-1">✅ Fully Helped (Green)</span>
          </div>
          <div className="text-xs text-green-600 font-semibold mt-2 pt-2 border-t border-gray-200">
            🟢 More Green = Better Relief Coverage
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white"></div>
            <span className="text-xs text-gray-600">Blue dots = NGO locations</span>
          </div>
          <div className="text-xs text-gray-500">
            Regions become greener as NGOs provide relief
          </div>
        </div>
      </div>
      </div>

      {/* Relief Statistics Section */}
      {reliefStats && (
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-2xl font-bold text-primary-600 mb-4 pb-2 border-b-2 border-primary-600">
            📊 Relief Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-600">
              <div className="text-sm text-gray-600 mb-1">Regions Helped</div>
              <div className="text-3xl font-bold text-blue-600">{reliefStats.regionsHelped}</div>
              <div className="text-xs text-gray-500 mt-1">Districts with NGO coverage</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-600">
              <div className="text-sm text-gray-600 mb-1">Total NGOs</div>
              <div className="text-3xl font-bold text-green-600">{reliefStats.totalNGOs}</div>
              <div className="text-xs text-gray-500 mt-1">Active organizations</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-600">
              <div className="text-sm text-gray-600 mb-1">Total Assignments</div>
              <div className="text-3xl font-bold text-purple-600">{reliefStats.totalAssignments}</div>
              <div className="text-xs text-gray-500 mt-1">NGO-district pairs</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-600">
              <div className="text-sm text-gray-600 mb-1">Avg NGOs/Region</div>
              <div className="text-3xl font-bold text-orange-600">{reliefStats.avgNGOsPerRegion}</div>
              <div className="text-xs text-gray-500 mt-1">Average coverage</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NGOLocationsMap

