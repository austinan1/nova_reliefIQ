import React from 'react'

const VIPView = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
            VIP PLATFORM
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Welcome to VIP Dashboard
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your exclusive platform for advanced insights and premium features
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
          <div className="text-center py-16">
            <div className="text-6xl mb-6">✨</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Coming Soon
            </h2>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              This is your VIP platform. Premium features and advanced analytics will be available here.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VIPView

