import React from 'react'
import Select from 'react-select'

const NGOSelector = ({ ngos, selectedNGO, onSelectNGO, disabled = false }) => {
  const options = ngos.map(ngo => ({
    value: ngo,
    label: ngo
  }))

  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: disabled ? '#f3f4f6' : 'white',
      borderColor: disabled ? '#d1d5db' : '#e5e7eb',
      borderRadius: '0.5rem',
      minHeight: '44px',
      boxShadow: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      '&:hover': {
        borderColor: disabled ? '#d1d5db' : '#2563eb'
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
        Select NGO
        {disabled && (
          <span className="text-xs text-gray-500 font-normal ml-2">(Select a region first)</span>
        )}
      </label>
      <Select
        value={selectedNGO ? {
          value: selectedNGO,
          label: selectedNGO
        } : null}
        onChange={(option) => onSelectNGO(option?.value || null)}
        options={options}
        placeholder={disabled ? "Select a region first..." : "Search and select an NGO..."}
        isSearchable
        isClearable
        isDisabled={disabled}
        styles={customStyles}
        className="react-select-container"
        classNamePrefix="react-select"
      />
      {!disabled && ngos.length === 0 && (
        <p className="text-xs text-gray-500 mt-1">No NGOs available for the selected region</p>
      )}
    </div>
  )
}

export default NGOSelector

