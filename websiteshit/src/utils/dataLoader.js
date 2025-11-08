import Papa from 'papaparse'

/**
 * Normalize district name for matching
 */
export const normalizeDistrictName = (name) => {
  if (!name) return ''
  return String(name).trim().toLowerCase()
}

/**
 * Load CSV file
 */
const loadCSV = async (path) => {
  try {
    const response = await fetch(path)
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`)
    }
    const text = await response.text()
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            console.warn(`CSV parsing warnings for ${path}:`, results.errors)
          }
          resolve(results.data)
        },
        error: (error) => {
          reject(new Error(`Failed to parse CSV ${path}: ${error.message}`))
        }
      })
    })
  } catch (error) {
    console.error(`Error loading CSV from ${path}:`, error)
    throw error
  }
}

/**
 * Load GeoJSON file
 */
const loadGeoJSON = async (path) => {
  try {
    const response = await fetch(path)
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`)
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Error loading GeoJSON from ${path}:`, error)
    throw error
  }
}

/**
 * Load all data files
 */
export const loadData = async () => {
  try {
    // Load all CSV files in parallel
    const [
      ngoCapabilities,
      districtDamage,
      populationDensity,
      ngoRegionScores
    ] = await Promise.all([
      loadCSV('/data/input/ngo_capabilities.csv'),
      loadCSV('/data/input/pdna_district_damage.csv'),
      loadCSV('/data/input/population_density.csv'),
      loadCSV('/data/output/ngo_region_scores.csv')
    ])

    // Load GeoJSON
    const geojson = await loadGeoJSON('/data/nepal-districts.geojson')

    // Normalize district names
    districtDamage.forEach(d => {
      d.district = normalizeDistrictName(d.district)
    })

    populationDensity.forEach(d => {
      d.district = normalizeDistrictName(d.district)
    })

    ngoRegionScores.forEach(d => {
      d.district = normalizeDistrictName(d.district)
      d.NGO = String(d.NGO).trim()
    })

    // Merge district damage and population data
    const districts = districtDamage.map(damage => {
      const pop = populationDensity.find(p => 
        normalizeDistrictName(p.district) === damage.district
      )
      return {
        ...damage,
        pop_density: pop ? parseFloat(pop.pop_density) || 0 : 0
      }
    })

    // Get unique NGOs from ngo_capabilities
    const ngos = [...new Set(ngoCapabilities.map(n => n.NGO))].filter(Boolean).sort()

    // Normalize GeoJSON district names
    if (geojson.features) {
      geojson.features.forEach(feature => {
        const props = feature.properties
        // Try different possible property names
        if (props.NAME) {
          props.normalized_name = normalizeDistrictName(props.NAME)
        } else if (props.DISTRICT) {
          props.normalized_name = normalizeDistrictName(props.DISTRICT)
        } else if (props.name) {
          props.normalized_name = normalizeDistrictName(props.name)
        } else if (props.district) {
          props.normalized_name = normalizeDistrictName(props.district)
        }
      })
    }

    return {
      ngoCapabilities,
      districts,
      populationDensity,
      ngoRegionScores,
      geojson,
      ngos
    }
  } catch (error) {
    console.error('Error loading data:', error)
    throw new Error(`Failed to load data: ${error.message}`)
  }
}

