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
      background: '#ffffff',
      borderColor: '#e2e8f0',
      borderRadius: '8px',
      minWidth: '300px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        borderColor: '#cbd5e1',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)'
      }
    }),
    option: (provided, state) => ({
      ...provided,
      background: state.isSelected
        ? '#0ea5e9'
        : state.isFocused
        ? '#f1f5f9'
        : 'transparent',
      color: state.isSelected ? 'white' : '#0f172a',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        background: state.isSelected 
          ? '#0ea5e9'
          : '#f1f5f9'
      }
    })
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img 
            src="/logo.png" 
            alt="ReliefIQ Logo" 
            className="h-10 w-auto"
          />
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              ReliefIQ
            </h1>
            <span className="text-sm text-gray-500 font-normal">Nepal Disaster Response Dashboard</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {/* Navigation Buttons - only show in standard platform */}
          {platform === 'standard' && (
            <>
              <div className="flex space-x-2">
                <button
                  onClick={() => onPageChange('dashboard')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentPage === 'dashboard'
                      ? 'bg-primary-500 text-white shadow-medical-button'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => onPageChange('summary')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentPage === 'summary'
                      ? 'bg-primary-500 text-white shadow-medical-button'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  Summary
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
          <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
            <span className={`text-sm font-medium ${platform === 'standard' ? 'text-gray-700' : 'text-gray-400'}`}>
              RAM
            </span>
            <button
              onClick={() => onPlatformChange(platform === 'standard' ? 'vip' : 'standard')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                platform === 'vip' 
                  ? 'bg-primary-500' 
                  : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  platform === 'vip' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${platform === 'vip' ? 'text-primary-600 font-semibold' : 'text-gray-400'}`}>
              VIP
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header

