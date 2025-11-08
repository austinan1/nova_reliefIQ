import React, { useState, useEffect } from 'react'
import { fetchTasks, createTask, updateTask, deleteTask, generateTasks } from '../utils/aiClient'

const ToDoPanel = ({ regionData, ngo, onTasksUpdate }) => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTask, setNewTask] = useState({
    description: '',
    priority: 'Medium',
    due_date: ''
  })
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [showAiSuggestions, setShowAiSuggestions] = useState(false)
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set())

  useEffect(() => {
    if (regionData && ngo) {
      loadTasks()
    } else {
      setTasks([])
    }
  }, [regionData, ngo])

  const loadTasks = () => {
    if (!regionData || !ngo) return

    setLoading(true)
    setError(null)

    try {
      const fetchedTasks = fetchTasks(regionData.district, ngo)
      setTasks(fetchedTasks || [])
      if (onTasksUpdate) {
        onTasksUpdate(fetchedTasks || [])
      }
    } catch (err) {
      console.error('[VIP] Error loading tasks:', err)
      setError(err.message)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }


  const handleAddTask = () => {
    if (!newTask.description.trim() || !regionData || !ngo) return

    try {
      const taskData = {
        region: regionData.district,
        assigned_to: ngo,
        priority: newTask.priority,
        status: 'pending',
        due_date: newTask.due_date || null,
        description: newTask.description
      }

      createTask(taskData)
      setNewTask({ description: '', priority: 'Medium', due_date: '' })
      setShowAddForm(false)
      loadTasks()
    } catch (err) {
      console.error('[VIP] Error creating task:', err)
      setError(err.message)
    }
  }

  const handleToggleStatus = (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed'
      updateTask(task.id, { status: newStatus })
      loadTasks()
    } catch (err) {
      console.error('[VIP] Error updating task:', err)
      setError(err.message)
    }
  }

  const handleDeleteTask = (taskId) => {
    try {
      deleteTask(taskId)
      loadTasks()
    } catch (err) {
      console.error('[VIP] Error deleting task:', err)
      setError(err.message)
    }
  }

  const handleGenerateAISuggestions = async () => {
    if (!regionData || !ngo) return

    setLoadingSuggestions(true)
    setError(null)

    try {
      const suggestedTasks = await generateTasks(regionData, ngo)
      setAiSuggestions(suggestedTasks)
      setShowAiSuggestions(true)
      setSelectedSuggestions(new Set(suggestedTasks.map((_, index) => index)))
    } catch (err) {
      console.error('[VIP] Error generating AI suggestions:', err)
      setError(err.message)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleToggleSuggestion = (index) => {
    const newSelected = new Set(selectedSuggestions)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedSuggestions(newSelected)
  }

  const handleAddSelectedSuggestions = () => {
    if (!regionData || !ngo || selectedSuggestions.size === 0) return

    try {
      const tasksToAdd = aiSuggestions
        .filter((_, index) => selectedSuggestions.has(index))
        .map(suggestion => ({
          region: regionData.district,
          assigned_to: ngo,
          description: suggestion.task,
          priority: suggestion.priority || 'Medium',
          status: 'pending',
          due_date: null
        }))

      tasksToAdd.forEach(taskData => {
        createTask(taskData)
      })

      setShowAiSuggestions(false)
      setAiSuggestions([])
      setSelectedSuggestions(new Set())
      loadTasks()
    } catch (err) {
      console.error('[VIP] Error adding suggested tasks:', err)
      setError(err.message)
    }
  }

  const handleAddAllSuggestions = () => {
    if (!regionData || !ngo || aiSuggestions.length === 0) return

    try {
      const tasksToAdd = aiSuggestions.map(suggestion => ({
        region: regionData.district,
        assigned_to: ngo,
        description: suggestion.task,
        priority: suggestion.priority || 'Medium',
        status: 'pending',
        due_date: null
      }))

      tasksToAdd.forEach(taskData => {
        createTask(taskData)
      })

      setShowAiSuggestions(false)
      setAiSuggestions([])
      setSelectedSuggestions(new Set())
      loadTasks()
    } catch (err) {
      console.error('[VIP] Error adding all suggested tasks:', err)
      setError(err.message)
    }
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
    <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">Volunteer To-Do List</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleGenerateAISuggestions}
            disabled={loadingSuggestions}
            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Get AI-suggested tasks"
          >
            {loadingSuggestions ? '...' : '🤖 AI Suggest'}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            + Add
          </button>
          <button
            onClick={loadTasks}
            disabled={loading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* AI Suggestions Section */}
      {showAiSuggestions && aiSuggestions.length > 0 && (
        <div className="mb-4 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-purple-800 flex items-center">
              <span className="mr-2">🤖</span>
              AI-Suggested Tasks ({aiSuggestions.length})
            </h3>
            <button
              onClick={() => {
                setShowAiSuggestions(false)
                setAiSuggestions([])
                setSelectedSuggestions(new Set())
              }}
              className="text-purple-600 hover:text-purple-800 text-sm"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
            {aiSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedSuggestions.has(index)
                    ? 'bg-purple-100 border-purple-400'
                    : 'bg-white border-purple-200 hover:border-purple-300'
                }`}
                onClick={() => handleToggleSuggestion(index)}
              >
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedSuggestions.has(index)}
                    onChange={() => handleToggleSuggestion(index)}
                    className="mt-1 w-4 h-4 text-purple-600 border-purple-300 rounded focus:ring-purple-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{suggestion.task}</p>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded border ${getPriorityColor(
                        suggestion.priority
                      )}`}
                    >
                      {suggestion.priority || 'Medium'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleAddSelectedSuggestions}
              disabled={selectedSuggestions.size === 0}
              className="flex-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
            >
              Add Selected ({selectedSuggestions.size})
            </button>
            <button
              onClick={handleAddAllSuggestions}
              className="flex-1 px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm font-semibold transition-colors"
            >
              Add All
            </button>
          </div>
        </div>
      )}

      {/* Add Task Form */}
      {showAddForm && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Add New Task</h3>
          <textarea
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            placeholder="Task description..."
            className="w-full px-3 py-2 border border-gray-300 rounded mb-2 text-sm resize-none"
            rows="2"
          />
          <div className="flex space-x-2 mb-2">
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            <input
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleAddTask}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Create Task
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewTask({ description: '', priority: 'Medium', due_date: '' })
              }}
              className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading tasks...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {!loading && !error && tasks.length === 0 && (
        <p className="text-gray-500 text-center py-8">No tasks yet. Click "+ Add" to create your first task.</p>
      )}

      {!loading && tasks.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                task.status === 'completed'
                  ? 'bg-gray-50 border-gray-300 opacity-60'
                  : 'bg-white border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={task.status === 'completed'}
                  onChange={() => handleToggleStatus(task)}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-1">
                  <p
                    className={`text-sm ${
                      task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'
                    }`}
                  >
                    {task.description}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex space-x-2">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded border ${getPriorityColor(
                          task.priority
                        )}`}
                      >
                        {task.priority || 'Medium'}
                      </span>
                      {task.due_date && (
                        <span className="text-xs text-gray-500">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                      title="Delete task"
                    >
                      ✕
                    </button>
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

