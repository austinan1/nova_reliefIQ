import React, { useState, useEffect, useRef, useMemo } from 'react'
import * as d3 from 'd3'
import { normalizeDistrictName } from '../utils/dataLoader'
import { simulateRecovery, getRecoveryColor, formatTime } from '../utils/recoverySimulation'

const RecoveryTimeline = ({ geojson, districts, ngoRegionScores }) => {
  const svgRef = useRef()
  const containerRef = useRef()
  const [currentTimelineIndex, setCurrentTimelineIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const playIntervalRef = useRef()

  // Simulate recovery timeline
  const timeline = useMemo(() => {
    if (!districts || !ngoRegionScores) return []
    return simulateRecovery(districts, ngoRegionScores, 60) // 5 years
  }, [districts, ngoRegionScores])

  const currentSnapshot = timeline[currentTimelineIndex] || null
  const currentMonth = currentSnapshot ? currentSnapshot.month : 0
  const maxTimelineIndex = timeline.length > 0 ? timeline.length - 1 : 0

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && timeline.length > 0) {
      playIntervalRef.current = setInterval(() => {
        setCurrentTimelineIndex(prev => {
          if (prev >= timeline.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
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
  }, [isPlaying, timeline.length])

  // Draw map
  useEffect(() => {
    if (!geojson || !currentSnapshot || !svgRef.current || !containerRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

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
      })

    svg.call(zoom)

    const normalizeName = (name) => {
      if (!name) return ''
      return String(name).trim().toLowerCase()
    }

    // Create data map
    const dataMap = new Map()
    currentSnapshot.districtStates.forEach(d => {
      dataMap.set(normalizeName(d.district), d)
    })

    // Draw districts
    const districts = svg.selectAll('path.district')
      .data(geojson.features)
      .enter()
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
      .style('transition', 'fill 0.3s ease-in-out')
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
                  ${districtData.ngoAssignments && districtData.ngoAssignments.length > 0 
                    ? '<strong>NGOs:</strong><br/>' + districtData.ngoAssignments.slice(0, 5).map(n => `• ${n}`).join('<br/>')
                    : 'No active NGOs'
                  }
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

    // Add NGO labels and indicators
    const ngoLabelsGroup = svg.append('g').attr('class', 'ngo-labels')
    
    geojson.features.forEach((feature, featureIdx) => {
      const props = feature.properties
      const normalizedName = props.normalized_name || normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
      const districtData = dataMap.get(normalizedName)
      
      if (districtData && districtData.ngoCount > 0) {
        const centroid = path.centroid(feature)
        const area = d3.geoArea(feature)
        
        if (area > 0.0001 && centroid[0] > 0 && centroid[1] > 0) {
          const districtGroup = ngoLabelsGroup.append('g')
            .attr('class', `district-ngo-labels-${featureIdx}`)
          
          // Pulsing activity indicator
          const activityIndicator = districtGroup.append('circle')
            .attr('cx', centroid[0])
            .attr('cy', centroid[1])
            .attr('r', 5)
            .attr('fill', '#3b82f6')
            .attr('opacity', 0.8)
            .style('pointer-events', 'none')
          
          const pulse = () => {
            activityIndicator
              .transition()
              .duration(1200)
              .attr('r', 10)
              .attr('opacity', 0.3)
              .transition()
              .duration(1200)
              .attr('r', 5)
              .attr('opacity', 0.8)
              .on('end', pulse)
          }
          pulse()
          
          // NGO count badge
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
          
          // NGO names (show on hover, top 3)
          if (districtData.ngoAssignments && districtData.ngoAssignments.length > 0) {
            const ngoNamesGroup = districtGroup.append('g')
              .attr('class', 'ngo-names')
              .style('opacity', 0)
              .style('pointer-events', 'none')
            
            const topNGOs = districtData.ngoAssignments.slice(0, 3)
            
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

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      d3.select('.map-tooltip').remove()
    }
  }, [geojson, currentSnapshot])

  if (!timeline.length) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Calculating recovery simulation...</p>
        </div>
      </div>
    )
  }

  const maxMonth = timeline.length - 1
  const currentTime = timeline[currentMonth]

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
            setCurrentTimelineIndex(parseInt(e.target.value))
            setIsPlaying(false)
          }}
          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: maxTimelineIndex > 0 
              ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTimelineIndex / maxTimelineIndex) * 100}%, #e5e7eb ${(currentTimelineIndex / maxTimelineIndex) * 100}%, #e5e7eb 100%)`
              : '#e5e7eb'
          }}
        />
        
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>0 months</span>
          <span>1 year</span>
          <span>2 years</span>
          <span>3 years</span>
          <span>4 years</span>
          <span>5 years</span>
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
                <span className="text-xs text-gray-600">Severe</span>
              </div>
              <div className="flex-1 h-4 rounded" style={{ 
                background: 'linear-gradient(to right, #d73027, #fee08b, #66bd63, #3288bd)' 
              }}></div>
              <div className="flex flex-col items-center space-y-1">
                <div className="w-8 h-4 rounded" style={{ background: '#3288bd' }}></div>
                <span className="text-xs text-gray-600">Recovered</span>
              </div>
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

