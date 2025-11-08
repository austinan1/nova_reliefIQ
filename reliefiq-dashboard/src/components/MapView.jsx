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
        if (districtData && districtData.match !== undefined) {
          // Match values are already 0-1, convert to 0-100 scale
          const matchValue = districtData.match <= 1 ? districtData.match * 100 : districtData.match
          return getMatchColor(matchValue)
        }
        return '#cccccc' // Default gray for unmatched districts
      })
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke-width', 2)
          .attr('stroke', '#333333')

        // Show tooltip
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
      .on('mouseout', function() {
        d3.select(this)
          .attr('opacity', 0.8)
          .attr('stroke-width', 0.5)
          .attr('stroke', '#ffffff')

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

    // Highlight selected district
    if (selectedDistrict) {
      svg.selectAll('path.district')
        .attr('stroke', (d, i) => {
          const props = d.properties
          const normalizedName = props.normalized_name || normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
          if (normalizeName(selectedDistrict.district) === normalizedName) {
            return '#ff6b6b'
          }
          return '#ffffff'
        })
        .attr('stroke-width', (d, i) => {
          const props = d.properties
          const normalizedName = props.normalized_name || normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
          if (normalizeName(selectedDistrict.district) === normalizedName) {
            return 3
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
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10 border border-gray-200">
        <div className="text-sm font-semibold text-gray-700 mb-2">Match Score</div>
        <div className="flex items-center space-x-2">
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
      </div>
    </div>
  )
}

export default MapView

