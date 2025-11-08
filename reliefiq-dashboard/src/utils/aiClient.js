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

