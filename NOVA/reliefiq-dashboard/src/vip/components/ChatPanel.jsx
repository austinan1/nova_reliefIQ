import React, { useState, useRef, useEffect } from 'react'
import { generateChatResponse } from '../utils/aiClient'

const ChatPanel = ({ regionData, ngo, metrics }) => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Reset chat when region or NGO changes
  useEffect(() => {
    setMessages([])
    setInput('')
    setError(null)
  }, [regionData, ngo])

  const buildContext = () => {
    if (!regionData || !ngo || !metrics) {
      return 'No region or NGO selected.'
    }

    return `Current Context:
- Region: ${regionData.district}
- NGO: ${ngo}
- Damage Level: ${metrics.damage_pct?.toFixed(1) || 0}% of houses destroyed
- Urgency Score: ${metrics.urgency?.toFixed(1) || 0}/100
- Population Density: ${metrics.population_density?.toFixed(1) || 0} per km²
- Accessibility: ${metrics.accessibility || 'unknown'}
- Health Facility Status: ${metrics.health_status || 'unknown'}
- NGO Coverage: ${metrics.ngo_coverage?.toFixed(1) || 0}/100`
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    if (!regionData || !ngo) {
      setError('Please select a region and NGO first.')
      return
    }

    const userMessage = input.trim()
    setInput('')
    setError(null)

    // Add user message
    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const context = buildContext()
      const response = await generateChatResponse(userMessage, context)

      // Add assistant response
      setMessages([...newMessages, { role: 'assistant', content: response }])
    } catch (err) {
      console.error('[VIP] Error generating chat response:', err)
      setError(err.message)
      setMessages([...newMessages, {
        role: 'assistant',
        content: `Error: ${err.message}. Please check your API key configuration.`
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Operations Analyst Chat</h2>

      {!regionData || !ngo ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-center text-sm">Select a region and NGO to start chatting</p>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <p className="mb-2">Ask me anything about logistics, health, forecasting, or analysis.</p>
                <p className="text-sm">Examples:</p>
                <ul className="text-sm text-left mt-2 space-y-1 max-w-md mx-auto">
                  <li>• "Rank all districts by urgency-weighted damage index"</li>
                  <li>• "Forecast food shortages based on current delivery rate"</li>
                  <li>• "Explain why Far-Western Nepal remains underfunded"</li>
                </ul>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span className="text-sm text-gray-600">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Input */}
          <div className="flex space-x-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about logistics, health, forecasting, or analysis..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows="2"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default ChatPanel

