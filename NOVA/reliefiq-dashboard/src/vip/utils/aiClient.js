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
 * Generate chat response with enhanced context awareness
 */
export async function generateChatResponse(userPrompt, context, regionData = null, ngo = null, allData = null) {
  if (!client) {
    throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.')
  }

  try {
    const systemPrompt = getChatSystemPrompt()
    
    // Enhanced context with NGO-region fit scores and model predictions
    let enhancedContext = context
    
    if (regionData && ngo && allData) {
      // Find NGO-region match score from data
      const ngoMatch = regionData.ngo_match
      const fitnessScore = ngoMatch?.fitness_score || 0
      const matchScore = ngoMatch?.match || 0
      
      enhancedContext += `\n\nNGO-Region Fit Analysis:
- Fitness Score: ${fitnessScore.toFixed(2)} (from trained model)
- Match Score: ${matchScore.toFixed(2)}
- This score indicates how well ${ngo} is positioned to help in ${regionData.district}

Available Data Sources:
- PDNA district damage assessments
- NGO capability matrices
- Population density data
- Regional needs mapping
- Trained ML model predictions (model.pkl)`
    }
    
    // Handle specific command patterns
    let processedPrompt = userPrompt
    
    if (userPrompt.toLowerCase().includes('show current situation') || 
        userPrompt.toLowerCase().includes('current situation in')) {
      processedPrompt = `Analyze and summarize the current disaster situation in ${regionData?.district || 'the selected region'}. Include damage levels, urgency, accessibility, and immediate needs.`
    } else if (userPrompt.toLowerCase().includes('which ngo') || 
               userPrompt.toLowerCase().includes('best positioned')) {
      processedPrompt = `Based on the NGO-region fitness scores and capabilities, recommend which NGO(s) are best positioned for ${regionData?.district || 'this region'}. Consider match scores, urgency, and NGO capabilities.`
    } else if (userPrompt.toLowerCase().includes('pending volunteer tasks') || 
               userPrompt.toLowerCase().includes('my tasks')) {
      // This will be handled by fetching tasks from API
      processedPrompt = `List and prioritize volunteer tasks for ${ngo} in ${regionData?.district || 'the selected region'}.`
    }
    
    const fullPrompt = `${enhancedContext}

User Question: ${processedPrompt}

Provide a professional, data-driven response with actionable insights. Use structured formats (lists, tables) when appropriate. Label estimates clearly. Reference specific metrics and scores when available.`

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
 * Suggest alternate route using coordinates (mock implementation - in production use Google Maps/Mapbox API)
 */
async function suggestAlternateRoute(blockedLocation, destination, region) {
  // Mock implementation - in production, integrate with Google Maps Directions API or Mapbox
  // For now, return a structured response
  return {
    hasAlternateRoute: true,
    routeDescription: `Alternate route available via eastern approach to ${destination || region}. Estimated detour: 15-20 km.`,
    estimatedTime: '45-60 minutes',
    routeLink: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination || region)}`,
    warnings: ['Road conditions may vary', 'Verify route accessibility before departure']
  }
}

/**
 * Analyze image using vision API with routing integration
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
          content: 'You are a professional operations analyst analyzing disaster relief imagery in Nepal. Provide structured, actionable assessments. If you detect blocked roads or infrastructure damage, identify the location and suggest alternate routes.'
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
    let routeInfo = null

    // Check if image shows blocked route or infrastructure damage
    const lowerResponse = response.toLowerCase()
    if (lowerResponse.includes('blocked') || 
        lowerResponse.includes('road closure') || 
        lowerResponse.includes('bridge collapse') ||
        lowerResponse.includes('impassable')) {
      // Try to extract location from response or use region
      const blockedLocation = context.region
      routeInfo = await suggestAlternateRoute(blockedLocation, null, context.region)
      
      // Append route information to response
      response += `\n\n**🛣️ Alternate Route Suggestion:**\n`
      response += `- ${routeInfo.routeDescription}\n`
      response += `- Estimated detour time: ${routeInfo.estimatedTime}\n`
      response += `- [View route on map](${routeInfo.routeLink})\n`
      if (routeInfo.warnings && routeInfo.warnings.length > 0) {
        response += `\n⚠️ Warnings: ${routeInfo.warnings.join(', ')}`
      }
    }

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

/**
 * LocalStorage-based task management
 */
const TASKS_STORAGE_KEY = 'reliefiq_vip_tasks'

/**
 * Get all tasks from localStorage
 */
export function fetchTasks(region = null, assignedTo = null) {
  try {
    const stored = localStorage.getItem(TASKS_STORAGE_KEY)
    let allTasks = stored ? JSON.parse(stored) : []
    
    // Filter by region and assigned_to if provided
    if (region) {
      allTasks = allTasks.filter(t => t.region === region)
    }
    if (assignedTo) {
      allTasks = allTasks.filter(t => t.assigned_to === assignedTo)
    }
    
    return allTasks
  } catch (error) {
    console.error('[VIP] Error fetching tasks:', error)
    return []
  }
}

/**
 * Save all tasks to localStorage
 */
function saveTasks(tasks) {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks))
  } catch (error) {
    console.error('[VIP] Error saving tasks:', error)
  }
}

/**
 * Create a new task
 */
export function createTask(taskData) {
  try {
    const tasks = fetchTasks()
    const newTask = {
      id: Date.now(), // Simple ID generation
      ...taskData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    tasks.push(newTask)
    saveTasks(tasks)
    return newTask
  } catch (error) {
    console.error('[VIP] Error creating task:', error)
    throw new Error(`Failed to create task: ${error.message}`)
  }
}

/**
 * Update a task
 */
export function updateTask(taskId, taskData) {
  try {
    const tasks = fetchTasks()
    const index = tasks.findIndex(t => t.id === taskId)
    
    if (index === -1) {
      throw new Error('Task not found')
    }
    
    tasks[index] = {
      ...tasks[index],
      ...taskData,
      updated_at: new Date().toISOString()
    }
    
    saveTasks(tasks)
    return tasks[index]
  } catch (error) {
    console.error('[VIP] Error updating task:', error)
    throw new Error(`Failed to update task: ${error.message}`)
  }
}

/**
 * Delete a task
 */
export function deleteTask(taskId) {
  try {
    const tasks = fetchTasks()
    const filtered = tasks.filter(t => t.id !== taskId)
    saveTasks(filtered)
    return true
  } catch (error) {
    console.error('[VIP] Error deleting task:', error)
    throw new Error(`Failed to delete task: ${error.message}`)
  }
}

