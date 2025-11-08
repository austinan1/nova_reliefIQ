import OpenAI from 'openai'
import { getTaskGenerationPrompt, getChatSystemPrompt, getImageAnalysisPrompt } from './promptTemplates'

// Initialize OpenAI client only if API key is available
let client = null
const apiKey = import.meta.env.VITE_OPENAI_API_KEY

if (apiKey && apiKey !== 'your_openai_api_key_here') {
  client = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  })
} else {
  console.warn('[VIP] OpenAI API key not found. AI features will be disabled.')
}

/**
 * Generate tasks for a region and NGO
 */
export async function generateTasks(regionData, ngo) {
  if (!client) {
    throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.')
  }

  try {
    const prompt = getTaskGenerationPrompt(regionData.district, ngo, regionData)

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a professional operations analyst for disaster relief in Nepal. Always respond with valid JSON arrays only. Return only the JSON array, no other text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    })

    const response = completion.choices[0].message.content.trim()
    
    // Try to parse JSON
    let tasks = []
    try {
      const parsed = JSON.parse(response)
      // Handle both {tasks: [...]} and [...] formats
      tasks = Array.isArray(parsed) ? parsed : (parsed.tasks || [])
    } catch (e) {
      // Fallback: try to extract array from text
      const arrayMatch = response.match(/\[[\s\S]*\]/)
      if (arrayMatch) {
        tasks = JSON.parse(arrayMatch[0])
      } else {
        // Last resort: create a default task
        tasks = [{
          task: '⚠️ Estimated or simulated data - Unable to parse AI response',
          priority: 'Medium'
        }]
      }
    }

    // Ensure all tasks have required fields
    return tasks.map(t => ({
      task: t.task || 'Task description unavailable',
      priority: t.priority || 'Medium'
    }))
  } catch (error) {
    console.error('[VIP] Error generating tasks:', error)
    throw new Error(`Failed to generate tasks: ${error.message}`)
  }
}

/**
 * Generate chat response
 */
export async function generateChatResponse(userPrompt, context) {
  if (!client) {
    throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.')
  }

  try {
    const systemPrompt = getChatSystemPrompt()
    
    const fullPrompt = `${context}

User Question: ${userPrompt}

Provide a professional, data-driven response with actionable insights. Use structured formats (lists, tables) when appropriate. Label estimates clearly.`

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: fullPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    })

    let response = completion.choices[0].message.content

    // Add disclaimer if response contains estimates
    if (response.toLowerCase().includes('estimated') || 
        response.toLowerCase().includes('estimate') ||
        response.toLowerCase().includes('likely') ||
        response.toLowerCase().includes('probably')) {
      // Check if disclaimer already present
      if (!response.includes('⚠️')) {
        response += '\n\n⚠️ Estimated or simulated data'
      }
    }

    return response
  } catch (error) {
    console.error('[VIP] Error generating chat response:', error)
    throw new Error(`Failed to generate response: ${error.message}`)
  }
}

/**
 * Analyze image using vision API
 */
export async function analyzeImage(file, context) {
  if (!client) {
    throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.')
  }

  try {
    // Convert file to base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64String = reader.result.split(',')[1]
        resolve(base64String)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    const prompt = getImageAnalysisPrompt(context.region, context.metrics)

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a professional operations analyst analyzing disaster relief imagery in Nepal. Provide structured, actionable assessments.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64}`
              }
            }
          ]
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })

    let response = completion.choices[0].message.content

    // Add disclaimer
    if (!response.includes('⚠️')) {
      response += '\n\n⚠️ Estimated or simulated data'
    }

    return response
  } catch (error) {
    console.error('[VIP] Error analyzing image:', error)
    throw new Error(`Failed to analyze image: ${error.message}`)
  }
}

