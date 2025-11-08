import React from 'react'
import Select from 'react-select'

const Header = ({ ngos, selectedNGO, onSelectNGO, currentPage, onPageChange, platform, onPlatformChange }) => {
  const options = ngos.map(ngo => ({
    value: ngo,
    label: ngo
  }))

  const customStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: 'white',
      borderColor: '#e5e7eb',
      borderRadius: '0.5rem',
      minWidth: '300px',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      '&:hover': {
        borderColor: '#3b82f6'
      }
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? '#3b82f6'
        : state.isFocused
        ? '#eff6ff'
        : 'white',
      color: state.isSelected ? 'white' : '#1f2937',
      '&:hover': {
        backgroundColor: state.isSelected ? '#3b82f6' : '#eff6ff'
      }
    })
  }

  return (
    <header className="bg-white shadow-lg border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img 
            src="/logo.png" 
            alt="ReliefIQ Logo" 
            className="h-12 w-auto"
          />
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-primary-600">
              ReliefIQ
            </h1>
            <span className="text-gray-500 text-sm">Nepal Disaster Response Dashboard</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {/* Navigation Buttons - only show in standard platform */}
          {platform === 'standard' && (
            <>
              <div className="flex space-x-2">
                <button
                  onClick={() => onPageChange('dashboard')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    currentPage === 'dashboard'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📊 NGO Dashboard
                </button>
                <button
                  onClick={() => onPageChange('summary')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    currentPage === 'summary'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📋 All Efforts Summary
                </button>
              </div>
              {currentPage === 'dashboard' && (
                <>
                  <label className="text-sm font-medium text-gray-700">Select NGO:</label>
                  <Select
                    options={options}
                    value={options.find(opt => opt.value === selectedNGO)}
                    onChange={(option) => onSelectNGO(option?.value || null)}
                    styles={customStyles}
                    placeholder="Choose an NGO..."
                    isSearchable
                  />
                </>
              )}
            </>
          )}
          
          {/* Platform Toggle Switch - Top Right */}
          <div className="flex items-center space-x-3 border-l border-gray-300 pl-4">
            <span className={`text-sm font-medium ${platform === 'standard' ? 'text-gray-700' : 'text-gray-400'}`}>
              RAM
            </span>
            <button
              onClick={() => onPlatformChange(platform === 'standard' ? 'vip' : 'standard')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                platform === 'vip' ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  platform === 'vip' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${platform === 'vip' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
              VIP
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header

