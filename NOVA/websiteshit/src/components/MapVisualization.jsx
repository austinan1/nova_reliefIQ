import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import './MapVisualization.css'

const MapVisualization = ({ geojson, data, selectedNGO, onDistrictClick, selectedDistrict }) => {
  const svgRef = useRef()
  const containerRef = useRef()

  useEffect(() => {
    if (!geojson || !data || !svgRef.current) return

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

    // Create color scale: Red (poor) -> Yellow -> Green (good) -> Blue (best)
    const colorScale = d3.scaleSequential()
      .domain([0, 100])
      .interpolator(d3.interpolateRdYlGn) // Red-Yellow-Green
      // We'll customize this to go Red -> Yellow -> Green -> Blue

    // Custom color interpolator: Red -> Yellow -> Green -> Blue
    const customColorScale = (value) => {
      if (value <= 33) {
        // Red to Yellow (0-33)
        return d3.interpolateReds(value / 33)
      } else if (value <= 66) {
        // Yellow to Green (33-66)
        return d3.interpolateYlGn((value - 33) / 33)
      } else {
        // Green to Blue (66-100)
        return d3.interpolateGnBu((value - 66) / 34)
      }
    }

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
          const matchValue = parseFloat(districtData.match) || 0
          return customColorScale(matchValue)
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
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '10px')
            .style('border-radius', '5px')
            .style('pointer-events', 'none')
            .style('z-index', 1000)
            .html(`
              <strong>${props.NAME || props.DISTRICT || props.name || props.district || 'Unknown'}</strong><br/>
              Match Score: ${(parseFloat(districtData.match) || 0).toFixed(1)}<br/>
              Urgency: ${(parseFloat(districtData.urgency) || 0).toFixed(1)}<br/>
              Fitness Score: ${(parseFloat(districtData.fitness_score) || 0).toFixed(1)}<br/>
              Damage %: ${(parseFloat(districtData.houses_destroyed_pct) || 0).toFixed(1)}%<br/>
              Population Density: ${(parseFloat(districtData.pop_density) || 0).toFixed(1)}
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
          onDistrictClick(districtData.district)
        }
      })

    // Highlight selected district
    if (selectedDistrict) {
      svg.selectAll('path.district')
        .attr('stroke', (d, i) => {
          const props = d.properties
          const normalizedName = props.normalized_name || normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
          if (normalizeName(selectedDistrict) === normalizedName) {
            return '#ff6b6b'
          }
          return '#ffffff'
        })
        .attr('stroke-width', (d, i) => {
          const props = d.properties
          const normalizedName = props.normalized_name || normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
          if (normalizeName(selectedDistrict) === normalizedName) {
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
    <div ref={containerRef} className="map-visualization">
      <svg ref={svgRef}></svg>
      <div className="map-legend">
        <div className="legend-title">Match Score</div>
        <div className="legend-gradient">
          <span className="legend-label">Poor</span>
          <div className="legend-colors">
            <div className="legend-color" style={{ background: '#d73027' }}></div>
            <div className="legend-color" style={{ background: '#fee08b' }}></div>
            <div className="legend-color" style={{ background: '#66bd63' }}></div>
            <div className="legend-color" style={{ background: '#3288bd' }}></div>
          </div>
          <span className="legend-label">Best</span>
        </div>
      </div>
    </div>
  )
}

export default MapVisualization

