import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { getMatchColor } from '../utils/colorScales'
import { normalizeDistrictName } from '../utils/dataLoader'

const MapView = ({ geojson, data, selectedNGO, onDistrictClick, selectedDistrict }) => {
  const svgRef = useRef()
  const containerRef = useRef()
  const zoomRef = useRef()

  useEffect(() => {
    if (!geojson || !data || !svgRef.current || !containerRef.current) return

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

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 8])
      .on('zoom', (event) => {
        svg.selectAll('path.district')
          .attr('transform', event.transform)
      })

    svg.call(zoom)

    // Normalize district names for matching
    const normalizeName = (name) => {
      if (!name) return ''
      return String(name).trim().toLowerCase()
    }

    // Create a map of district data
    const dataMap = new Map()
    data.forEach(d => {
      dataMap.set(normalizeName(d.district), d)
    })

    // Find top 5 best matches
    const top5Districts = [...data]
      .map(d => ({
        district: d.district,
        match: d.match <= 1 ? d.match * 100 : d.match
      }))
      .sort((a, b) => b.match - a.match)
      .slice(0, 5)
      .map(d => normalizeName(d.district))
    
    const top5Set = new Set(top5Districts)

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
        
        // Top 5 best matches get blue fill
        if (top5Set.has(normalizedName)) {
          return '#2563eb' // Blue fill for top 5
        }
        
        if (districtData && districtData.match !== undefined) {
          // Match values are already 0-1, convert to 0-100 scale
          const matchValue = districtData.match <= 1 ? districtData.match * 100 : districtData.match
          return getMatchColor(matchValue)
        }
        return '#cccccc' // Default gray for unmatched districts
      })
      .attr('stroke', d => {
        const props = d.properties
        const normalizedName = props.normalized_name || normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
        
        // Top 5 best matches get gold border
        if (top5Set.has(normalizedName)) {
          return '#FFD700' // Gold border for top 5
        }
        return '#ffffff' // White for others
      })
      .attr('stroke-width', d => {
        const props = d.properties
        const normalizedName = props.normalized_name || normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
        
        // Top 5 best matches get thick border
        if (top5Set.has(normalizedName)) {
          return 4
        }
        return 0.5 // Thin border for others
      })
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        const props = d.properties
        const normalizedName = props.normalized_name || normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
        const districtData = dataMap.get(normalizedName)
        
        // Increase visibility on hover
        if (top5Set.has(normalizedName)) {
          // Top 5 get thicker gold border on hover
          d3.select(this)
            .attr('opacity', 1)
            .attr('stroke-width', 5)
            .attr('stroke', '#FFD700')
        } else {
          d3.select(this)
            .attr('opacity', 1)
            .attr('stroke-width', 2)
            .attr('stroke', '#333333')
        }

        // Show tooltip
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
            .style('font-size', '12px')
            .style('box-shadow', '0 4px 6px rgba(0, 0, 0, 0.3)')
            .html(`
              <strong>${props.NAME || props.DISTRICT || props.name || props.district || 'Unknown'}</strong><br/>
              Match Score: ${(districtData.match <= 1 ? districtData.match * 100 : districtData.match).toFixed(1)}<br/>
              Urgency: ${(districtData.urgency <= 1 ? districtData.urgency * 100 : districtData.urgency).toFixed(1)}<br/>
              Fitness Score: ${(districtData.fitness_score <= 1 ? districtData.fitness_score * 100 : districtData.fitness_score).toFixed(1)}<br/>
              Damage %: ${districtData.damage_pct?.toFixed(1) || 0}%<br/>
              Population Density: ${districtData.population_density?.toFixed(1) || 0}
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
      .on('mouseout', function(event, d) {
        const props = d.properties
        const normalizedName = props.normalized_name || normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
        
        // Restore original styling
        if (top5Set.has(normalizedName)) {
          // Top 5 restore to thick gold border
          d3.select(this)
            .attr('opacity', 0.8)
            .attr('stroke-width', 4)
            .attr('stroke', '#FFD700')
        } else {
          d3.select(this)
            .attr('opacity', 0.8)
            .attr('stroke-width', 0.5)
            .attr('stroke', '#ffffff')
        }

        d3.select('.map-tooltip').remove()
      })
      .on('click', function(event, d) {
        const props = d.properties
        const normalizedName = props.normalized_name || normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
        const districtData = dataMap.get(normalizedName)
        
        if (districtData && onDistrictClick) {
          onDistrictClick(districtData)
        }
      })

    // Highlight selected district (override top 5 styling)
    if (selectedDistrict) {
      svg.selectAll('path.district')
        .attr('stroke', (d, i) => {
          const props = d.properties
          const normalizedName = props.normalized_name || normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
          if (normalizeName(selectedDistrict.district) === normalizedName) {
            return '#ff6b6b' // Red for selected
          }
          // Restore top 5 styling for non-selected
          if (top5Set.has(normalizedName)) {
            return '#FFD700'
          }
          return '#ffffff'
        })
        .attr('stroke-width', (d, i) => {
          const props = d.properties
          const normalizedName = props.normalized_name || normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
          if (normalizeName(selectedDistrict.district) === normalizedName) {
            return 4 // Thick border for selected
          }
          // Restore top 5 styling for non-selected
          if (top5Set.has(normalizedName)) {
            return 4
          }
          return 0.5
        })
    }

    // Handle window resize
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
  }, [geojson, data, selectedNGO, selectedDistrict, onDistrictClick])

  return (
    <div ref={containerRef} className="map-visualization w-full h-full relative bg-gray-50">
      <svg ref={svgRef} className="w-full h-full"></svg>
      
      {/* Color Legend */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10 border border-gray-200 max-w-xs">
        <div className="text-sm font-semibold text-gray-700 mb-2">Match Score</div>
        <div className="flex items-center space-x-2 mb-3">
          <div className="flex flex-col items-center space-y-1">
            <div className="w-8 h-4 rounded" style={{ background: '#d73027' }}></div>
            <span className="text-xs text-gray-600">Poor</span>
          </div>
          <div className="flex-1 h-4 rounded" style={{ 
            background: 'linear-gradient(to right, #d73027, #fee08b, #66bd63, #3288bd)' 
          }}></div>
          <div className="flex flex-col items-center space-y-1">
            <div className="w-8 h-4 rounded" style={{ background: '#3288bd' }}></div>
            <span className="text-xs text-gray-600">Best</span>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-2 mt-2">
          <div className="text-xs font-semibold text-gray-700 mb-1">Top 5 Best Matches:</div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-3 bg-blue-600 border-4 border-yellow-500 rounded"></div>
            <span className="text-xs text-gray-600">Blue fill, gold border</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapView

