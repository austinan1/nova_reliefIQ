/**
 * Animation utilities for NGO movement visualization
 */
import * as d3 from 'd3'

/**
 * Get random district from GeoJSON features
 */
export const getRandomDistrict = (geojson) => {
  if (!geojson || !geojson.features || geojson.features.length === 0) return null
  const randomIndex = Math.floor(Math.random() * geojson.features.length)
  return geojson.features[randomIndex]
}

/**
 * Get district centroid coordinates
 */
export const getDistrictCentroid = (feature, projection) => {
  if (!feature || !projection) return null
  
  const path = d3.geoPath().projection(projection)
  const centroid = path.centroid(feature)
  
  if (centroid[0] > 0 && centroid[1] > 0) {
    return centroid
  }
  return null
}

/**
 * Get weighted random district based on urgency/damage
 */
export const getWeightedRandomDistrict = (geojson, districts, districtStates) => {
  if (!geojson || !geojson.features || geojson.features.length === 0) return null
  
  const normalizeName = (name) => {
    if (!name) return ''
    return String(name).trim().toLowerCase()
  }
  
  // Create map of district states
  const stateMap = new Map()
  if (districtStates) {
    districtStates.forEach(state => {
      stateMap.set(normalizeName(state.district), state)
    })
  }
  
  // Calculate weights based on urgency and damage
  const weightedFeatures = geojson.features.map(feature => {
    const props = feature.properties
    const normalizedName = normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
    const state = stateMap.get(normalizedName)
    
    // Weight: higher for lower recovery (more need)
    const recoveryScore = state ? state.recoveryScore : 0
    const needScore = 100 - recoveryScore
    
    // Base weight from damage/urgency if available
    let weight = needScore
    
    // Boost weight for districts with high urgency
    if (state && state.originalDamage) {
      weight += parseFloat(state.originalDamage) * 0.5
    }
    
    return { feature, weight: Math.max(1, weight) }
  })
  
  // Weighted random selection
  const totalWeight = weightedFeatures.reduce((sum, item) => sum + item.weight, 0)
  let random = Math.random() * totalWeight
  
  for (const item of weightedFeatures) {
    random -= item.weight
    if (random <= 0) {
      return item.feature
    }
  }
  
  // Fallback to first feature
  return geojson.features[0]
}

/**
 * Linear interpolation helper
 */
export const lerp = (start, end, t) => {
  return start + (end - start) * t
}

/**
 * Ease cubic in-out
 */
export const easeCubicInOut = (t) => {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2
}

