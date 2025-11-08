import * as d3 from 'd3'

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
    console.log(`Loading CSV from: ${path}`)
    const data = await d3.csv(path)
    console.log(`Loaded CSV ${path}:`, data.length, 'rows')
    return data
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
    console.log(`Loading GeoJSON from: ${path}`)
    const data = await d3.json(path)
    console.log(`Loaded GeoJSON ${path}:`, data.features?.length || 0, 'features')
    return data
  } catch (error) {
    console.error(`Error loading GeoJSON from ${path}:`, error)
    throw error
  }
}

/**
 * Load all data files and merge them
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
      loadCSV('/data/ngo_capabilities_converted.csv'),
      loadCSV('/data/pdna_district_damage.csv'),
      loadCSV('/data/population_density.csv'),
      loadCSV('/data/ngo_region_scores.csv')
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

/**
 * Get merged data for a specific NGO
 */
export const getMergedDataForNGO = (data, selectedNGO) => {
  if (!selectedNGO || !data.ngoRegionScores) return []

  const ngoScores = data.ngoRegionScores.filter(
    score => score.NGO === selectedNGO
  )

  return data.districts.map(district => {
    const score = ngoScores.find(s => 
      normalizeDistrictName(s.district) === district.district
    )

    return {
      district: district.district,
      match: parseFloat(score?.match) || 0,
      urgency: parseFloat(score?.urgency) || 0,
      fitness_score: parseFloat(score?.fitness_score) || 0,
      damage_pct: parseFloat(district.houses_destroyed_pct || district['houses_destroyed_pct']) || 0,
      population_density: parseFloat(district.pop_density || district['pop_density']) || 0,
      ngo: selectedNGO
    }
  })
}

