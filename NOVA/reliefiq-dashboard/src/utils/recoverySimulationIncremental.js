/**
 * Incremental 5-Year Recovery Simulation Model
 * Processes in chunks to avoid blocking UI
 */
import * as d3 from 'd3'

/**
 * Calculate recovery for a district at a specific time point
 */
const calculateRecovery = (district, ngoAssignments, monthsElapsed, previousRecovery = null) => {
  const baseRecoveryRate = 0.01 // 1% per month base recovery (more gradual)
  
  // Calculate intervention effectiveness - more responsive to NGO presence
  let interventionEffectiveness = 0
  let totalMatchScore = 0
  
  ngoAssignments.forEach(assignment => {
    const match = parseFloat(assignment.match || 0)
    const fitness = parseFloat(assignment.fitness_score || 0)
    // Higher effectiveness when NGOs are present
    const effectiveness = (match / 100) * (fitness / 100) * 0.3
    interventionEffectiveness += effectiveness
    totalMatchScore += match
  })
  
  const avgMatch = ngoAssignments.length > 0 ? totalMatchScore / ngoAssignments.length : 0
  const matchMultiplier = 1 + (avgMatch / 100) * 0.4 // Higher boost from good matches
  const recoveryRate = baseRecoveryRate + (interventionEffectiveness * matchMultiplier)
  
  // If we have previous recovery, build on it (incremental)
  if (previousRecovery !== null) {
    const previousScore = previousRecovery / 100
    const monthlyGain = recoveryRate * (1 - previousScore) * 0.8 // Diminishing returns
    const recoveryFactor = Math.min(1, previousScore + monthlyGain)
    const recoveryScore = recoveryFactor * 100
    const initialDamage = parseFloat(district.houses_destroyed_pct || 0) / 100
    const housesDestroyedPct = Math.max(0, initialDamage * (1 - recoveryFactor * 0.9) * 100)
    
    return {
      recoveryScore: Math.round(recoveryScore * 10) / 10,
      housesDestroyedPct: Math.round(housesDestroyedPct * 10) / 10,
      ngoCount: ngoAssignments.length,
      avgMatchScore: Math.round(avgMatch * 10) / 10
    }
  }
  
  // Initial calculation
  const initialDamage = parseFloat(district.houses_destroyed_pct || 0) / 100
  const logisticFactor = 1 / (1 + Math.exp(-0.15 * (monthsElapsed - 8))) // Slower initial ramp
  const timeFactor = Math.min(monthsElapsed / 60, 1)
  const recoveryFactor = timeFactor * logisticFactor * (1 - Math.exp(-recoveryRate * monthsElapsed * 1.2))
  
  const recoveryScore = Math.min(100, recoveryFactor * 100)
  const housesDestroyedPct = Math.max(0, initialDamage * (1 - recoveryFactor * 0.9) * 100)
  
  return {
    recoveryScore: Math.round(recoveryScore * 10) / 10,
    housesDestroyedPct: Math.round(housesDestroyedPct * 10) / 10,
    ngoCount: ngoAssignments.length,
    avgMatchScore: Math.round(avgMatch * 10) / 10
  }
}

const isRecovered = (recoveryScore) => {
  return recoveryScore >= 70
}

const normalizeName = (name) => {
  if (!name) return ''
  return String(name).trim().toLowerCase()
}

/**
 * Create simulation state manager for incremental processing
 */
export const createSimulationState = (districts, ngoRegionScores, maxMonths = 60) => {
  const timeStep = 1 // Every 1 month for granular timeline
  
  // Initialize assignments
  const currentAssignments = ngoRegionScores.map(score => ({
    ngo: score.NGO,
    district: score.district,
    match: parseFloat(score.match || 0),
    fitness: parseFloat(score.fitness_score || 0),
    urgency: parseFloat(score.urgency || 0),
    startMonth: 0,
    moved: false
  }))
  
  // Create lookups
  const districtLookup = new Map()
  districts.forEach(d => {
    const normalized = normalizeName(d.district)
    districtLookup.set(normalized, { ...d, district: d.district })
  })
  
  const originalScores = new Map()
  ngoRegionScores.forEach(score => {
    const key = `${normalizeName(score.NGO)}-${normalizeName(score.district)}`
    originalScores.set(key, score)
  })
  
  return {
    districts,
    currentAssignments,
    districtLookup,
    originalScores,
    timeStep,
    maxMonths,
    timeline: []
  }
}

/**
 * Build simple district coordinate map for visualization
 */
export const buildDistrictGraph = (districts, geojson) => {
  const districtMap = new Map()
  const normalizeName = (name) => {
    if (!name) return ''
    return String(name).trim().toLowerCase()
  }
  
  // Store coordinates for each district from GeoJSON
  if (geojson && geojson.features) {
    geojson.features.forEach(feature => {
      const props = feature.properties
      const name = normalizeName(props.NAME || props.DISTRICT || props.name || props.district || '')
      if (name) {
        // Store centroid for movement visualization
        const bounds = d3.geoBounds(feature)
        districtMap.set(name, {
          district: props.NAME || props.DISTRICT || props.name || props.district || '',
          coordinates: [
            (bounds[0][0] + bounds[1][0]) / 2,
            (bounds[0][1] + bounds[1][1]) / 2
          ]
        })
      }
    })
  }
  
  // Also add districts from the districts array
  districts.forEach(d => {
    const name = normalizeName(d.district)
    if (!districtMap.has(name)) {
      districtMap.set(name, {
        district: d.district,
        coordinates: null // Will be filled from GeoJSON if available
      })
    }
  })
  
  return districtMap
}

/**
 * Process a single time step incrementally
 */
export const processTimeStep = (state, month, onProgress, districtGraph = null) => {
  const { districts, currentAssignments, districtLookup, originalScores } = state
  
  // Get previous snapshot for incremental recovery calculation
  const previousSnapshot = state.timeline.length > 0 ? state.timeline[state.timeline.length - 1] : null
  const previousStates = previousSnapshot ? new Map() : null
  if (previousSnapshot) {
    previousSnapshot.districtStates.forEach(d => {
      previousStates.set(normalizeName(d.district), d.recoveryScore)
    })
  }
  
  // Calculate current state of all districts
  const districtStates = new Map()
  
  districts.forEach(district => {
    const districtName = normalizeName(district.district)
    const districtAssignments = currentAssignments
      .filter(a => normalizeName(a.district) === districtName)
      .map(a => ({
        NGO: a.ngo,
        match: a.match,
        fitness_score: a.fitness
      }))
    
    // Use previous recovery for incremental calculation
    const previousRecovery = previousStates ? previousStates.get(districtName) : null
    const recovery = calculateRecovery(district, districtAssignments, month, previousRecovery)
    districtStates.set(districtName, {
      district: district.district,
      ...recovery,
      ngoAssignments: districtAssignments.map(a => a.NGO),
      originalDamage: parseFloat(district.houses_destroyed_pct || 0)
    })
  })
  
  // Process NGO movements (simplified - limit to prevent blocking)
  const ngoMovements = []
  const newAssignments = [...currentAssignments]
  const movedNGOs = new Set()
  let movementCount = 0
  const maxMovementsPerStep = 10 // Reduced for performance
  
  // Group by NGO
  const ngoGroups = new Map()
  currentAssignments.forEach(assignment => {
    if (!ngoGroups.has(assignment.ngo)) {
      ngoGroups.set(assignment.ngo, [])
    }
    ngoGroups.get(assignment.ngo).push(assignment)
  })
  
  // Process movements (limited)
  ngoGroups.forEach((assignments, ngo) => {
    if (movementCount >= maxMovementsPerStep) return
    
    for (const assignment of assignments) {
      if (movementCount >= maxMovementsPerStep || movedNGOs.has(ngo)) break
      
      const districtName = normalizeName(assignment.district)
      const districtState = districtStates.get(districtName)
      
      if (districtState && isRecovered(districtState.recoveryScore) && !assignment.moved) {
        // Simple simulation: Find best alternative district based on need and match
        // Priority: High urgency + low recovery + good match score
        const candidates = districts
          .map(d => {
            const dName = normalizeName(d.district)
            if (dName === districtName) return null
            
            const key = `${normalizeName(ngo)}-${dName}`
            if (!originalScores.has(key)) return null
            
            const dState = districtStates.get(dName)
            if (!dState || dState.recoveryScore >= 70) return null
            
            const originalScore = originalScores.get(key)
            const needScore = 100 - dState.recoveryScore // How much help is needed
            const matchScore = parseFloat(originalScore.match || 0)
            const urgencyScore = parseFloat(originalScore.urgency || 0)
            const fitnessScore = parseFloat(originalScore.fitness_score || 0)
            
            // Priority combines: need (recovery gap) + urgency + match quality
            const priority = (needScore * 0.4) + (urgencyScore * 0.3) + (fitnessScore * 0.3)
            
            return {
              district: d,
              name: dName,
              recoveryScore: dState.recoveryScore,
              match: matchScore,
              fitness: fitnessScore,
              urgency: urgencyScore,
              priority: priority
            }
          })
          .filter(Boolean)
        
        // Sort by priority (highest need + best match first)
        candidates.sort((a, b) => b.priority - a.priority)
        
        if (candidates.length > 0) {
          const target = candidates[0]
          const key = `${normalizeName(ngo)}-${target.name}`
          const originalScore = originalScores.get(key)
          
          if (originalScore) {
            const oldIndex = newAssignments.findIndex(a => 
              a.ngo === ngo && normalizeName(a.district) === districtName
            )
            if (oldIndex >= 0) {
              newAssignments.splice(oldIndex, 1)
            }
            
            newAssignments.push({
              ngo: ngo,
              district: target.district.district,
              match: target.match,
              fitness: target.fitness,
              urgency: target.urgency,
              startMonth: month,
              moved: true,
              fromDistrict: assignment.district
            })
            
            // Get coordinates for visualization
            const fromCoords = districtGraph?.get(districtName)?.coordinates
            const toCoords = districtGraph?.get(target.name)?.coordinates
            
            ngoMovements.push({
              ngo: ngo,
              from: assignment.district,
              to: target.district.district,
              month: month,
              reason: `Moved to higher need area (recovery: ${target.recoveryScore.toFixed(1)}%)`,
              fromCoords: fromCoords,
              toCoords: toCoords
            })
            
            movedNGOs.add(ngo)
            movementCount++
          }
        }
      }
    }
  })
  
  // Update state
  state.currentAssignments = newAssignments
  
  // Store snapshot
  const snapshot = {
    month: month,
    districtStates: Array.from(districtStates.values()),
    ngoMovements: ngoMovements,
    totalNGOs: new Set(newAssignments.map(a => a.ngo)).size,
    totalAssignments: newAssignments.length
  }
  
  state.timeline.push(snapshot)
  
  if (onProgress) {
    onProgress(snapshot, state.timeline.length)
  }
  
  return snapshot
}

/**
 * Run simulation incrementally with progress callback
 */
export const runIncrementalSimulation = (state, onProgress, onComplete, districtGraph = null) => {
  const { timeStep, maxMonths } = state
  let currentMonth = 0
  let cancelled = false
  
  const processNext = () => {
    if (cancelled || currentMonth > maxMonths) {
      if (onComplete) onComplete(state.timeline)
      return
    }
    
    // Process one time step
    processTimeStep(state, currentMonth, onProgress, districtGraph)
    currentMonth += timeStep
    
    // Yield to browser, then continue
    // Use smaller delay for monthly steps to keep it smooth
    if (currentMonth <= maxMonths) {
      setTimeout(processNext, 5) // Small delay to keep UI responsive
    } else {
      if (onComplete) onComplete(state.timeline)
    }
  }
  
  // Start processing
  setTimeout(processNext, 50)
  
  return () => {
    cancelled = true
  }
}

/**
 * Get color for recovery score
 */
export const getRecoveryColor = (recoveryScore) => {
  const damageLevel = 100 - recoveryScore
  
  if (damageLevel >= 75) return '#d73027' // Red - severe
  if (damageLevel >= 50) return '#fee08b' // Yellow - moderate
  if (damageLevel >= 25) return '#66bd63' // Light green - recovering
  return '#3288bd' // Blue - well recovered
}

/**
 * Format month to year/month string
 */
export const formatTime = (months) => {
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (years === 0) return `${remainingMonths} months`
  if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`
  return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`
}

