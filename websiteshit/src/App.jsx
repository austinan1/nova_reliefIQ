import React, { useState, useEffect } from 'react'
import './App.css'
import MapVisualization from './components/MapVisualization'
import InfoPanel from './components/InfoPanel'
import SummaryCards from './components/SummaryCards'
import NGOSelector from './components/NGOSelector'
import PriorityRecommendations from './components/PriorityRecommendations'
import { loadData } from './utils/dataLoader'

function App() {
  const [data, setData] = useState(null)
  const [selectedNGO, setSelectedNGO] = useState(null)
  const [selectedDistrict, setSelectedDistrict] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('Starting to load data...')
        const loadedData = await loadData()
        console.log('Data loaded successfully:', {
          ngos: loadedData.ngos?.length,
          districts: loadedData.districts?.length,
          ngoRegionScores: loadedData.ngoRegionScores?.length,
          hasGeojson: !!loadedData.geojson
        })
        setData(loadedData)
        
        // Set first NGO as default
        if (loadedData.ngos && loadedData.ngos.length > 0) {
          setSelectedNGO(loadedData.ngos[0])
        } else {
          console.warn('No NGOs found in loaded data')
        }
      } catch (err) {
        const errorMessage = err.message || 'Unknown error occurred'
        console.error('Error loading data:', err)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error Loading Data</h2>
        <p>{error}</p>
        <p>Please ensure all data files are in the correct location.</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="error-container">
        <h2>No Data Available</h2>
        <p>Unable to load dashboard data.</p>
      </div>
    )
  }

  // Get merged data for selected NGO
  const getMergedData = () => {
    if (!selectedNGO || !data.ngoRegionScores) return null
    
    const ngoScores = data.ngoRegionScores.filter(
      score => score.NGO === selectedNGO
    )
    
    return data.districts.map(district => {
      const score = ngoScores.find(s => 
        s.district.toLowerCase() === district.district.toLowerCase()
      )
      
      return {
        ...district,
        match: parseFloat(score?.match) || 0,
        urgency: parseFloat(score?.urgency) || 0,
        fitness_score: parseFloat(score?.fitness_score) || 0
      }
    })
  }

  const mergedData = getMergedData()
  const selectedDistrictData = selectedDistrict 
    ? mergedData?.find(d => 
        d.district.toLowerCase() === selectedDistrict.toLowerCase()
      )
    : null

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚨 ReliefIQ – Nepal Disaster Response Dashboard</h1>
      </header>

      <div className="app-content">
        <aside className="app-sidebar">
          <NGOSelector
            ngos={data.ngos || []}
            selectedNGO={selectedNGO}
            onSelectNGO={setSelectedNGO}
          />
          
          {selectedNGO && mergedData && (
            <PriorityRecommendations
              data={mergedData}
              selectedNGO={selectedNGO}
            />
          )}
        </aside>

        <main className="app-main">
          <SummaryCards
            data={mergedData || []}
            ngos={data.ngos || []}
            selectedNGO={selectedNGO}
          />

          <div className="map-container">
            {selectedNGO && mergedData && data.geojson && (
              <MapVisualization
                geojson={data.geojson}
                data={mergedData}
                selectedNGO={selectedNGO}
                onDistrictClick={setSelectedDistrict}
                selectedDistrict={selectedDistrict}
              />
            )}
          </div>
        </main>

        {selectedDistrictData && (
          <InfoPanel
            district={selectedDistrictData}
            selectedNGO={selectedNGO}
            ngoCapabilities={data.ngoCapabilities}
            onClose={() => setSelectedDistrict(null)}
          />
        )}
      </div>
    </div>
  )
}

export default App

