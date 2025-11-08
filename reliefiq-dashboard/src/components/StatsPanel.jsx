import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const StatsPanel = ({ data, selectedNGO }) => {
  const chartRef = useRef(null)

  useEffect(() => {
    if (!data || data.length === 0 || !chartRef.current) return

    // Clear previous chart
    d3.select(chartRef.current).selectAll('*').remove()

    const width = 300
    const height = 150
    const margin = { top: 20, right: 20, bottom: 30, left: 40 }

    const svg = d3.select(chartRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Get top 5 districts by urgency
    const topDistricts = [...data]
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, 5)

    const xScale = d3.scaleBand()
      .domain(topDistricts.map(d => d.district.substring(0, 10)))
      .range([0, width - margin.left - margin.right])
      .padding(0.2)

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(topDistricts, d => d.urgency)])
      .nice()
      .range([height - margin.top - margin.bottom, 0])

    // Add bars
    g.selectAll('.bar')
      .data(topDistricts)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.district.substring(0, 10)))
      .attr('y', d => yScale(d.urgency))
      .attr('width', xScale.bandwidth())
      .attr('height', d => height - margin.top - margin.bottom - yScale(d.urgency))
      .attr('fill', '#3b82f6')
      .attr('opacity', 0.8)

    // Add x-axis
    g.append('g')
      .attr('transform', `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('font-size', '10px')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')

    // Add y-axis
    g.append('g')
      .call(d3.axisLeft(yScale))

    // Add title
    g.append('text')
      .attr('x', (width - margin.left - margin.right) / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Top 5 Districts by Urgency')
  }, [data])

  if (!data || data.length === 0) return null

  const totalNGOs = 1 // Current selected NGO
  const totalDistricts = data.length
  const avgDamage = data.reduce((sum, d) => sum + d.damage_pct, 0) / totalDistricts
  const avgUrgency = data.reduce((sum, d) => sum + d.urgency, 0) / totalDistricts
  const highestUrgency = data.reduce((max, d) => 
    d.urgency > max.urgency ? d : max, data[0]
  )

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Dashboard Overview</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-600">
          <div className="text-sm text-gray-600">Total Districts</div>
          <div className="text-2xl font-bold text-blue-600">{totalDistricts}</div>
        </div>
        
        <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-600">
          <div className="text-sm text-gray-600">Avg Damage %</div>
          <div className="text-2xl font-bold text-red-600">{avgDamage.toFixed(1)}%</div>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-600">
          <div className="text-sm text-gray-600">Avg Urgency</div>
          <div className="text-2xl font-bold text-yellow-600">{avgUrgency.toFixed(1)}</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-600">
          <div className="text-sm text-gray-600">Highest Urgency</div>
          <div className="text-lg font-bold text-purple-600">
            {highestUrgency.district.substring(0, 15)}...
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div ref={chartRef}></div>
      </div>
    </div>
  )
}

export default StatsPanel

