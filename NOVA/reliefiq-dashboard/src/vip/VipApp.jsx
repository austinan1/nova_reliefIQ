import React, { useState, useEffect } from 'react'
import { loadVIPData, getRegionNGOData, getNearbyNGOs, getNGOsForRegion } from './utils/dataLoader'
import RegionSelector from './components/RegionSelector'
import NGOSelector from './components/NGOSelector'
import MetricsPanel from './components/MetricsPanel'
import ToDoPanel from './components/ToDoPanel'
import ChatPanel from './components/ChatPanel'
import ImageAnalyzer from './components/ImageAnalyzer'
import SituationalMap from './components/SituationalMap'
import RealTimeMonitoring from './components/RealTimeMonitoring'
import DistrictGuidance from './components/DistrictGuidance'
import './styles/vip.css'

const VipApp = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [selectedNGO, setSelectedNGO] = useState(null)
  const [regionData, setRegionData] = useState(null)
  const [nearbyNGOs, setNearbyNGOs] = useState([])
  const [ongoingTasks, setOngoingTasks] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('[VIP] Loading data...')
        const loadedData = await loadVIPData()
        console.log('[VIP] Data loaded successfully:', {
          ngos: loadedData.ngos?.length,
          districts: loadedData.districts?.length,
          unifiedData: loadedData.unifiedData?.length,
          hasGeojson: !!loadedData.geojson
        })
        setData(loadedData)
      } catch (err) {
        const errorMessage = err.message || 'Unknown error occurred'
        console.error('[VIP] Error loading data:', err)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter NGOs based on selected region
  useEffect(() => {
    if (data && selectedRegion) {
      const availableNGOs = getNGOsForRegion(data, selectedRegion)
      
      // If currently selected NGO is not available for the new region, clear it
      if (selectedNGO && !availableNGOs.includes(selectedNGO)) {
        setSelectedNGO(null)
      }
    } else if (!selectedRegion) {
      // Clear NGO selection when region is cleared
      setSelectedNGO(null)
    }
  }, [data, selectedRegion])

  useEffect(() => {
    if (data && selectedRegion && selectedNGO) {
      const regionNGOData = getRegionNGOData(data, selectedRegion, selectedNGO)
      const nearby = getNearbyNGOs(data, selectedRegion)
      
      setRegionData(regionNGOData)
      setNearbyNGOs(nearby)
    } else {
      setRegionData(null)
      setNearbyNGOs([])
      setOngoingTasks([])
    }
  }, [data, selectedRegion, selectedNGO])

  const handleTasksUpdate = (tasks) => {
    setOngoingTasks(tasks || [])
  }

  if (loading) {
    return (
      <div className="vip-app h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading VIP dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="vip-app h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h2>
          <p className="text-gray-700 mb-4">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="vip-app h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Data Available</h2>
          <p className="text-gray-700">Unable to load dashboard data.</p>
        </div>
      </div>
    )
  }

  // Get list of regions (districts)
  const regions = data.unifiedData?.map(d => d.district) || []
  
  // Get NGOs available for the selected region (or all NGOs if no region selected)
  const availableNGOs = selectedRegion 
    ? getNGOsForRegion(data, selectedRegion)
    : (data.ngos || [])

  return (
    <div className="vip-app h-screen flex flex-col bg-gray-50 overflow-y-auto">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Volunteer Information Platform</h1>
            <p className="text-sm text-gray-600 mt-1">Operations Console & Situational Awareness</p>
          </div>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RegionSelector
            regions={regions}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
          />
          <NGOSelector
            ngos={availableNGOs}
            selectedNGO={selectedNGO}
            onSelectNGO={setSelectedNGO}
            disabled={!selectedRegion}
          />
        </div>
      </div>

      {/* Show blank state until both region and NGO are selected */}
      {!selectedRegion || !selectedNGO ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50 min-h-0">
          <div className="text-center max-w-md px-6">
            <div className="text-6xl mb-4">📍</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Select Region & NGO</h2>
            <p className="text-gray-600">
              Please select both a region and an NGO from the dropdowns above to view the operations console.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Metrics Panel */}
          {regionData && (
            <div className="px-6 py-4 bg-white border-b border-gray-200">
              <MetricsPanel
                metrics={regionData}
                nearbyNGOs={nearbyNGOs}
                ongoingTasks={ongoingTasks}
              />
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Left Column - To-Do Panel & Real-Time Monitoring */}
            <div className="lg:col-span-1 space-y-6">
              <div className="h-[500px]">
                <ToDoPanel
                  regionData={regionData}
                  ngo={selectedNGO}
                  onTasksUpdate={handleTasksUpdate}
                />
              </div>
              <div className="h-[500px]">
                <RealTimeMonitoring
                  selectedRegion={selectedRegion}
                  regionData={regionData}
                />
              </div>
            </div>

            {/* Middle Column - Map & District Guidance */}
            <div className="lg:col-span-1 space-y-6">
              <div className="h-[500px]">
                <div className="bg-white rounded-lg shadow-md p-4 h-full flex flex-col">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">Situational Awareness Map</h2>
                  <div className="flex-1 overflow-hidden">
                    <SituationalMap
                      geojson={data.geojson}
                      selectedRegion={selectedRegion}
                      regionData={regionData}
                      nearbyNGOs={nearbyNGOs}
                    />
                  </div>
                </div>
              </div>
              <div className="h-[500px]">
                <DistrictGuidance
                  regionData={regionData}
                  ngo={selectedNGO}
                  allData={data}
                />
              </div>
            </div>

            {/* Right Column - Chat & Image Analyzer */}
            <div className="lg:col-span-1 space-y-6">
              {/* Chat Panel */}
              <div className="h-[500px]">
                <ChatPanel
                  regionData={regionData}
                  ngo={selectedNGO}
                  metrics={regionData}
                  allData={data}
                />
              </div>

              {/* Image Analyzer */}
              <div className="h-[500px]">
                <ImageAnalyzer
                  regionData={regionData}
                  metrics={regionData}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VipApp

