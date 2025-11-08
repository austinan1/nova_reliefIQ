import React from 'react'
import './NGOSelector.css'

const NGOSelector = ({ ngos, selectedNGO, onSelectNGO }) => {
  return (
    <div className="ngo-selector">
      <h3>🎯 Select NGO</h3>
      <select
        className="ngo-select"
        value={selectedNGO || ''}
        onChange={(e) => onSelectNGO(e.target.value)}
      >
        {ngos.map(ngo => (
          <option key={ngo} value={ngo}>
            {ngo}
          </option>
        ))}
      </select>
    </div>
  )
}

export default NGOSelector

