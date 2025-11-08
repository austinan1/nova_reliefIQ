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
    console.log(`[VIP] Loading CSV from: ${path}`)
    const data = await d3.csv(path)
    console.log(`[VIP] Loaded CSV ${path}:`, data.length, 'rows')
    return data
  } catch (error) {
    console.error(`[VIP] Error loading CSV from ${path}:`, error)
    throw error
  }
}

/**
 * Load GeoJSON file
 */
const loadGeoJSON = async (path) => {
  try {
    console.log(`[VIP] Loading GeoJSON from: ${path}`)
    const data = await d3.json(path)
    console.log(`[VIP] Loaded GeoJSON ${path}:`, data.features?.length || 0, 'features')
    return data
  } catch (error) {
    console.error(`[VIP] Error loading GeoJSON from ${path}:`, error)
    throw error
  }
}

/**
 * Load all data files and merge them into unified structure
 */
export const loadVIPData = async () => {
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

    // Get unique NGOs from ngo_capabilities
    const ngos = [...new Set(ngoCapabilities.map(n => n.NGO))].filter(Boolean).sort()

    // Get unique districts
    const districts = [...new Set(districtDamage.map(d => d.district))].sort()

    // Merge district damage and population data
    const mergedDistricts = districtDamage.map(damage => {
      const pop = populationDensity.find(p => 
        normalizeDistrictName(p.district) === damage.district
      )
      return {
        district: damage.district,
        damage_pct: parseFloat(damage.houses_destroyed_pct || damage['houses_destroyed_pct']) || 0,
        population_density: pop ? parseFloat(pop.pop_density) || 0 : 0
      }
    })

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

    // Create unified data structure
    const unifiedData = mergedDistricts.map(district => {
      // Find all NGOs that have scores for this district
      const ngoMatches = ngoRegionScores
        .filter(score => normalizeDistrictName(score.district) === district.district)
        .map(score => ({
          ngo: score.NGO,
          match: parseFloat(score.match) || 0,
          urgency: parseFloat(score.urgency) || 0,
          fitness_score: parseFloat(score.fitness_score) || 0
        }))

      // Get the best match score for this district
      const bestMatch = ngoMatches.length > 0 
        ? ngoMatches.reduce((best, current) => 
            current.match > best.match ? current : best
          )
        : null

      // Normalize urgency to 0-100 scale if needed
      const urgencyRaw = bestMatch ? bestMatch.urgency : 0
      const urgency = urgencyRaw <= 1 ? urgencyRaw * 100 : urgencyRaw

      return {
        district: district.district,
        damage_pct: district.damage_pct,
        urgency,
        population_density: district.population_density,
        ngo_matches: ngoMatches,
        best_match: bestMatch
      }
    })

    return {
      ngoCapabilities,
      districts: mergedDistricts,
      populationDensity,
      ngoRegionScores,
      geojson,
      ngos,
      unifiedData
    }
  } catch (error) {
    console.error('[VIP] Error loading data:', error)
    throw new Error(`Failed to load VIP data: ${error.message}`)
  }
}

/**
 * Get data for a specific region and NGO
 */
export const getRegionNGOData = (data, region, ngo) => {
  if (!data || !region || !ngo) return null

  const normalizedRegion = normalizeDistrictName(region)
  const districtData = data.unifiedData?.find(d => 
    normalizeDistrictName(d.district) === normalizedRegion
  )

  if (!districtData) return null

      // Find the specific NGO match for this region
      const ngoMatch = districtData.ngo_matches?.find(m => 
        m.ngo === ngo
      )

      // Normalize urgency to 0-100 scale (in case it's 0-1)
      const urgencyRaw = ngoMatch?.urgency || districtData.urgency || 0
      const urgency = urgencyRaw <= 1 ? urgencyRaw * 100 : urgencyRaw

      // Normalize match/coverage to 0-100 scale if needed
      const ngoCoverageRaw = ngoMatch?.match || 0
      const ngoCoverage = ngoCoverageRaw <= 1 ? ngoCoverageRaw * 100 : ngoCoverageRaw

      // Calculate accessibility (mock based on damage and urgency)
      // Green = clear, Orange = limited, Red = blocked
      const accessibilityScore = districtData.damage_pct * 0.6 + urgency * 0.4
      let accessibility = 'green'
      if (accessibilityScore > 70) {
        accessibility = 'red'
      } else if (accessibilityScore > 40) {
        accessibility = 'orange'
      }

      // Health facility status (mock based on damage)
      const healthStatus = districtData.damage_pct > 50 ? 'critical' : 
                           districtData.damage_pct > 25 ? 'limited' : 'operational'

      return {
        district: districtData.district,
        damage_pct: districtData.damage_pct,
        urgency,
        population_density: districtData.population_density,
        ngo_coverage: ngoCoverage,
        accessibility,
        health_status: healthStatus,
        ngo_match: ngoMatch
      }
}

/**
 * Get NGOs available for a specific region (NGOs that have data/scores for this region)
 */
export const getNGOsForRegion = (data, region) => {
  if (!data || !region) return []

  const normalizedRegion = normalizeDistrictName(region)
  const districtData = data.unifiedData?.find(d => 
    normalizeDistrictName(d.district) === normalizedRegion
  )

  if (!districtData || !districtData.ngo_matches) return []

  // Return list of NGO names that have scores for this region
  return districtData.ngo_matches.map(match => match.ngo).filter(Boolean)
}

/**
 * Get nearby NGOs for a region (within 10-mile radius - simplified)
 */
export const getNearbyNGOs = (data, region) => {
  if (!data || !region) return []

  const normalizedRegion = normalizeDistrictName(region)
  const districtData = data.unifiedData?.find(d => 
    normalizeDistrictName(d.district) === normalizedRegion
  )

  if (!districtData) return []

  // Return all NGOs that have scores for this region
  return districtData.ngo_matches?.map(match => {
    // Normalize values to 0-100 scale if needed
    const urgencyRaw = match.urgency || 0
    const urgency = urgencyRaw <= 1 ? urgencyRaw * 100 : urgencyRaw
    const matchScoreRaw = match.match || 0
    const matchScore = matchScoreRaw <= 1 ? matchScoreRaw * 100 : matchScoreRaw

    return {
      name: match.ngo,
      match_score: matchScore,
      urgency,
      fitness_score: match.fitness_score,
      contact: `contact@${match.ngo.toLowerCase().replace(/\s+/g, '')}.org` // Mock contact
    }
  }) || []
}

/**
 * Get district coordinates from GeoJSON for map centering
 */
export const getDistrictCoordinates = (geojson, district) => {
  if (!geojson || !district) return null

  const normalizedDistrict = normalizeDistrictName(district)
  const feature = geojson.features?.find(f => {
    const props = f.properties
    const normalizedName = props.normalized_name || 
      normalizeDistrictName(props.NAME || props.DISTRICT || props.name || props.district || '')
    return normalizedName === normalizedDistrict
  })

  if (!feature || !feature.geometry) return null

  // Calculate centroid
  const path = d3.geoPath()
  const bounds = path.bounds(feature)
  const x = (bounds[0][0] + bounds[1][0]) / 2
  const y = (bounds[0][1] + bounds[1][1]) / 2

  // Convert to lat/lon (approximate for Nepal)
  // This is a simplified conversion - in production, use proper projection
  const projection = d3.geoMercator()
    .center([86.4240, 26.3949])
    .scale(3500)

  const [lon, lat] = projection.invert([x, y])

  return { lat, lon }
}

