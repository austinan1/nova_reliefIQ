import React, { useState } from 'react'
import { analyzeImage } from '../utils/aiClient'

const ImageAnalyzer = ({ regionData, metrics }) => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB.')
      return
    }

    setSelectedFile(file)
    setError(null)
    setAnalysis(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleAnalyze = async () => {
    if (!selectedFile || !regionData) {
      setError('Please select an image and ensure a region is selected.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const context = {
        region: regionData.district,
        metrics: metrics || {}
      }

      const result = await analyzeImage(selectedFile, context)
      setAnalysis(result)
    } catch (err) {
      console.error('[VIP] Error analyzing image:', err)
      setError(err.message)
      setAnalysis(null)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setSelectedFile(null)
    setPreview(null)
    setAnalysis(null)
    setError(null)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Image Analyzer</h2>

      {!regionData ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-center">Select a region to analyze images</p>
        </div>
      ) : (
        <>
          {/* File Input */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Upload Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              disabled={loading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="mb-4">
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-48 object-contain rounded-lg border border-gray-200 bg-gray-50"
                />
                {selectedFile && (
                  <button
                    onClick={handleClear}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition-colors"
                    title="Clear image"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <div className="mt-2 flex space-x-2">
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {loading ? 'Analyzing...' : 'Analyze Image'}
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Analyzing image...</span>
            </div>
          )}

          {/* Analysis Result */}
          {analysis && (
            <div className="flex-1 overflow-y-auto">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Analysis Result</h3>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">{analysis}</div>
              </div>
            </div>
          )}

          {!preview && !loading && !analysis && (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-400 text-center">Upload an image to analyze</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ImageAnalyzer

