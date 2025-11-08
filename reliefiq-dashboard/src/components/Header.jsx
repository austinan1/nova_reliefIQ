import React from 'react'
import Select from 'react-select'

const Header = ({ ngos, selectedNGO, onSelectNGO }) => {
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
          <h1 className="text-3xl font-bold text-primary-600">
            🚨 ReliefIQ
          </h1>
          <span className="text-gray-500 text-sm">Nepal Disaster Response Dashboard</span>
        </div>
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Select NGO:</label>
          <Select
            options={options}
            value={options.find(opt => opt.value === selectedNGO)}
            onChange={(option) => onSelectNGO(option?.value || null)}
            styles={customStyles}
            placeholder="Choose an NGO..."
            isSearchable
          />
        </div>
      </div>
    </header>
  )
}

export default Header

