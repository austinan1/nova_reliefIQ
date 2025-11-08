import * as d3 from 'd3'

/**
 * Create color scale for match scores
 * Red (poor) -> Yellow -> Green (good) -> Blue (best)
 */
export const createMatchColorScale = (domain = [0, 100]) => {
  // Custom color interpolator: Red -> Yellow -> Green -> Blue
  const customColorScale = (value) => {
    const normalized = (value - domain[0]) / (domain[1] - domain[0])
    
    if (normalized <= 0.33) {
      // Red to Yellow (0-33)
      return d3.interpolateReds(normalized / 0.33)
    } else if (normalized <= 0.66) {
      // Yellow to Green (33-66)
      return d3.interpolateYlGn((normalized - 0.33) / 0.33)
    } else {
      // Green to Blue (66-100)
      return d3.interpolateGnBu((normalized - 0.66) / 0.34)
    }
  }

  return customColorScale
}

/**
 * Create color scale for urgency scores
 */
export const createUrgencyColorScale = (domain = [0, 100]) => {
  return d3.scaleSequential()
    .domain(domain)
    .interpolator(d3.interpolateReds)
}

/**
 * Get color for a match value
 */
export const getMatchColor = (value, domain = [0, 100]) => {
  const scale = createMatchColorScale(domain)
  return scale(value)
}

