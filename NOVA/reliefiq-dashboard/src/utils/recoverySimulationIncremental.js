/**
 * Incremental 5-Year Recovery Simulation Model
 * Processes in chunks to avoid blocking UI
 */
import * as d3 from 'd3'

/**
 * Calculate recovery for a district at a specific time point
 */
const calculateRecovery = (district, ngoAssignments, monthsElapsed, previousRecovery = null) => {
  const baseRecoveryRate = 0.025 // 2.5% per month base recovery (faster recovery)
  
  // Calculate intervention effectiveness - more responsive to NGO presence
  let interventionEffectiveness = 0
  let totalMatchScore = 0
  
  ngoAssignments.forEach(assignment => {
    const match = parseFloat(assignment.match || 0)
    const fitness = parseFloat(assignment.fitness_score || 0)
    // Higher effectiveness when NGOs are present
    const effectiveness = (match / 100) * (fitness / 100) * 0.5 // Increased from 0.3 to 0.5
    interventionEffectiveness += effectiveness
    totalMatchScore += match
  })
  
  const avgMatch = ngoAssignments.length > 0 ? totalMatchScore / ngoAssignments.length : 0
  const matchMultiplier = 1 + (avgMatch / 100) * 0.6 // Increased from 0.4 to 0.6 for better boost
  const recoveryRate = baseRecoveryRate + (interventionEffectiveness * matchMultiplier)
  
  // If we have previous recovery, build on it (incremental)
  if (previousRecovery !== null) {
    const previousScore = previousRecovery / 100
    const monthlyGain = recoveryRate * (1 - previousScore) * 1.2 // Increased from 0.8 to 1.2 for faster recovery
    const recoveryFactor = Math.min(1, previousScore + monthlyGain)
    
    // Ensure minimum recovery progress: by 5 years (60 months), all districts should reach at least 80%
    // Linear progression: at 30 months = 40%, at 60 months = 80%
    const minRecoveryByTime = Math.min(0.8, (monthsElapsed / 60) * 0.8) // At 60 months, minimum is 80%
    const finalRecoveryFactor = Math.max(recoveryFactor, minRecoveryByTime)
    
    const recoveryScore = Math.min(100, finalRecoveryFactor * 100)
    const initialDamage = parseFloat(district.houses_destroyed_pct || 0) / 100
    const housesDestroyedPct = Math.max(0, initialDamage * (1 - finalRecoveryFactor * 0.9) * 100)
    
    return {
      recoveryScore: Math.round(recoveryScore * 10) / 10,
      housesDestroyedPct: Math.round(housesDestroyedPct * 10) / 10,
      ngoCount: ngoAssignments.length,
      avgMatchScore: Math.round(avgMatch * 10) / 10
    }
  }
  
  // Initial calculation
  const initialDamage = parseFloat(district.houses_destroyed_pct || 0) / 100
  const logisticFactor = 1 / (1 + Math.exp(-0.25 * (monthsElapsed - 6))) // Faster ramp (changed from -0.15 and 8 to -0.25 and 6)
  const timeFactor = Math.min(monthsElapsed / 60, 1)
  const recoveryFactor = timeFactor * logisticFactor * (1 - Math.exp(-recoveryRate * monthsElapsed * 1.5)) // Increased from 1.2 to 1.5
  
  // Ensure minimum recovery progress: by 5 years (60 months), all districts should reach at least 80%
  // Linear progression: at 30 months = 40%, at 60 months = 80%
  const minRecoveryByTime = Math.min(0.8, (monthsElapsed / 60) * 0.8) // At 60 months, minimum is 80%
  const finalRecoveryFactor = Math.max(recoveryFactor, minRecoveryByTime)
  
  const recoveryScore = Math.min(100, finalRecoveryFactor * 100)
  const housesDestroyedPct = Math.max(0, initialDamage * (1 - finalRecoveryFactor * 0.9) * 100)
  
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
  
  // Process NGO movements - enhanced to show spreading/optimization throughout timeline
  const ngoMovements = []
  const newAssignments = [...currentAssignments]
  const movedNGOs = new Set()
  let movementCount = 0
  const maxMovementsPerStep = 15 // Increased to show more movement
  
  // Group by NGO
  const ngoGroups = new Map()
  currentAssignments.forEach(assignment => {
    if (!ngoGroups.has(assignment.ngo)) {
      ngoGroups.set(assignment.ngo, [])
    }
    ngoGroups.get(assignment.ngo).push(assignment)
  })
  
  // Calculate district coverage (how many NGOs per district)
  const districtNgoCount = new Map()
  currentAssignments.forEach(assignment => {
    const dName = normalizeName(assignment.district)
    districtNgoCount.set(dName, (districtNgoCount.get(dName) || 0) + 1)
  })
  
  // Process movements - two types:
  // 1. Move from recovered districts (recovery >= 70%)
  // 2. Optimize coverage - spread from over-served to under-served areas
  ngoGroups.forEach((assignments, ngo) => {
    if (movementCount >= maxMovementsPerStep) return
    
    for (const assignment of assignments) {
      if (movementCount >= maxMovementsPerStep || movedNGOs.has(ngo)) break
      
      const districtName = normalizeName(assignment.district)
      const districtState = districtStates.get(districtName)
      const currentNgoCount = districtNgoCount.get(districtName) || 0
      
      // Determine if this NGO should move
      let shouldMove = false
      let moveReason = ''
      
      // Reason 1: District is recovered (>= 70%)
      if (districtState && isRecovered(districtState.recoveryScore) && !assignment.moved) {
        shouldMove = true
        moveReason = `District recovered (${districtState.recoveryScore.toFixed(1)}%)`
      }
      // Reason 2: Optimization - district has too many NGOs and others need help
      // Move if current district has 3+ NGOs and hasn't moved recently
      else if (currentNgoCount >= 3 && month > 6 && !assignment.moved && Math.random() < 0.3) {
        shouldMove = true
        moveReason = `Optimization: spreading to under-served areas`
      }
      // Reason 3: Random spreading for optimization (after month 12)
      else if (month > 12 && !assignment.moved && Math.random() < 0.15) {
        shouldMove = true
        moveReason = `Optimization: expanding coverage`
      }
      
      if (shouldMove) {
        // Find best alternative district based on need and match
        const candidates = districts
          .map(d => {
            const dName = normalizeName(d.district)
            if (dName === districtName) return null
            
            const key = `${normalizeName(ngo)}-${dName}`
            if (!originalScores.has(key)) return null
            
            const dState = districtStates.get(dName)
            if (!dState) return null
            
            // Don't move to already recovered districts (unless it's the only option)
            if (dState.recoveryScore >= 70 && districtState && districtState.recoveryScore < 70) return null
            
            const originalScore = originalScores.get(key)
            const needScore = 100 - dState.recoveryScore // How much help is needed
            const matchScore = parseFloat(originalScore.match || 0)
            const urgencyScore = parseFloat(originalScore.urgency || 0)
            const fitnessScore = parseFloat(originalScore.fitness_score || 0)
            const targetNgoCount = districtNgoCount.get(dName) || 0
            
            // Priority: need + urgency + match quality - favor under-served areas
            const coverageBonus = targetNgoCount === 0 ? 20 : (targetNgoCount < 2 ? 10 : 0) // Bonus for under-served
            const priority = (needScore * 0.4) + (urgencyScore * 0.3) + (fitnessScore * 0.2) + coverageBonus
            
            return {
              district: d,
              name: dName,
              recoveryScore: dState.recoveryScore,
              match: matchScore,
              fitness: fitnessScore,
              urgency: urgencyScore,
              priority: priority,
              ngoCount: targetNgoCount
            }
          })
          .filter(Boolean)
        
        // Sort by priority (highest need + best match + under-served first)
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
              // Update district NGO count
              districtNgoCount.set(districtName, Math.max(0, (districtNgoCount.get(districtName) || 0) - 1))
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
            
            // Update target district NGO count
            districtNgoCount.set(target.name, (districtNgoCount.get(target.name) || 0) + 1)
            
            // Get coordinates for visualization
            const fromCoords = districtGraph?.get(districtName)?.coordinates
            const toCoords = districtGraph?.get(target.name)?.coordinates
            
            ngoMovements.push({
              ngo: ngo,
              from: assignment.district,
              to: target.district.district,
              month: month,
              reason: moveReason,
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
  
  // Reset "moved" flag periodically to allow multiple movements throughout timeline
  // After 3 months, allow NGOs to move again (for continuous optimization)
  newAssignments.forEach(assignment => {
    if (assignment.moved && month - assignment.startMonth >= 3) {
      assignment.moved = false // Reset after 3 months to allow future movement
    }
  })
  
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
 * Get color for recovery score with gradient
 * Red: 0-30%, Yellow: 31-70%, Green: 71-100%
 */
export const getRecoveryColor = (recoveryScore) => {
  // Clamp recovery score between 0 and 100
  const score = Math.max(0, Math.min(100, recoveryScore))
  
  // Red to Yellow gradient (0-30% recovery)
  if (score <= 30) {
    if (score <= 0) return '#d73027' // Pure red at 0%
    if (score >= 30) return '#fee08b' // Pure yellow at 30%
    
    // Gradient between red and yellow
    const ratio = score / 30
    const r = Math.round(253 - (253 - 254) * ratio) // 253 -> 254
    const g = Math.round(48 + (224 - 48) * ratio)   // 48 -> 224
    const b = Math.round(39 + (139 - 39) * ratio)   // 39 -> 139
    return `rgb(${r}, ${g}, ${b})`
  }
  
  // Yellow to Green gradient (31-70% recovery)
  if (score <= 70) {
    if (score <= 31) return '#fee08b' // Pure yellow at 31%
    if (score >= 70) return '#66bd63' // Pure green at 70%
    
    // Gradient between yellow and green
    const ratio = (score - 31) / (70 - 31) // Normalize to 0-1 for 31-70 range
    const r = Math.round(254 - (102 - 254) * ratio) // 254 -> 102
    const g = Math.round(224 + (189 - 224) * ratio)   // 224 -> 189
    const b = Math.round(139 - (99 - 139) * ratio)   // 139 -> 99
    return `rgb(${r}, ${g}, ${b})`
  }
  
  // Green gradient (71-100% recovery) - darker green as recovery increases
  if (score <= 100) {
    if (score <= 71) return '#66bd63' // Light green at 71%
    if (score >= 100) return '#1a9850' // Dark green at 100%
    
    // Gradient to darker green
    const ratio = (score - 71) / (100 - 71) // Normalize to 0-1 for 71-100 range
    const r = Math.round(102 - (26 - 102) * ratio)   // 102 -> 26
    const g = Math.round(189 - (152 - 189) * ratio)  // 189 -> 152
    const b = Math.round(99 - (80 - 99) * ratio)     // 99 -> 80
    return `rgb(${r}, ${g}, ${b})`
  }
  
  // Fallback (shouldn't reach here)
  return '#66bd63'
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

