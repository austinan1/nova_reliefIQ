import React, { useState, useEffect } from 'react'
import { loadData, getMergedDataForNGO } from './utils/dataLoader'
import Header from './components/Header'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import TopRegionsSummary from './components/TopRegionsSummary'
import ChatAssistant from './components/ChatAssistant'
import AllEffortsSummary from './components/AllEffortsSummary'
import VIPView from './components/VIPView'
import './styles/global.css'

function App() {
  const [data, setData] = useState(null)
  const [selectedNGO, setSelectedNGO] = useState(null)
  const [selectedDistrict, setSelectedDistrict] = useState(null)
  const [mergedData, setMergedData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState('dashboard') // 'dashboard' or 'summary'
  const [platform, setPlatform] = useState('standard') // 'standard' or 'vip'

  console.log('App rendering - loading:', loading, 'error:', error, 'data:', !!data)

  // Simple test to see if React is rendering
  if (typeof window !== 'undefined') {
    console.log('Window object exists, React is working')
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('Loading data...')
        const loadedData = await loadData()
        console.log('Data loaded successfully:', {
          ngos: loadedData.ngos?.length,
          districts: loadedData.districts?.length,
          ngoRegionScores: loadedData.ngoRegionScores?.length,
          hasGeojson: !!loadedData.geojson,
          geojsonFeatures: loadedData.geojson?.features?.length
        })
        setData(loadedData)
        
        // Set first NGO as default
        if (loadedData.ngos && loadedData.ngos.length > 0) {
          console.log('Setting default NGO:', loadedData.ngos[0])
          setSelectedNGO(loadedData.ngos[0])
        } else {
          console.warn('No NGOs found in loaded data')
        }
      } catch (err) {
        const errorMessage = err.message || 'Unknown error occurred'
        console.error('Error loading data:', err)
        console.error('Error stack:', err.stack)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (data && selectedNGO) {
      console.log('Merging data for NGO:', selectedNGO)
      const merged = getMergedDataForNGO(data, selectedNGO)
      console.log('Merged data:', merged.length, 'districts')
      setMergedData(merged)
    }
  }, [data, selectedNGO])

  // If VIP platform is selected, show VIP view (doesn't need data to load)
  if (platform === 'vip') {
    return (
      <div className="app h-screen flex flex-col">
        <Header
          ngos={data?.ngos || []}
          selectedNGO={selectedNGO}
          onSelectNGO={setSelectedNGO}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          platform={platform}
          onPlatformChange={setPlatform}
        />
        <VIPView />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="app h-screen flex flex-col bg-gray-50">
        <Header
          ngos={[]}
          selectedNGO={null}
          onSelectNGO={setSelectedNGO}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          platform={platform}
          onPlatformChange={setPlatform}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading dashboard data...</p>
            <p className="text-gray-500 text-sm mt-2">Please wait while we load the data files...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app h-screen flex flex-col bg-gray-50">
        <Header
          ngos={[]}
          selectedNGO={null}
          onSelectNGO={setSelectedNGO}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          platform={platform}
          onPlatformChange={setPlatform}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h2>
            <p className="text-gray-700 mb-4">{error}</p>
            <p className="text-sm text-gray-500">Please ensure all data files are in the correct location.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="app h-screen flex flex-col bg-gray-50">
        <Header
          ngos={[]}
          selectedNGO={null}
          onSelectNGO={setSelectedNGO}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          platform={platform}
          onPlatformChange={setPlatform}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Data Available</h2>
            <p className="text-gray-700">Unable to load dashboard data.</p>
          </div>
        </div>
      </div>
    )
  }

  const selectedDistrictData = selectedDistrict 
    ? mergedData.find(d => 
        d.district.toLowerCase() === selectedDistrict.district.toLowerCase()
      )
    : null

  return (
    <div className="app h-screen flex flex-col bg-gray-50">
      <Header
        ngos={data.ngos || []}
        selectedNGO={selectedNGO}
        onSelectNGO={setSelectedNGO}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        platform={platform}
        onPlatformChange={setPlatform}
      />
      
      {currentPage === 'dashboard' ? (
        <>
          <div className="flex-1 flex overflow-hidden">
            {/* Left Side - Map */}
            <div className="flex-1 p-4">
              <MapView
                geojson={data.geojson}
                data={mergedData}
                selectedNGO={selectedNGO}
                onDistrictClick={setSelectedDistrict}
                selectedDistrict={selectedDistrict}
              />
            </div>

            {/* Right Side - Top 5 Best Fit Regions Summary */}
            <div className="w-[600px] border-l border-gray-200 p-4 bg-gray-50">
              <TopRegionsSummary
                data={mergedData}
                selectedNGO={selectedNGO}
                onDistrictClick={setSelectedDistrict}
              />
            </div>

            {/* District Details Sidebar (overlay) */}
            {selectedDistrictData && (
              <Sidebar
                district={selectedDistrictData.district}
                districtData={selectedDistrictData}
                selectedNGO={selectedNGO}
                onClose={() => setSelectedDistrict(null)}
                isOpen={!!selectedDistrict}
                geojson={data.geojson}
              />
            )}
          </div>

          {/* Chat Assistant */}
          <ChatAssistant
            selectedNGO={selectedNGO}
            mergedData={mergedData}
          />
        </>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <AllEffortsSummary
            ngoRegionScores={data.ngoRegionScores || []}
            districts={data.districts || []}
            ngos={data.ngos || []}
            geojson={data.geojson}
          />
        </div>
      )}
    </div>
  )
}

export default App

