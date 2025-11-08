import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { normalizeDistrictName } from '../utils/dataLoader'
import { capitalizeDistrictName } from '../utils/formatUtils'

const SituationalMap = ({ geojson, selectedRegion, regionData, nearbyNGOs }) => {
  const svgRef = useRef()
  const containerRef = useRef()
  const zoomRef = useRef()

  useEffect(() => {
    if (!geojson || !svgRef.current || !containerRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight

    svg.attr('width', width).attr('height', height)

    // Create projection for Nepal
    const projection = d3.geoMercator()
      .center([86.4240, 26.3949]) // Nepal center
      .scale(3500)
      .translate([width / 2, height / 2])

    const path = d3.geoPath().projection(projection)

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 8])
      .on('zoom', (event) => {
        svg.selectAll('g.map-group')
          .attr('transform', event.transform)
      })

    svg.call(zoom)

    // Create a group for map elements
    const mapGroup = svg.append('g').attr('class', 'map-group')

    // Normalize district names for matching
    const normalizeName = (name) => {
      if (!name) return ''
      return String(name).trim().toLowerCase()
    }

    // Draw all districts
    mapGroup.selectAll('path.district')
      .data(geojson.features)
      .enter()
      .append('path')
      .attr('class', 'district')
      .attr('d', path)
      .attr('fill', '#e5e7eb')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.6)

    // Highlight selected region
    if (selectedRegion) {
      const normalizedSelected = normalizeName(selectedRegion)
      
      mapGroup.selectAll('path.district')
        .attr('fill', (d) => {
          const props = d.properties
          const normalizedName = props.normalized_name || 
            normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
          
          if (normalizedName === normalizedSelected) {
            return '#2563eb' // Blue for selected
          }
          return '#e5e7eb' // Gray for others
        })
        .attr('stroke', (d) => {
          const props = d.properties
          const normalizedName = props.normalized_name || 
            normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
          
          if (normalizedName === normalizedSelected) {
            return '#1e40af' // Darker blue border
          }
          return '#ffffff'
        })
        .attr('stroke-width', (d) => {
          const props = d.properties
          const normalizedName = props.normalized_name || 
            normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
          
          if (normalizedName === normalizedSelected) {
            return 3
          }
          return 0.5
        })
        .attr('opacity', (d) => {
          const props = d.properties
          const normalizedName = props.normalized_name || 
            normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
          
          if (normalizedName === normalizedSelected) {
            return 1
          }
          return 0.4
        })

      // Draw 10-mile radius bubble (approximate: 10 miles ≈ 16 km)
      // Find the selected district feature
      const selectedFeature = geojson.features.find(f => {
        const props = f.properties
        const normalizedName = props.normalized_name || 
          normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
        return normalizedName === normalizedSelected
      })

      if (selectedFeature) {
        // Calculate centroid
        const bounds = path.bounds(selectedFeature)
        const centroid = [
          (bounds[0][0] + bounds[1][0]) / 2,
          (bounds[0][1] + bounds[1][1]) / 2
        ]

        // Convert 10 miles to degrees (approximate: 1 degree ≈ 111 km)
        // 10 miles ≈ 16 km ≈ 0.144 degrees
        const radiusDegrees = 0.144

        // Create circle in geographic coordinates
        const circle = d3.geoCircle()
          .center(projection.invert(centroid))
          .radius(radiusDegrees)

        // Draw the bubble
        mapGroup.append('path')
          .datum(circle())
          .attr('d', path)
          .attr('fill', 'none')
          .attr('stroke', '#f59e0b')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '5,5')
          .attr('opacity', 0.8)

        // Draw accessibility indicators
        if (regionData) {
          const accessibilityColor = 
            regionData.accessibility === 'green' ? '#10b981' :
            regionData.accessibility === 'orange' ? '#f59e0b' :
            '#ef4444'

          // Draw small circles for accessibility
          const numIndicators = 8
          for (let i = 0; i < numIndicators; i++) {
            const angle = (i / numIndicators) * Math.PI * 2
            const offsetX = Math.cos(angle) * 50
            const offsetY = Math.sin(angle) * 50
            
            mapGroup.append('circle')
              .attr('cx', centroid[0] + offsetX)
              .attr('cy', centroid[1] + offsetY)
              .attr('r', 3)
              .attr('fill', accessibilityColor)
              .attr('opacity', 0.7)
          }
        }

        // Zoom to selected region
        const [x, y] = centroid
        const scale = 2.5
        const translateX = width / 2 - x * scale
        const translateY = height / 2 - y * scale

        const transform = d3.zoomIdentity
          .translate(translateX, translateY)
          .scale(scale)

        svg.call(zoom.transform, transform)
      }
    }

    // Add tooltips for districts
    mapGroup.selectAll('path.district')
      .on('mouseover', function(event, d) {
        // Remove any existing tooltips first
        d3.selectAll('.map-tooltip').remove()
        
        const props = d.properties
        const normalizedName = props.normalized_name || 
          normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
        
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke-width', 2)
          .attr('stroke', '#333333')

        // Show tooltip
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
            <strong>${capitalizeDistrictName(props.NAME || props.DISTRICT || props.name || props.district || 'Unknown')}</strong>
          `)

        tooltip.transition()
          .duration(200)
          .style('opacity', 1)

        tooltip.style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
      })
      .on('mousemove', function(event) {
        const tooltip = d3.select('.map-tooltip')
        if (!tooltip.empty()) {
          tooltip.style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
        }
      })
      .on('mouseout', function(event, d) {
        const props = d.properties
        const normalizedName = props.normalized_name || 
          normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
        const normalizedSelected = selectedRegion ? normalizeName(selectedRegion) : ''
        
        // Remove tooltip immediately
        d3.selectAll('.map-tooltip').remove()
        
        if (normalizedName === normalizedSelected) {
          d3.select(this)
            .attr('opacity', 1)
            .attr('stroke-width', 3)
            .attr('stroke', '#1e40af')
        } else {
          d3.select(this)
            .attr('opacity', 0.4)
            .attr('stroke-width', 0.5)
            .attr('stroke', '#ffffff')
        }
      })

    // Handle window resize
    const handleResize = () => {
      const newWidth = containerRef.current.clientWidth
      const newHeight = containerRef.current.clientHeight
      
      projection.translate([newWidth / 2, newHeight / 2])
      
      svg.attr('width', newWidth).attr('height', newHeight)
      mapGroup.selectAll('path.district').attr('d', path)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      // Clean up all tooltips
      d3.selectAll('.map-tooltip').remove()
    }
  }, [geojson, selectedRegion, regionData, nearbyNGOs])

  return (
    <div ref={containerRef} className="situational-map w-full h-full relative bg-gray-50 rounded-lg overflow-hidden">
      <svg ref={svgRef} className="w-full h-full"></svg>
      
      {/* Legend */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10 border border-gray-200 max-w-xs">
        <div className="text-sm font-semibold text-gray-700 mb-2">Accessibility Status</div>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-xs text-gray-600">Clear</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-orange-500"></div>
            <span className="text-xs text-gray-600">Limited</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-xs text-gray-600">Blocked</span>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-2 mt-2">
          <div className="text-xs text-gray-600">
            <div className="flex items-center space-x-2 mb-1">
              <div className="w-3 h-3 border-2 border-amber-500 border-dashed bg-transparent rounded-full"></div>
              <span>10-mile radius bubble</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SituationalMap

