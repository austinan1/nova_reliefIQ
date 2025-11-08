import OpenAI from 'openai/index.mjs'

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY

let openaiClient = null

if (API_KEY) {
  openaiClient = new OpenAI({
    apiKey: API_KEY,
    dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
  })
}

/**
 * Generate AI-powered action plan for a district
 */
export const generateActionPlan = async (districtData, selectedNGO, ngoCapabilities) => {
  if (!openaiClient) {
    return {
      error: 'OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.'
    }
  }

  try {
    const districtName = districtData.district?.charAt(0).toUpperCase() + districtData.district?.slice(1) || 'Unknown'
    const damagePct = parseFloat(districtData.houses_destroyed_pct) || 0
    const urgency = parseFloat(districtData.urgency) || 0
    const matchScore = parseFloat(districtData.match) || 0

    // Get NGO capabilities
    const ngoCaps = ngoCapabilities.filter(cap => cap.NGO === selectedNGO)
    const capabilities = []
    
    // Extract capabilities (columns that are 1)
    if (ngoCaps.length > 0) {
      const capRow = ngoCaps[0]
      Object.keys(capRow).forEach(key => {
        if (key !== 'NGO' && capRow[key] === '1') {
          capabilities.push(key)
        }
      })
    }

    const prompt = `You are a disaster response coordinator for Nepal. Generate a personalized relief action plan for ${selectedNGO} in ${districtName} district.

District Context:
- Damage Level: ${damagePct.toFixed(1)}% of houses destroyed
- Urgency Score: ${urgency.toFixed(1)}/100
- Match Score: ${matchScore.toFixed(1)}/100
- Population Density: ${(districtData.pop_density || 0).toFixed(1)} per km²
- Health Facilities Damaged: ${(districtData.health_facilities_damaged_pct || 0).toFixed(1)}%
- Water Facilities Damaged: ${(districtData.water_facilities_damaged_pct || 0).toFixed(1)}%
- Food Insecure Households: ${(districtData.food_insecure_households_pct || 0).toFixed(1)}%

NGO Capabilities: ${capabilities.join(', ') || 'None specified'}

Generate a concise 3-step action plan including:
1. Situation Summary (damage assessment and urgency)
2. Recommended Resource Allocations (specific to NGO capabilities)
3. Coordination Suggestions (with other NGOs if needed)
4. Potential Bottlenecks or Access Issues

Format as markdown with clear sections.`

    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert disaster response coordinator with deep knowledge of humanitarian aid and Nepal\'s geography.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    })

    return {
      content: response.choices[0].message.content,
      error: null
    }
  } catch (error) {
    console.error('Error generating action plan:', error)
    return {
      error: `Error generating action plan: ${error.message}`
    }
  }
}

/**
 * Generate chat response
 */
export const generateChatResponse = async (userQuery, contextData, selectedNGO, ngoCapabilities) => {
  if (!openaiClient) {
    return {
      error: 'OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.'
    }
  }

  try {
    // Prepare context summary
    const topDistricts = contextData
      .sort((a, b) => (b.fitness_score || 0) - (a.fitness_score || 0))
      .slice(0, 5)
      .map(d => `${d.district}: match=${d.match?.toFixed(1)}, urgency=${d.urgency?.toFixed(1)}`)
      .join('\n')

    const ngoCaps = ngoCapabilities.filter(cap => cap.NGO === selectedNGO)
    const capabilities = []
    if (ngoCaps.length > 0) {
      const capRow = ngoCaps[0]
      Object.keys(capRow).forEach(key => {
        if (key !== 'NGO' && capRow[key] === '1') {
          capabilities.push(key)
        }
      })
    }

    const contextSummary = `
Available Data:
- ${contextData.length} districts with damage and population data
- Selected NGO: ${selectedNGO}
- NGO Capabilities: ${capabilities.join(', ') || 'None specified'}

Top Priority Districts:
${topDistricts}
`

    const prompt = `You are a disaster response assistant for Nepal. Answer the following question based on the available data:

${contextSummary}

User Question: ${userQuery}

Provide a helpful, data-driven response. If the question requires specific data, reference the available information.`

    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert disaster response assistant with knowledge of humanitarian aid and Nepal\'s geography.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })

    return {
      content: response.choices[0].message.content,
      error: null
    }
  } catch (error) {
    console.error('Error generating chat response:', error)
    return {
      error: `Error generating response: ${error.message}`
    }
  }
}

