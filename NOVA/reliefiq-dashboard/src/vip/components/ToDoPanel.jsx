import React, { useState, useEffect } from 'react'
import { generateTasks } from '../utils/aiClient'

const ToDoPanel = ({ regionData, ngo, onTasksUpdate }) => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [completedTasks, setCompletedTasks] = useState(new Set())

  useEffect(() => {
    if (regionData && ngo) {
      loadTasks()
    } else {
      setTasks([])
      setCompletedTasks(new Set())
    }
  }, [regionData, ngo])

  const loadTasks = async () => {
    if (!regionData || !ngo) return

    setLoading(true)
    setError(null)

    try {
      const generatedTasks = await generateTasks(regionData, ngo)
      setTasks(generatedTasks)
      setCompletedTasks(new Set())
      if (onTasksUpdate) {
        onTasksUpdate(generatedTasks)
      }
    } catch (err) {
      console.error('[VIP] Error loading tasks:', err)
      setError(err.message)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const toggleTask = (index) => {
    const newCompleted = new Set(completedTasks)
    if (newCompleted.has(index)) {
      newCompleted.delete(index)
    } else {
      newCompleted.add(index)
    }
    setCompletedTasks(newCompleted)
  }

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  if (!regionData || !ngo) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 h-full">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Volunteer To-Do List</h2>
        <p className="text-gray-500 text-center">Select a region and NGO to generate tasks</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">Volunteer To-Do List</h2>
        <button
          onClick={loadTasks}
          disabled={loading}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Generating tasks...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {!loading && !error && tasks.length === 0 && (
        <p className="text-gray-500 text-center py-8">No tasks generated yet</p>
      )}

      {!loading && tasks.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-3">
          {tasks.map((task, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 transition-all ${
                completedTasks.has(index)
                  ? 'bg-gray-50 border-gray-300 opacity-60'
                  : 'bg-white border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={completedTasks.has(index)}
                  onChange={() => toggleTask(index)}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-1">
                  <p
                    className={`text-sm ${
                      completedTasks.has(index) ? 'line-through text-gray-500' : 'text-gray-800'
                    }`}
                  >
                    {task.task}
                  </p>
                  <div className="mt-2">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded border ${getPriorityColor(
                        task.priority
                      )}`}
                    >
                      {task.priority || 'Medium'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ToDoPanel

