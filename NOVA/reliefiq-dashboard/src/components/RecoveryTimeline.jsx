import React, { useState, useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { normalizeDistrictName } from '../utils/dataLoader'
import { createSimulationState, runIncrementalSimulation, getRecoveryColor, formatTime, buildDistrictGraph } from '../utils/recoverySimulationIncremental'
import { getWeightedRandomDistrict, getDistrictCentroid, easeCubicInOut } from '../utils/animation'

const RecoveryTimeline = ({ geojson, districts, ngoRegionScores }) => {
  const svgRef = useRef()
  const containerRef = useRef()
  const [currentTimelineIndex, setCurrentTimelineIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const playIntervalRef = useRef()

  const [timeline, setTimeline] = useState([])
  const [isCalculating, setIsCalculating] = useState(true)
  const [calculationError, setCalculationError] = useState(null)
  const [calculationProgress, setCalculationProgress] = useState(0)
  const simulationStateRef = useRef(null)
  const cancelRef = useRef(null)
  
  // NGO marker animation state
  const [ngoMarkers, setNgoMarkers] = useState([])
  const ngoMarkersRef = useRef([])
  const animationTimerRef = useRef(null)
  const projectionRef = useRef(null)

  // Simulate recovery timeline incrementally to avoid blocking UI
  useEffect(() => {
    if (!districts || !ngoRegionScores || districts.length === 0 || ngoRegionScores.length === 0 || !geojson) {
      setIsCalculating(false)
      return
    }

    setIsCalculating(true)
    setCalculationError(null)
    setTimeline([])
    setCalculationProgress(0)

    try {
      // Create simulation state
      const state = createSimulationState(districts, ngoRegionScores, 60)
      simulationStateRef.current = state
      
      // Build district graph for movement
      const districtGraph = buildDistrictGraph(districts, geojson)
      
      // Run incrementally with progress updates
      const cancel = runIncrementalSimulation(
        state,
        (snapshot, stepCount) => {
          // Update progress
          const totalSteps = Math.ceil(60 / state.timeStep) + 1
          setCalculationProgress((stepCount / totalSteps) * 100)
          // Update timeline as we go
          setTimeline([...state.timeline])
        },
        (finalTimeline) => {
          // Complete
          setTimeline(finalTimeline)
          setIsCalculating(false)
          setCalculationProgress(100)
        },
        districtGraph
      )
      
      cancelRef.current = cancel
    } catch (error) {
      console.error('Simulation setup error:', error)
      setCalculationError(error.message)
      setIsCalculating(false)
    }

    return () => {
      if (cancelRef.current) {
        cancelRef.current()
      }
    }
  }, [districts, ngoRegionScores, geojson])

  const currentSnapshot = timeline[currentTimelineIndex] || null
  const currentMonth = currentSnapshot ? currentSnapshot.month : 0
  const maxTimelineIndex = timeline.length > 0 ? timeline.length - 1 : 0

  // Initialize NGO markers from current snapshot
  const initializeNGOMarkers = (snapshot, projection) => {
    if (!snapshot || !geojson || !projection) return []
    
    const normalizeName = (name) => {
      if (!name) return ''
      return String(name).trim().toLowerCase()
    }
    
    // Collect all unique NGOs from district states
    const ngoSet = new Set()
    snapshot.districtStates.forEach(state => {
      if (state.ngoAssignments) {
        state.ngoAssignments.forEach(ngo => ngoSet.add(ngo))
      }
    })
    
    // Initialize NGO markers
    const markers = Array.from(ngoSet).map((ngo, idx) => {
      // Find initial district for this NGO
      let initialDistrict = null
      for (const state of snapshot.districtStates) {
        if (state.ngoAssignments && state.ngoAssignments.includes(ngo)) {
          // Find matching feature
          const feature = geojson.features.find(f => {
            const props = f.properties
            const normalizedName = props.normalized_name || normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
            return normalizedName === normalizeName(state.district)
          })
          if (feature) {
            initialDistrict = feature
            break
          }
        }
      }
      
      // If no district found, use random district
      if (!initialDistrict) {
        initialDistrict = geojson.features[Math.floor(Math.random() * geojson.features.length)]
      }
      
      const centroid = getDistrictCentroid(initialDistrict, projection)
      
      return {
        id: `ngo-${ngo}-${idx}`,
        ngo: ngo,
        currentDistrict: initialDistrict,
        targetDistrict: initialDistrict,
        currentX: centroid ? centroid[0] : 0,
        currentY: centroid ? centroid[1] : 0,
        targetX: centroid ? centroid[0] : 0,
        targetY: centroid ? centroid[1] : 0,
        progress: 1, // Start at target
        lastMoveMonth: 0
      }
    })
    
    return markers
  }
  
  // Update NGO movement each month - use useCallback to avoid stale closures
  const updateNGOMovement = useCallback((month, projection) => {
    if (!geojson || !projection) return
    
    const currentSnapshot = timeline[currentTimelineIndex] || null
    if (!currentSnapshot) return
    
    setNgoMarkers(prev => {
      if (prev.length === 0) return prev
      
      return prev.map(ngo => {
        // 10% chance to move each month (or if district is recovered)
        const shouldMove = Math.random() < 0.1 || (month - ngo.lastMoveMonth > 3 && Math.random() < 0.3)
        
        if (shouldMove && ngo.progress >= 1) {
          // Select new target district (weighted by need)
          const newDistrict = getWeightedRandomDistrict(geojson, districts, currentSnapshot.districtStates)
          
          if (newDistrict) {
            const newCentroid = getDistrictCentroid(newDistrict, projection)
            
            if (newCentroid) {
              return {
                ...ngo,
                currentDistrict: ngo.targetDistrict,
                targetDistrict: newDistrict,
                currentX: ngo.targetX,
                currentY: ngo.targetY,
                targetX: newCentroid[0],
                targetY: newCentroid[1],
                progress: 0,
                lastMoveMonth: month
              }
            }
          }
        }
        
        return ngo
      })
    })
  }, [geojson, districts, timeline, currentTimelineIndex])
  
  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && timeline.length > 0) {
      playIntervalRef.current = setInterval(() => {
        setCurrentTimelineIndex(prev => {
          if (prev >= timeline.length - 1) {
            setIsPlaying(false)
            return prev
          }
          const nextIndex = prev + 1
          const nextSnapshot = timeline[nextIndex]
          if (nextSnapshot && projectionRef.current) {
            // Update NGO movement for the new month
            setTimeout(() => {
              updateNGOMovement(nextSnapshot.month, projectionRef.current)
            }, 0)
          }
          return nextIndex
        })
      }, 500) // Update every 500ms
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [isPlaying, timeline.length, currentTimelineIndex])
  
  // D3 timer for smooth interpolation - runs continuously
  useEffect(() => {
    animationTimerRef.current = d3.timer(() => {
      setNgoMarkers(prev => {
        let hasUpdates = false
        const updated = prev.map(ngo => {
          if (ngo.progress < 1) {
            hasUpdates = true
            const newProgress = Math.min(ngo.progress + 0.03, 1) // Slower increment for smoother animation
            return { ...ngo, progress: newProgress }
          }
          return ngo
        })
        
        return updated
      })
    })
    
    return () => {
      if (animationTimerRef.current) {
        animationTimerRef.current.stop()
      }
    }
  }, []) // Run once on mount
  
  // Initialize NGO markers when snapshot changes
  useEffect(() => {
    if (!currentSnapshot || !geojson || !svgRef.current || !containerRef.current) return
    
    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight
    
    const projection = d3.geoMercator()
      .center([84.1240, 28.3949])
      .scale(3000)
      .translate([width / 2, height / 2])
    
    projectionRef.current = projection
    
    const markers = initializeNGOMarkers(currentSnapshot, projection)
    setNgoMarkers(markers)
    ngoMarkersRef.current = markers
  }, [currentSnapshot, geojson, currentTimelineIndex])

  // Draw map
  useEffect(() => {
    if (!geojson || !currentSnapshot || !svgRef.current || !containerRef.current) return

    const svg = d3.select(svgRef.current)
    // Clear all previous elements including animations
    svg.selectAll('*').interrupt().remove()

    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight

    svg.attr('width', width).attr('height', height)

    // Create projection
    const projection = d3.geoMercator()
      .center([84.1240, 28.3949])
      .scale(3000)
      .translate([width / 2, height / 2])

    const path = d3.geoPath().projection(projection)

    // Create zoom
    const zoom = d3.zoom()
      .scaleExtent([0.5, 8])
      .on('zoom', (event) => {
        svg.selectAll('path.district')
          .attr('transform', event.transform)
        // Also update dots and labels during zoom
        svg.selectAll('g.ngo-labels g')
          .attr('transform', event.transform)
        svg.selectAll('g.ngo-movements')
          .attr('transform', event.transform)
      })

    svg.call(zoom)

    const normalizeName = (name) => {
      if (!name) return ''
      return String(name).trim().toLowerCase()
    }

    // Create data map from current snapshot
    const dataMap = new Map()
    currentSnapshot.districtStates.forEach(d => {
      dataMap.set(normalizeName(d.district), d)
    })

    // Draw districts with update pattern
    const districts = svg.selectAll('path.district')
      .data(geojson.features)
    
    // Enter: create new districts
    const districtsEnter = districts.enter()
      .append('path')
      .attr('class', 'district')
      .attr('d', path)
      .attr('fill', d => {
        const props = d.properties
        const normalizedName = props.normalized_name || normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
        const districtData = dataMap.get(normalizedName)
        
        if (districtData) {
          return getRecoveryColor(districtData.recoveryScore)
        }
        return '#cccccc'
      })
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.85)
      .style('cursor', 'pointer')
      // Store random timeline update schedule for each district (consistent per district)
      .each(function(d) {
        const props = d.properties
        const normalizedName = props.normalized_name || normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
        
        // Only initialize if not already set
        if (!d3.select(this).attr('data-timeline-offset')) {
          // Generate random timeline index offset (0 to maxTimelineIndex) for each district
          // This determines when in the timeline this district will first update its color
          const maxTimelineIndex = timeline.length > 0 ? timeline.length - 1 : 60
          const randomTimelineOffset = Math.floor(Math.random() * maxTimelineIndex)
          // Random update interval - how often this district updates (every 2-8 steps)
          const updateInterval = 2 + Math.floor(Math.random() * 6)
          
          d3.select(this).attr('data-timeline-offset', randomTimelineOffset)
          d3.select(this).attr('data-update-interval', updateInterval)
          d3.select(this).attr('data-current-snapshot-index', 0) // Track which snapshot this district is currently showing
        }
      })
    
    // Update: update existing districts and merge with enter
    const districtsUpdate = districts.merge(districtsEnter)
    
    districtsUpdate
      .attr('d', path)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke-width', 2)
          .attr('stroke', '#333333')

        const props = d.properties
        const normalizedName = props.normalized_name || normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
        const districtData = dataMap.get(normalizedName)
        
        if (districtData) {
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
            .style('font-size', '13px')
            .html(`
              <strong>${props.NAME || props.DISTRICT || props.name || props.district || 'Unknown'}</strong><br/>
              <div style="margin-top: 8px;">
                <div><strong>Recovery:</strong> ${districtData.recoveryScore.toFixed(1)}%</div>
                <div><strong>NGOs Active:</strong> ${districtData.ngoCount}</div>
                <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.3);">
                  ${(() => {
                    if (!districtData.ngoAssignments || districtData.ngoAssignments.length === 0) {
                      return 'No active NGOs'
                    }
                    const ngoList = districtData.ngoAssignments.slice(0, 4)
                    const remaining = districtData.ngoAssignments.length - 4
                    let html = '<strong>NGOs:</strong><br/>' + ngoList.map(n => `• ${n}`).join('<br/>')
                    if (remaining > 0) {
                      html += `<br/><span style="font-style: italic; color: #9ca3af;">and ${remaining} more not listed</span>`
                    }
                    return html
                  })()}
                </div>
              </div>
            `)

          tooltip.transition()
            .duration(200)
            .style('opacity', 1)

          tooltip.style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
        }
      })
      .on('mousemove', function(event) {
        const tooltip = d3.select('.map-tooltip')
        tooltip.style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('opacity', 0.85)
          .attr('stroke-width', 0.5)
          .attr('stroke', '#ffffff')
        d3.select('.map-tooltip').remove()
      })

    // Update district colors based on random timeline offsets
    // Each district updates at completely different times - not synchronized
    districtsUpdate
      .each(function(d) {
        const props = d.properties
        const normalizedName = props.normalized_name || normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
        
        // Get this district's timeline offset and update interval
        let timelineOffset = parseFloat(d3.select(this).attr('data-timeline-offset'))
        let updateInterval = parseFloat(d3.select(this).attr('data-update-interval'))
        let currentSnapshotIndex = parseFloat(d3.select(this).attr('data-current-snapshot-index') || 0)
        
        // Initialize if not set
        if (isNaN(timelineOffset) || isNaN(updateInterval)) {
          const maxTimelineIndex = timeline.length > 0 ? timeline.length - 1 : 60
          timelineOffset = Math.floor(Math.random() * maxTimelineIndex)
          updateInterval = 2 + Math.floor(Math.random() * 6) // Update every 2-8 steps
          d3.select(this).attr('data-timeline-offset', timelineOffset)
          d3.select(this).attr('data-update-interval', updateInterval)
          d3.select(this).attr('data-current-snapshot-index', 0)
          currentSnapshotIndex = 0
        }
        
        // Determine which snapshot this district should use
        // Districts update independently at different times
        let snapshotIndex = currentSnapshotIndex
        
        if (currentTimelineIndex < timelineOffset) {
          // District hasn't started updating yet - use initial snapshot
          snapshotIndex = 0
          d3.select(this).attr('data-current-snapshot-index', 0)
        } else {
          // District has started updating
          // Check if it's time for this district to advance to the next snapshot
          const stepsSinceOffset = currentTimelineIndex - timelineOffset
          
          // Calculate how many updates this district should have had
          const updatesCount = Math.floor(stepsSinceOffset / updateInterval)
          
          // Calculate which snapshot index this district should be at
          // District progresses through snapshots at its own pace
          const targetSnapshotIndex = Math.min(updatesCount, currentTimelineIndex)
          
          // Only update if we need to advance
          if (targetSnapshotIndex > currentSnapshotIndex) {
            snapshotIndex = targetSnapshotIndex
            d3.select(this).attr('data-current-snapshot-index', snapshotIndex)
          } else {
            // Keep current snapshot
            snapshotIndex = currentSnapshotIndex
          }
        }
        
        // Get district data from the appropriate snapshot
        const snapshotToUse = timeline[snapshotIndex] || timeline[0] || currentSnapshot
        
        if (snapshotToUse) {
          const snapshotDataMap = new Map()
          snapshotToUse.districtStates.forEach(state => {
            snapshotDataMap.set(normalizeName(state.district), state)
          })
          const districtData = snapshotDataMap.get(normalizedName)
          
          if (districtData) {
            const newColor = getRecoveryColor(districtData.recoveryScore)
            const currentColor = d3.select(this).attr('fill')
            
            // Only update if color actually changed
            if (currentColor !== newColor) {
              // Smooth transition
              d3.select(this)
                .transition()
                .duration(600)
                .ease(d3.easeCubicInOut)
                .attr('fill', newColor)
            }
          }
        }
      })

    // Add NGO labels, indicators, and movement animations
    const ngoLabelsGroup = svg.append('g').attr('class', 'ngo-labels')
    const movementGroup = svg.append('g').attr('class', 'ngo-movements')
    
    // Get previous snapshot for movement tracking
    const previousSnapshot = timeline[currentTimelineIndex - 1] || null
    const previousDataMap = previousSnapshot ? new Map() : null
    if (previousSnapshot) {
      previousSnapshot.districtStates.forEach(d => {
        previousDataMap.set(normalizeName(d.district), d)
      })
    }
    
    geojson.features.forEach((feature, featureIdx) => {
      const props = feature.properties
      const normalizedName = props.normalized_name || normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
      const districtData = dataMap.get(normalizedName)
      const previousData = previousDataMap ? previousDataMap.get(normalizedName) : null
      
      const centroid = path.centroid(feature)
      const area = d3.geoArea(feature)
      
      if (area > 0.0001 && centroid[0] > 0 && centroid[1] > 0) {
        // Check if NGOs arrived (new NGOs in this district)
        if (districtData && previousData) {
          const previousNGOs = new Set(previousData.ngoAssignments || [])
          const currentNGOs = new Set(districtData.ngoAssignments || [])
          const newNGOs = Array.from(currentNGOs).filter(n => !previousNGOs.has(n))
          
          // Animate NGOs arriving (blue dots moving in)
          newNGOs.forEach((ngo, ngoIdx) => {
            // Find where this NGO came from
            const movement = currentSnapshot.ngoMovements?.find(m => 
              m.ngo === ngo && normalizeName(m.to) === normalizedName
            )
            
            if (movement && movement.fromCoords && movement.toCoords) {
              // Project coordinates
              const fromProj = projection(movement.fromCoords)
              const toProj = projection(movement.toCoords)
              
              // Create animated dot moving from source to destination
              const movingDot = movementGroup.append('circle')
                .attr('cx', fromProj[0])
                .attr('cy', fromProj[1])
                .attr('r', 6)
                .attr('fill', '#3b82f6')
                .attr('opacity', 0.9)
                .style('pointer-events', 'none')
                .attr('stroke', 'white')
                .attr('stroke-width', 2)
              
              // Animate movement
              movingDot
                .transition()
                .duration(1500)
                .ease(d3.easeCubicOut)
                .attr('cx', toProj[0])
                .attr('cy', toProj[1])
                .attr('r', 4)
                .transition()
                .duration(300)
                .attr('opacity', 0)
                .remove()
              
              // Draw movement path
              const pathLine = movementGroup.append('line')
                .attr('x1', fromProj[0])
                .attr('y1', fromProj[1])
                .attr('x2', fromProj[0])
                .attr('y2', fromProj[1])
                .attr('stroke', '#3b82f6')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '5,5')
                .attr('opacity', 0.6)
                .style('pointer-events', 'none')
              
              pathLine
                .transition()
                .duration(1500)
                .ease(d3.easeCubicOut)
                .attr('x2', toProj[0])
                .attr('y2', toProj[1])
                .transition()
                .duration(500)
                .attr('opacity', 0)
                .remove()
            }
          })
        }
        
        // Create dots based on current snapshot data for this district
        if (districtData && districtData.ngoCount > 0) {
          const districtGroup = ngoLabelsGroup.append('g')
            .attr('class', `district-ngo-labels-${featureIdx}`)
            .attr('data-district', normalizedName)
          
          // Pulsing activity indicator - intensity based on current NGO count
          const pulseSize = Math.min(5 + districtData.ngoCount * 1.5, 12)
          const activityIndicator = districtGroup.append('circle')
            .attr('cx', centroid[0])
            .attr('cy', centroid[1])
            .attr('r', pulseSize)
            .attr('fill', '#3b82f6')
            .attr('opacity', 0.8)
            .style('pointer-events', 'none')
            .attr('data-ngo-count', districtData.ngoCount)
          
          // Create a ref to track if animation should continue
          let shouldPulse = true
          
          const pulse = () => {
            if (!shouldPulse) return
            
            activityIndicator
              .transition()
              .duration(1000)
              .attr('r', pulseSize * 2)
              .attr('opacity', 0.3)
              .transition()
              .duration(1000)
              .attr('r', pulseSize)
              .attr('opacity', 0.8)
              .on('end', () => {
                if (shouldPulse) pulse()
              })
          }
          pulse()
          
          // Store cleanup function
          districtGroup.node()._cleanup = () => {
            shouldPulse = false
          }
          
          // NGO count badge - use current data
          const badge = districtGroup.append('g')
            .attr('transform', `translate(${centroid[0] + 10}, ${centroid[1] - 10})`)
            .style('pointer-events', 'none')
          
          badge.append('rect')
            .attr('width', 28)
            .attr('height', 18)
            .attr('rx', 9)
            .attr('fill', '#3b82f6')
            .attr('opacity', 0.95)
          
          badge.append('text')
            .attr('x', 14)
            .attr('y', 13)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .text(districtData.ngoCount)
          
          // NGO names (show on hover, top 3) - use current data
          if (districtData.ngoAssignments && districtData.ngoAssignments.length > 0) {
            const ngoNamesGroup = districtGroup.append('g')
              .attr('class', 'ngo-names')
              .style('opacity', 0)
              .style('pointer-events', 'none')
            
            const topNGOs = districtData.ngoAssignments.slice(0, 3)
            const remainingCount = districtData.ngoAssignments.length - 3
            const showMoreMessage = remainingCount > 0
            
            topNGOs.forEach((ngo, idx) => {
              const ngoText = ngoNamesGroup.append('text')
                .attr('x', centroid[0] + 15)
                .attr('y', centroid[1] + (idx * 15))
                .attr('font-size', '12px')
                .attr('fill', '#1f2937')
                .attr('font-weight', '600')
                .text(ngo)
              
              const bbox = ngoText.node().getBBox()
              ngoNamesGroup.insert('rect', 'text')
                .attr('x', bbox.x - 5)
                .attr('y', bbox.y - 3)
                .attr('width', bbox.width + 10)
                .attr('height', bbox.height + 6)
                .attr('fill', 'white')
                .attr('opacity', 0.95)
                .attr('rx', 4)
                .lower()
            })
            
            // Add "and X more not listed" message if there are more than 3 NGOs
            if (showMoreMessage) {
              const moreText = ngoNamesGroup.append('text')
                .attr('x', centroid[0] + 15)
                .attr('y', centroid[1] + (topNGOs.length * 15))
                .attr('font-size', '11px')
                .attr('fill', '#6b7280')
                .attr('font-style', 'italic')
                .text(`and ${remainingCount} more not listed`)
              
              const moreBbox = moreText.node().getBBox()
              ngoNamesGroup.insert('rect', 'text')
                .attr('x', moreBbox.x - 5)
                .attr('y', moreBbox.y - 3)
                .attr('width', moreBbox.width + 10)
                .attr('height', moreBbox.height + 6)
                .attr('fill', 'white')
                .attr('opacity', 0.95)
                .attr('rx', 4)
                .lower()
            }
            
            // Show on hover
            const districtPath = svg.selectAll('path.district').filter((d, i) => {
              const fProps = d.properties
              const fNormalizedName = fProps.normalized_name || normalizeName(fProps.NAME || fProps.DISTRICT || fProps.name || fProps.district || '')
              return fNormalizedName === normalizedName
            })
            
            districtPath
              .on('mouseenter', function() {
                ngoNamesGroup
                  .transition()
                  .duration(200)
                  .style('opacity', 1)
              })
              .on('mouseleave', function() {
                ngoNamesGroup
                  .transition()
                  .duration(200)
                  .style('opacity', 0)
              })
          }
        }
      }
    })

    // Handle resize
    const handleResize = () => {
      const newWidth = containerRef.current.clientWidth
      const newHeight = containerRef.current.clientHeight
      projection.translate([newWidth / 2, newHeight / 2])
      svg.attr('width', newWidth).attr('height', newHeight)
      svg.selectAll('path.district').attr('d', path)
    }

    // Render animated NGO markers
    const ngoMarkersGroup = svg.append('g').attr('class', 'ngo-animated-markers')
    
    // Update NGO marker positions with interpolation
    const markerSelection = ngoMarkersGroup
      .selectAll('g.ngo-marker')
      .data(ngoMarkers, d => d.id)
    
    // Enter: create new markers
    const markerEnter = markerSelection.enter()
      .append('g')
      .attr('class', 'ngo-marker')
    
    // Add circle for NGO marker
    markerEnter.append('circle')
      .attr('r', 8)
      .attr('fill', '#3b82f6')
      .attr('opacity', 0.9)
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('pointer-events', 'none')
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))')
    
    // Add pulsing animation
    markerEnter.select('circle')
      .append('animate')
      .attr('attributeName', 'r')
      .attr('values', '8;10;8')
      .attr('dur', '2s')
      .attr('repeatCount', 'indefinite')
    
    // Merge enter and update
    const markerUpdate = markerEnter.merge(markerSelection)
    
    // Update positions with interpolation
    markerUpdate.each(function(d) {
      const eased = easeCubicInOut(d.progress)
      const x = d.currentX + (d.targetX - d.currentX) * eased
      const y = d.currentY + (d.targetY - d.currentY) * eased
      
      d3.select(this)
        .attr('transform', `translate(${x}, ${y})`)
      
      // Flash district outline when NGO arrives
      if (d.progress >= 0.99 && d.progress < 1) {
        const targetName = d.targetDistrict?.properties?.NAME || d.targetDistrict?.properties?.DISTRICT || d.targetDistrict?.properties?.name || ''
        if (targetName) {
          svg.selectAll('path.district')
            .filter(function(district) {
              const props = district.properties
              const normalizedName = props.normalized_name || normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
              const targetNormalizedName = normalizeName(targetName)
              return normalizedName === targetNormalizedName
            })
            .transition()
            .duration(300)
            .attr('stroke', '#3b82f6')
            .attr('stroke-width', 3)
            .transition()
            .duration(500)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 0.5)
        }
      }
    })
    
    // Exit: remove markers
    markerSelection.exit().remove()
    
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      d3.select('.map-tooltip').remove()
      // Stop all animations and clear everything
      svg.selectAll('*').interrupt()
      // Clean up any stored cleanup functions
      svg.selectAll('g.ngo-labels g').each(function() {
        if (this._cleanup) {
          this._cleanup()
        }
      })
    }
  }, [geojson, currentSnapshot, currentTimelineIndex, timeline, ngoMarkers])

  if (isCalculating) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center w-full max-w-md">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg mb-2">Calculating 5-year recovery simulation...</p>
            <p className="text-gray-500 text-sm mb-4">Processing incrementally to keep UI responsive</p>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div 
                className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${calculationProgress}%` }}
              ></div>
            </div>
            <p className="text-gray-500 text-xs">{Math.round(calculationProgress)}% complete</p>
            
            <p className="text-gray-400 text-xs mt-4">Processing {districts?.length || 0} districts and {ngoRegionScores?.length || 0} NGO assignments</p>
          </div>
        </div>
      </div>
    )
  }

  if (calculationError) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center bg-red-50 rounded-lg p-6 border border-red-200 max-w-md">
            <h3 className="text-xl font-semibold text-red-600 mb-2">Simulation Error</h3>
            <p className="text-gray-700 mb-4">{calculationError}</p>
            <button
              onClick={() => {
                setIsCalculating(true)
                setCalculationError(null)
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!timeline.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-gray-600">No simulation data available</p>
          </div>
        </div>
      </div>
    )
  }

  const currentTime = currentSnapshot

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-primary-600 mb-2 pb-2 border-b-2 border-primary-600">
          🔮 5-Year Recovery Simulation
        </h3>
        <p className="text-gray-600">
          Watch how Nepal recovers over 5 years as NGOs move between regions based on recovery progress.
          NGOs automatically relocate to areas needing more help once their current region reaches 70% recovery.
        </p>
      </div>

      {/* Timeline Controls */}
      <div className="mb-6 bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-2xl font-bold text-primary-600">
              {formatTime(currentTime.month)}
            </div>
            <div className="text-sm text-gray-500">
              Month {currentTime.month} of 60
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                isPlaying
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              onClick={() => {
                setCurrentTimelineIndex(0)
                setIsPlaying(false)
                // Reset NGO markers to initial positions
                if (timeline.length > 0 && projectionRef.current) {
                  const initialSnapshot = timeline[0]
                  const markers = initializeNGOMarkers(initialSnapshot, projectionRef.current)
                  setNgoMarkers(markers)
                  ngoMarkersRef.current = markers
                }
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
            >
              ⏮ Reset
            </button>
          </div>
        </div>

        <input
          type="range"
          min="0"
          max={maxTimelineIndex}
          value={currentTimelineIndex}
          onChange={(e) => {
            const newIndex = parseInt(e.target.value)
            setCurrentTimelineIndex(newIndex)
            setIsPlaying(false)
            // Update NGO movement when slider changes
            const newSnapshot = timeline[newIndex]
            if (newSnapshot && projectionRef.current) {
              setTimeout(() => {
                updateNGOMovement(newSnapshot.month, projectionRef.current)
              }, 0)
            }
          }}
          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: maxTimelineIndex > 0 
              ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTimelineIndex / maxTimelineIndex) * 100}%, #e5e7eb ${(currentTimelineIndex / maxTimelineIndex) * 100}%, #e5e7eb 100%)`
              : '#e5e7eb'
          }}
        />
        
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>0m</span>
          <span>1y</span>
          <span>2y</span>
          <span>3y</span>
          <span>4y</span>
          <span>5y</span>
        </div>
      </div>

      {/* Statistics */}
      {currentTime && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{currentTime.totalNGOs}</div>
            <div className="text-xs text-blue-600 uppercase tracking-wide">Active NGOs</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-2xl font-bold text-green-700">{currentTime.totalAssignments}</div>
            <div className="text-xs text-green-600 uppercase tracking-wide">Total Assignments</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-2xl font-bold text-purple-700">
              {currentTime.districtStates.filter(d => d.recoveryScore >= 70).length}
            </div>
            <div className="text-xs text-purple-600 uppercase tracking-wide">Recovered Districts</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="text-2xl font-bold text-orange-700">
              {currentTime.ngoMovements.length}
            </div>
            <div className="text-xs text-orange-600 uppercase tracking-wide">NGO Movements</div>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height: '600px' }}>
        <div ref={containerRef} className="map-visualization w-full h-full relative bg-gray-50">
          <svg ref={svgRef} className="w-full h-full"></svg>
          
          {/* Legend */}
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10 border border-gray-200 max-w-xs">
            <div className="text-sm font-semibold text-gray-700 mb-2">Recovery Status</div>
            <div className="flex items-center space-x-2 mb-3">
              <div className="flex flex-col items-center space-y-1">
                <div className="w-8 h-4 rounded" style={{ background: '#d73027' }}></div>
                <span className="text-xs text-gray-600">0-30%</span>
              </div>
              <div className="flex-1 h-4 rounded" style={{ 
                background: 'linear-gradient(to right, #d73027, #fee08b, #66bd63, #1a9850)' 
              }}></div>
              <div className="flex flex-col items-center space-y-1">
                <div className="w-8 h-4 rounded" style={{ background: '#1a9850' }}></div>
                <span className="text-xs text-gray-600">71-100%</span>
              </div>
            </div>
            <div className="text-xs text-gray-600 mb-2 text-center">
              <span className="text-red-600">Red (0-30%)</span> → <span className="text-yellow-600">Yellow (31-70%)</span> → <span className="text-green-600">Green (71-100%)</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2 text-xs">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-gray-600">Active NGO</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-3 bg-blue-600 rounded"></div>
                <span className="text-gray-600">NGO count</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NGOs and Districts Cards */}
      {currentTime && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total NGOs Card */}
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3">Active NGOs</h4>
            <div className="space-y-2">
              {(() => {
                // Get unique NGOs from all assignments
                const allNGOs = new Set()
                currentTime.districtStates.forEach(district => {
                  if (district.ngoAssignments) {
                    district.ngoAssignments.forEach(ngo => allNGOs.add(ngo))
                  }
                })
                const ngoList = Array.from(allNGOs).slice(0, 4)
                const remainingNGOs = allNGOs.size - 4
                return (
                  <>
                    {ngoList.map((ngo, idx) => (
                      <div key={idx} className="text-sm bg-blue-50 rounded p-2 border border-blue-200">
                        <span className="font-medium text-blue-700">{ngo}</span>
                      </div>
                    ))}
                    {remainingNGOs > 0 && (
                      <div className="text-sm bg-gray-50 rounded p-2 border border-gray-200 italic text-gray-600">
                        and {remainingNGOs} more not listed
                      </div>
                    )}
                    {allNGOs.size === 0 && (
                      <div className="text-sm text-gray-500 italic">No active NGOs</div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>

          {/* Districts Card */}
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3">Districts</h4>
            <div className="space-y-2">
              {(() => {
                const districtList = currentTime.districtStates.slice(0, 4)
                const remainingDistricts = currentTime.districtStates.length - 4
                return (
                  <>
                    {districtList.map((district, idx) => (
                      <div key={idx} className="text-sm bg-green-50 rounded p-2 border border-green-200">
                        <span className="font-medium text-green-700">{district.district}</span>
                        <span className="text-gray-500 text-xs ml-2">({district.recoveryScore.toFixed(1)}% recovery)</span>
                      </div>
                    ))}
                    {remainingDistricts > 0 && (
                      <div className="text-sm bg-gray-50 rounded p-2 border border-gray-200 italic text-gray-600">
                        and {remainingDistricts} more not listed
                      </div>
                    )}
                    {currentTime.districtStates.length === 0 && (
                      <div className="text-sm text-gray-500 italic">No districts</div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Recent Movements */}
      {currentTime && currentTime.ngoMovements.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-3">Recent NGO Movements</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {currentTime.ngoMovements.slice(-5).map((movement, idx) => (
              <div key={idx} className="text-sm bg-white rounded p-2 border border-gray-200">
                <span className="font-medium text-primary-600">{movement.ngo}</span>
                {' moved from '}
                <span className="text-red-600">{movement.from}</span>
                {' to '}
                <span className="text-green-600">{movement.to}</span>
                <span className="text-gray-500 text-xs ml-2">({movement.reason})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default RecoveryTimeline

