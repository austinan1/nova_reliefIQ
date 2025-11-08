/**
 * 5-Year Recovery Simulation Model
 * Tracks NGO assignments and movement as regions recover
 */

/**
 * Calculate recovery for a district at a specific time point
 */
const calculateRecovery = (district, ngoAssignments, monthsElapsed) => {
  const baseRecoveryRate = 0.012 // 1.2% per month base recovery
  
  // Calculate intervention effectiveness
  let interventionEffectiveness = 0
  let totalMatchScore = 0
  
  ngoAssignments.forEach(assignment => {
    const match = parseFloat(assignment.match || 0)
    const fitness = parseFloat(assignment.fitness_score || 0)
    const effectiveness = (match / 100) * (fitness / 100) * 0.25
    interventionEffectiveness += effectiveness
    totalMatchScore += match
  })
  
  const avgMatch = ngoAssignments.length > 0 ? totalMatchScore / ngoAssignments.length : 0
  const matchMultiplier = 1 + (avgMatch / 100) * 0.25
  const recoveryRate = baseRecoveryRate + (interventionEffectiveness * matchMultiplier)
  
  // Sigmoid curve for gradual recovery
  const initialDamage = parseFloat(district.houses_destroyed_pct || 0) / 100
  const logisticFactor = 1 / (1 + Math.exp(-0.2 * (monthsElapsed - 6)))
  const timeFactor = Math.min(monthsElapsed / 60, 1) // 5 years = 60 months
  const recoveryFactor = timeFactor * logisticFactor * (1 - Math.exp(-recoveryRate * monthsElapsed * 1.5))
  
  const recoveryScore = Math.min(100, recoveryFactor * 100)
  const housesDestroyedPct = Math.max(0, initialDamage * (1 - recoveryFactor * 0.9) * 100)
  
  return {
    recoveryScore: Math.round(recoveryScore * 10) / 10,
    housesDestroyedPct: Math.round(housesDestroyedPct * 10) / 10,
    ngoCount: ngoAssignments.length,
    avgMatchScore: Math.round(avgMatch * 10) / 10
  }
}

/**
 * Determine if a district is "recovered enough" for NGOs to move on
 * Threshold: 70% recovery score
 */
const isRecovered = (recoveryScore) => {
  return recoveryScore >= 70
}

/**
 * Find best alternative districts for an NGO to move to
 */
const findBestAlternatives = (ngo, currentDistrict, allDistricts, currentAssignments, monthsElapsed, originalScores) => {
  const normalizeName = (name) => {
    if (!name) return ''
    return String(name).trim().toLowerCase()
  }
  
  const ngoName = normalizeName(ngo)
  const currentDistrictName = normalizeName(currentDistrict)
  
  // Get all districts this NGO could work in (from original scores)
  // Limit search to top candidates for performance
  const potentialDistricts = []
  const maxCandidates = 50 // Limit search space
  
  for (const d of allDistricts) {
    if (potentialDistricts.length >= maxCandidates) break
    
    const districtName = normalizeName(d.district)
    
    // Not already in this district
    const isInDistrict = currentAssignments.some(a => 
      normalizeName(a.ngo) === ngoName && normalizeName(a.district) === districtName
    )
    if (isInDistrict) continue
    
    // Check if NGO has original score for this district
    const key = `${ngoName}-${districtName}`
    if (!originalScores.has(key)) continue
    
    // Quick check: District still needs help (recovery < 70%)
    // Use simplified calculation for filtering
    const districtAssignments = currentAssignments
      .filter(a => normalizeName(a.district) === districtName)
      .map(a => ({
        NGO: a.ngo,
        match: a.match,
        fitness_score: a.fitness
      }))
    const recovery = calculateRecovery(d, districtAssignments, monthsElapsed)
    if (recovery.recoveryScore >= 70) continue
    
    potentialDistricts.push(d)
  }
  
  const scoredDistricts = potentialDistricts
    .map(d => {
      const districtName = normalizeName(d.district)
      const key = `${ngoName}-${districtName}`
      const originalScore = originalScores.get(key)
      
      const match = parseFloat(originalScore?.match || 0)
      const fitness = parseFloat(originalScore?.fitness_score || 0)
      const urgency = parseFloat(originalScore?.urgency || 0)
      
      const districtAssignments = currentAssignments
        .filter(a => normalizeName(a.district) === districtName)
        .map(a => ({
          NGO: a.ngo,
          match: a.match,
          fitness_score: a.fitness
        }))
      const recovery = calculateRecovery(d, districtAssignments, monthsElapsed)
      
      return {
        district: d,
        match: match,
        fitness: fitness,
        recoveryScore: recovery.recoveryScore,
        urgency: urgency,
        priority: (match + fitness) / 2 + (100 - recovery.recoveryScore) * 0.5 + urgency * 0.3
      }
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3) // Top 3 alternatives
  
  return potentialDistricts
}

/**
 * Simulate NGO movement and recovery over 5 years (60 months)
 */
export const simulateRecovery = (districts, ngoRegionScores, maxMonths = 60) => {
  const timeline = []
  
  // Normalize district names
  const normalizeName = (name) => {
    if (!name) return ''
    return String(name).trim().toLowerCase()
  }
  
  // Initialize: All NGOs start at their original assignments
  let currentAssignments = ngoRegionScores.map(score => ({
    ngo: score.NGO,
    district: score.district,
    match: parseFloat(score.match || 0),
    fitness: parseFloat(score.fitness_score || 0),
    urgency: parseFloat(score.urgency || 0),
    startMonth: 0,
    moved: false
  }))
  
  // Create district lookup with original data
  const districtLookup = new Map()
  districts.forEach(d => {
    const normalized = normalizeName(d.district)
    districtLookup.set(normalized, {
      ...d,
      district: d.district // Keep original name
    })
  })
  
  // Create original scores lookup
  const originalScores = new Map()
  ngoRegionScores.forEach(score => {
    const key = `${normalizeName(score.NGO)}-${normalizeName(score.district)}`
    originalScores.set(key, score)
  })
  
  // Simulate each month - use larger intervals for better performance
  // Reduced to every 12 months (yearly) for much better performance
  const timeStep = 12 // Every 12 months (yearly snapshots)
  for (let month = 0; month <= maxMonths; month += timeStep) {
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
      
      const recovery = calculateRecovery(district, districtAssignments, month)
      districtStates.set(districtName, {
        district: district.district, // Keep original name
        ...recovery,
        ngoAssignments: districtAssignments.map(a => a.NGO),
        originalDamage: parseFloat(district.houses_destroyed_pct || 0)
      })
    })
    
    // Check for NGOs that should move (their district is recovered)
    // Limit movements per time step to avoid performance issues
    const ngoMovements = []
    const newAssignments = [...currentAssignments]
    const movedNGOs = new Set() // Track NGOs that have already moved this step
    
    // Group assignments by NGO
    const ngoGroups = new Map()
    currentAssignments.forEach(assignment => {
      if (!ngoGroups.has(assignment.ngo)) {
        ngoGroups.set(assignment.ngo, [])
      }
      ngoGroups.get(assignment.ngo).push(assignment)
    })
    
    // Check each NGO's districts (limit to prevent too many calculations)
    let movementCount = 0
    const maxMovementsPerStep = 20 // Limit movements per time step
    
    ngoGroups.forEach((assignments, ngo) => {
      if (movementCount >= maxMovementsPerStep) return
      
      assignments.forEach(assignment => {
        if (movementCount >= maxMovementsPerStep) return
        if (movedNGOs.has(ngo)) return // Don't move same NGO twice in one step
        
        const districtName = normalizeName(assignment.district)
        const districtState = districtStates.get(districtName)
        
        if (districtState && isRecovered(districtState.recoveryScore) && !assignment.moved) {
          // This district is recovered, NGO can move
          // Find best alternative (limit search)
          const alternatives = findBestAlternatives(
            ngo,
            assignment.district,
            districts,
            currentAssignments,
            month,
            originalScores
          )
          
          if (alternatives.length > 0) {
            // Move to best alternative
            const target = alternatives[0]
            const targetDistrictName = normalizeName(target.district.district)
            const targetDistrict = districtLookup.get(targetDistrictName)
            
            if (targetDistrict) {
              // Remove old assignment
              const oldIndex = newAssignments.findIndex(a => 
                a.ngo === ngo && normalizeName(a.district) === districtName
              )
              if (oldIndex >= 0) {
                newAssignments.splice(oldIndex, 1)
              }
              
              // Add new assignment
              const originalScore = originalScores.get(
                `${normalizeName(ngo)}-${targetDistrictName}`
              )
              
              if (originalScore) {
                newAssignments.push({
                  ngo: ngo,
                  district: target.district.district,
                  match: parseFloat(originalScore.match || 0),
                  fitness: parseFloat(originalScore.fitness_score || 0),
                  urgency: parseFloat(originalScore.urgency || 0),
                  startMonth: month,
                  moved: true
                })
                
                ngoMovements.push({
                  ngo: ngo,
                  from: assignment.district,
                  to: target.district.district,
                  month: month,
                  reason: `District recovered (${districtState.recoveryScore.toFixed(1)}%)`
                })
                
                movedNGOs.add(ngo)
                movementCount++
              }
            }
          }
        }
      })
    })
    
    currentAssignments = newAssignments
    
    // Store timeline snapshot
    timeline.push({
      month: month,
      districtStates: Array.from(districtStates.values()),
      ngoMovements: ngoMovements,
      totalNGOs: new Set(currentAssignments.map(a => a.ngo)).size,
      totalAssignments: currentAssignments.length
    })
  }
  
  return timeline
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

