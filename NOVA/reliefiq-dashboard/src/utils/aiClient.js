import OpenAI from 'openai'

// Initialize OpenAI client only if API key is available
let client = null
const apiKey = import.meta.env.VITE_OPENAI_API_KEY

if (apiKey && apiKey !== 'your_openai_api_key_here') {
  client = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  })
} else {
  console.warn('OpenAI API key not found. AI features will be disabled.')
}

/**
 * Generate AI-powered action plan for a district
 */
export async function generatePlan(district, ngo, districtData) {
  if (!client) {
    throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.')
  }
  
  try {
    const prompt = `You are a disaster response coordinator for Nepal. Generate a personalized relief action plan for ${ngo} in ${district} district.

District Context:
- Damage Level: ${districtData.damage_pct?.toFixed(1) || 0}% of houses destroyed
- Urgency Score: ${districtData.urgency?.toFixed(1) || 0}/100
- Match Score: ${districtData.match?.toFixed(1) || 0}/100
- Population Density: ${districtData.population_density?.toFixed(1) || 0} per km²

Generate a concise 3-step action plan including:
1. Situation Summary (damage assessment and urgency)
2. Recommended Resource Allocations (specific to NGO capabilities)
3. Coordination Suggestions (with other NGOs if needed)
4. Potential Bottlenecks or Access Issues

Format as markdown with clear sections.`

    const completion = await client.chat.completions.create({
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

    return completion.choices[0].message.content
  } catch (error) {
    console.error('Error generating plan:', error)
    throw new Error(`Failed to generate plan: ${error.message}`)
  }
}

/**
 * Generate chat response
 */
export async function generateChatResponse(userQuery, context) {
  if (!client) {
    throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.')
  }
  
  try {
    const prompt = `You are a disaster response assistant for Nepal. Answer the following question based on the available data:

${context}

User Question: ${userQuery}

Provide a helpful, data-driven response. If the question requires specific data, reference the available information.`

    const completion = await client.chat.completions.create({
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

    return completion.choices[0].message.content
  } catch (error) {
    console.error('Error generating chat response:', error)
    throw new Error(`Failed to generate response: ${error.message}`)
  }
}

/**
 * Generate personalized priority aid categories for a district using real infrastructure and geographic data
 */
export async function generatePriorityAidCategories(district, districtData, geojson) {
  if (!client) {
    throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.')
  }
  
  try {
    // Extract geographic information from geojson if available
    let geographicContext = ''
    if (geojson && geojson.features) {
      const districtFeature = geojson.features.find(f => {
        const props = f.properties
        const name = (props.NAME || props.DISTRICT || props.name || props.district || '').toLowerCase()
        return name === district.toLowerCase()
      })
      
      if (districtFeature) {
        // Get coordinates for context
        const coords = districtFeature.geometry?.coordinates
        if (coords) {
          geographicContext = `\nGeographic Context:
- District coordinates and boundaries available
- Consider terrain, elevation, and proximity to major roads`
        }
      }
    }

    const prompt = `You are a disaster response coordinator for Nepal with deep knowledge of the country's infrastructure, road networks, geography, and regional characteristics. Generate personalized priority aid categories for ${district} district.

District Context:
- Damage Level: ${districtData.damage_pct?.toFixed(1) || 0}% of houses destroyed
- Urgency Score: ${districtData.urgency?.toFixed(1) || 0}/100
- Match Score: ${districtData.match?.toFixed(1) || 0}/100
- Population Density: ${districtData.population_density?.toFixed(1) || 0} per km²${geographicContext}

IMPORTANT: Use your knowledge of Nepal's actual infrastructure and geography:
- Major highways and road networks (Prithvi Highway, Mahendra Highway, Arniko Highway, etc.)
- Terrain characteristics (mountainous, hilly, Terai plains)
- Access routes and potential road blockages
- Regional infrastructure (hospitals, airports, bridges)
- Seasonal factors (monsoon, landslides, river crossings)
- Specific regional needs based on geography (mountain rescue, flood response, etc.)

Based on ${district}'s specific location, infrastructure, road access, and geographic characteristics, generate exactly 3 priority aid categories. For each category, provide:
1. Category name (be specific - e.g., "Mountain Road Clearance Equipment", "Bridge Repair Materials", "High-Altitude Medical Supplies", "Terai Flood Response Kits")
2. A brief, specific reason why this is a priority for THIS district (1 sentence, max 25 words). Reference actual infrastructure, roads, terrain, or geographic factors when relevant.

Format your response as a JSON array with this exact structure:
[
  {
    "name": "Specific Category Name",
    "reason": "Brief specific reason referencing roads, infrastructure, or geography for this district"
  },
  {
    "name": "Specific Category Name",
    "reason": "Brief specific reason referencing roads, infrastructure, or geography for this district"
  },
  {
    "name": "Specific Category Name",
    "reason": "Brief specific reason referencing roads, infrastructure, or geography for this district"
  }
]

Only return the JSON array, no other text.`

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert disaster response coordinator with deep knowledge of Nepal\'s geography, road networks (Prithvi Highway, Mahendra Highway, Arniko Highway, etc.), infrastructure, terrain (Himalayas, hills, Terai), regional characteristics, and humanitarian aid. You know about specific districts, their access routes, major roads, bridges, hospitals, and geographic challenges. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 400
    })

    const response = completion.choices[0].message.content.trim()
    // Try to extract JSON if there's any extra text
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    const jsonString = jsonMatch ? jsonMatch[0] : response
    const categories = JSON.parse(jsonString)
    
    return categories
  } catch (error) {
    console.error('Error generating priority aid categories:', error)
    throw new Error(`Failed to generate categories: ${error.message}`)
  }
}

