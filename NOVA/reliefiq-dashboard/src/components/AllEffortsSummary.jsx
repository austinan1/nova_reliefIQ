import React, { useMemo } from 'react'
import RecoveryTimeline from './RecoveryTimeline'

const AllEffortsSummary = ({ ngoRegionScores, districts, ngos, geojson }) => {
  // Calculate summary statistics - optimized to prevent blocking
  const summaryStats = useMemo(() => {
    if (!ngoRegionScores || ngoRegionScores.length === 0) return null

    // Use early returns and efficient calculations
    const totalPairs = ngoRegionScores.length
    if (totalPairs === 0) return null

    // Use Set for O(1) lookups
    const uniqueNGOs = new Set()
    const uniqueDistricts = new Set()
    
    let sumMatch = 0
    let sumUrgency = 0
    let sumFitness = 0

    // Single pass through data
    for (let i = 0; i < ngoRegionScores.length; i++) {
      const score = ngoRegionScores[i]
      uniqueNGOs.add(score.NGO)
      uniqueDistricts.add(score.district)
      sumMatch += parseFloat(score.match || 0)
      sumUrgency += parseFloat(score.urgency || 0)
      sumFitness += parseFloat(score.fitness_score || 0)
    }

    const avgMatch = sumMatch / totalPairs
    const avgUrgency = sumUrgency / totalPairs
    const avgFitness = sumFitness / totalPairs

    // Coverage per district (how many NGOs are assigned to each district)
    const districtCoverage = {}
    for (let i = 0; i < ngoRegionScores.length; i++) {
      const score = ngoRegionScores[i]
      const district = score.district.toLowerCase()
      if (!districtCoverage[district]) {
        districtCoverage[district] = {
          district: score.district,
          ngoCount: 0,
          avgMatch: 0,
          avgUrgency: 0,
          avgFitness: 0,
          maxFitness: 0,
          bestNGO: null
        }
      }
      districtCoverage[district].ngoCount++
      const match = parseFloat(score.match || 0)
      const urgency = parseFloat(score.urgency || 0)
      const fitness = parseFloat(score.fitness_score || 0)
      districtCoverage[district].avgMatch += match
      districtCoverage[district].avgUrgency += urgency
      districtCoverage[district].avgFitness += fitness
      if (fitness > districtCoverage[district].maxFitness) {
        districtCoverage[district].maxFitness = fitness
        districtCoverage[district].bestNGO = score.NGO
      }
    }

    // Calculate averages for each district
    Object.values(districtCoverage).forEach(d => {
      d.avgMatch = d.avgMatch / d.ngoCount
      d.avgUrgency = d.avgUrgency / d.ngoCount
      d.avgFitness = d.avgFitness / d.ngoCount
    })

    // Coverage per NGO (how many districts each NGO covers)
    const ngoCoverage = {}
    for (let i = 0; i < ngoRegionScores.length; i++) {
      const score = ngoRegionScores[i]
      const ngo = score.NGO
      if (!ngoCoverage[ngo]) {
        ngoCoverage[ngo] = {
          ngo: ngo,
          districtCount: 0,
          avgMatch: 0,
          avgUrgency: 0,
          avgFitness: 0,
          topDistricts: []
        }
      }
      ngoCoverage[ngo].districtCount++
      const match = parseFloat(score.match || 0)
      const urgency = parseFloat(score.urgency || 0)
      const fitness = parseFloat(score.fitness_score || 0)
      ngoCoverage[ngo].avgMatch += match
      ngoCoverage[ngo].avgUrgency += urgency
      ngoCoverage[ngo].avgFitness += fitness
      ngoCoverage[ngo].topDistricts.push({
        district: score.district,
        fitness: fitness,
        match: match,
        urgency: urgency
      })
    }

    // Calculate averages and sort top districts for each NGO
    Object.values(ngoCoverage).forEach(n => {
      n.avgMatch = n.avgMatch / n.districtCount
      n.avgUrgency = n.avgUrgency / n.districtCount
      n.avgFitness = n.avgFitness / n.districtCount
      n.topDistricts = n.topDistricts
        .sort((a, b) => b.fitness - a.fitness)
        .slice(0, 5)
    })

    // Find districts with most/least coverage
    const districtCoverageArray = Object.values(districtCoverage)
      .sort((a, b) => b.ngoCount - a.ngoCount)
    const mostCoveredDistricts = districtCoverageArray.slice(0, 10)
    const leastCoveredDistricts = districtCoverageArray.slice(-10).reverse()

    // Find NGOs with most/least coverage
    const ngoCoverageArray = Object.values(ngoCoverage)
      .sort((a, b) => b.districtCount - a.districtCount)
    const mostActiveNGOs = ngoCoverageArray.slice(0, 10)
    const leastActiveNGOs = ngoCoverageArray.slice(-10).reverse()

    return {
      totalPairs,
      uniqueNGOs,
      uniqueDistricts,
      avgMatch,
      avgUrgency,
      avgFitness,
      districtCoverage: districtCoverageArray,
      ngoCoverage: ngoCoverageArray,
      mostCoveredDistricts,
      leastCoveredDistricts,
      mostActiveNGOs,
      leastActiveNGOs
    }
  }, [ngoRegionScores])

  if (!summaryStats) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Loading summary data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-3xl font-bold text-primary-600 mb-2">
            📊 Complete Relief Efforts Summary
          </h2>
          <p className="text-gray-600">
            Overview of all NGO-district assignments and coverage
          </p>
        </div>

        {/* 5-Year Recovery Timeline Simulation - Lazy loaded */}
        {geojson && districts && ngoRegionScores && (
          <RecoveryTimeline
            geojson={geojson}
            districts={districts}
            ngoRegionScores={ngoRegionScores}
          />
        )}

        {/* Overall Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">
              {summaryStats.totalPairs.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">
              Total Pairs
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">
              {summaryStats.uniqueNGOs}
            </div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">
              Total NGOs
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">
              {summaryStats.uniqueDistricts}
            </div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">
              Districts
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {summaryStats.avgMatch.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">
              Avg Match
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {summaryStats.avgUrgency.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">
              Avg Urgency
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">
              {summaryStats.avgFitness.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">
              Avg Fitness
            </div>
          </div>
        </div>

        {/* District Coverage Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-2xl font-bold text-primary-600 mb-2 pb-2 border-b-2 border-primary-600">
            📍 District Coverage Analysis
          </h3>
          <p className="text-gray-600 mb-6">
            Shows how many NGOs are assigned to each district and the average scores
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Most Covered Districts */}
            <div>
              <h4 className="text-xl font-semibold text-green-600 mb-4 pb-2 border-b border-gray-200">
                Most Covered Districts (Top 10)
              </h4>
              <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-primary-600 text-white sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">District</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">NGOs</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Avg Match</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Avg Urgency</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Avg Fitness</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Best NGO</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summaryStats.mostCoveredDistricts.map((d, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-green-600">{d.district}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{d.ngoCount}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{d.avgMatch.toFixed(1)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{d.avgUrgency.toFixed(1)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{d.avgFitness.toFixed(1)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-primary-600">{d.bestNGO}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Least Covered Districts */}
            <div>
              <h4 className="text-xl font-semibold text-red-600 mb-4 pb-2 border-b border-gray-200">
                Least Covered Districts (Bottom 10)
              </h4>
              <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-red-600 text-white sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">District</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">NGOs</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Avg Match</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Avg Urgency</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Avg Fitness</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Best NGO</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summaryStats.leastCoveredDistricts.map((d, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-red-600">{d.district}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{d.ngoCount}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{d.avgMatch.toFixed(1)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{d.avgUrgency.toFixed(1)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{d.avgFitness.toFixed(1)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-primary-600">{d.bestNGO}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* NGO Coverage Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-2xl font-bold text-primary-600 mb-2 pb-2 border-b-2 border-primary-600">
            🏢 NGO Coverage Analysis
          </h3>
          <p className="text-gray-600 mb-6">
            Shows how many districts each NGO is assigned to and their average performance
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Most Active NGOs */}
            <div>
              <h4 className="text-xl font-semibold text-green-600 mb-4 pb-2 border-b border-gray-200">
                Most Active NGOs (Top 10)
              </h4>
              <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-primary-600 text-white sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">NGO</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Districts</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Avg Match</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Avg Urgency</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Avg Fitness</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Top District</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summaryStats.mostActiveNGOs.map((n, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-primary-600">{n.ngo}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{n.districtCount}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{n.avgMatch.toFixed(1)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{n.avgUrgency.toFixed(1)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{n.avgFitness.toFixed(1)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {n.topDistricts[0]?.district || 'N/A'} 
                          <span className="text-gray-500"> ({n.topDistricts[0]?.fitness.toFixed(1) || 0})</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Least Active NGOs */}
            <div>
              <h4 className="text-xl font-semibold text-orange-600 mb-4 pb-2 border-b border-gray-200">
                Least Active NGOs (Bottom 10)
              </h4>
              <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-orange-600 text-white sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">NGO</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Districts</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Avg Match</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Avg Urgency</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Avg Fitness</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Top District</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summaryStats.leastActiveNGOs.map((n, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-primary-600">{n.ngo}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{n.districtCount}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{n.avgMatch.toFixed(1)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{n.avgUrgency.toFixed(1)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{n.avgFitness.toFixed(1)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {n.topDistricts[0]?.district || 'N/A'} 
                          <span className="text-gray-500"> ({n.topDistricts[0]?.fitness.toFixed(1) || 0})</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Complete Data Table */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-2xl font-bold text-primary-600 mb-2 pb-2 border-b-2 border-primary-600">
            📋 Complete NGO-District Assignment Matrix
          </h3>
          <p className="text-gray-600 mb-4">
            Full list of all {summaryStats.totalPairs.toLocaleString()} NGO-district pairs with scores
          </p>
          <div className="overflow-x-auto max-h-[800px] overflow-y-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-primary-600 text-white sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">NGO</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">District</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Match Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Urgency</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Fitness Score</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ngoRegionScores
                  .sort((a, b) => parseFloat(b.fitness_score || 0) - parseFloat(a.fitness_score || 0))
                  .map((score, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 even:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap font-medium text-primary-600">{score.NGO}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-green-600">{score.district}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{parseFloat(score.match || 0).toFixed(1)}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{parseFloat(score.urgency || 0).toFixed(1)}</td>
                      <td className="px-4 py-2 whitespace-nowrap font-semibold text-red-600">
                        {parseFloat(score.fitness_score || 0).toFixed(1)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AllEffortsSummary

