import React from 'react'
import Select from 'react-select'
import { capitalizeDistrictName } from '../utils/formatUtils'

const RegionSelector = ({ regions, selectedRegion, onSelectRegion }) => {
  const options = regions.map(region => ({
    value: region,
    label: capitalizeDistrictName(region)
  }))

  const customStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: 'white',
      borderColor: '#e5e7eb',
      borderRadius: '0.5rem',
      minHeight: '44px',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#2563eb'
      }
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? '#2563eb'
        : state.isFocused
        ? '#eff6ff'
        : 'white',
      color: state.isSelected ? 'white' : '#1f2937',
      cursor: 'pointer'
    }),
    menu: (provided) => ({
      ...provided,
      borderRadius: '0.5rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
    })
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Select Region
      </label>
      <Select
        value={selectedRegion ? {
          value: selectedRegion,
          label: capitalizeDistrictName(selectedRegion)
        } : null}
        onChange={(option) => onSelectRegion(option?.value || null)}
        options={options}
        placeholder="Search and select a region..."
        isSearchable
        isClearable
        styles={customStyles}
        className="react-select-container"
        classNamePrefix="react-select"
      />
    </div>
  )
}

export default RegionSelector

