# VIP Section Expansion - Implementation Guide

This document describes the expanded VIP (Volunteer Information Platform) features for the ReliefIQ dashboard.

## 🎯 Overview

The VIP section has been expanded with the following features:

1. **Enhanced Chatbot Interface** - Context-aware assistant with model.pkl integration
2. **Task Management System** - Full CRUD with localStorage persistence (client-side only)
3. **Image Analysis with Routing** - Computer vision + alternate route suggestions
4. **Real-Time Monitoring** - Earthquake and weather data feeds
5. **District-Specific Guidance** - Auto-generated action plans

## 🚀 Setup Instructions

### Frontend Setup

1. **Set environment variables:**
   
   Create a `.env` file in `NOVA/reliefiq-dashboard/`:
   ```env
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```

2. **Install dependencies (if not already done):**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

**Note:** All features are client-side only. No backend server is required. Tasks are stored in browser localStorage.

## 📋 Features

### 1. Enhanced Chatbot Interface

The chatbot now includes:
- **Model.pkl Integration**: Uses trained fitness scores for NGO-region matching
- **Context Awareness**: Understands current region, NGO, and metrics
- **Command Support**: 
  - "Show current situation in [District]"
  - "Which NGO is best positioned for [District]?"
  - "List my pending volunteer tasks"
  - "Upload a photo of blocked highway — suggest alternate route"

**Location:** `src/vip/components/ChatPanel.jsx`

### 2. Task Management System

Full CRUD operations for volunteer tasks (client-side with localStorage):
- **Create**: Add new tasks with priority, due date, and description
- **Read**: List tasks filtered by region and NGO
- **Update**: Mark tasks as completed/pending, update details
- **Delete**: Remove tasks

**Storage:** Tasks are persisted in browser localStorage (key: `reliefiq_vip_tasks`)

**Location:** `src/vip/components/ToDoPanel.jsx` and `src/vip/utils/aiClient.js`

### 3. Image Analysis with Routing

Enhanced image analyzer that:
- Analyzes uploaded images using GPT-4o vision
- Detects infrastructure damage, blocked roads, etc.
- Suggests alternate routes when blockages are detected
- Provides actionable insights

**Location:** `src/vip/components/ImageAnalyzer.jsx`

**Note:** For production, integrate with Google Maps Directions API or Mapbox for real routing.

### 4. Real-Time Monitoring

Monitors:
- **Earthquake Data**: Seismic activity from USGS (mock implementation)
- **Weather Data**: Current conditions (mock - integrate OpenWeatherMap)
- **Alerts**: Active alerts for affected districts

**Location:** `src/vip/components/RealTimeMonitoring.jsx`

**Production Integration:**
- USGS API: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson`
- OpenWeatherMap API: Requires API key

### 5. District-Specific Guidance

Auto-generated action plans including:
- **How to Act**: Immediate actions for volunteers
- **Where to Go**: Specific locations to focus on
- **What to Deliver**: Priority items and resources
- **Coordination**: NGO coordination guidelines
- **Safety Guidelines**: Important safety considerations

**Location:** `src/vip/components/DistrictGuidance.jsx`

## 🗂️ File Structure

```
NOVA/reliefiq-dashboard/
├── src/
│   └── vip/
│       ├── components/
│       │   ├── ChatPanel.jsx           # Enhanced chatbot
│       │   ├── ToDoPanel.jsx           # Task management UI
│       │   ├── ImageAnalyzer.jsx       # Image analysis
│       │   ├── RealTimeMonitoring.jsx   # Monitoring dashboard
│       │   └── DistrictGuidance.jsx    # Action plans
│       ├── utils/
│       │   ├── aiClient.js             # AI functions + localStorage tasks
│       │   └── dataLoader.js           # Data loading utilities
│       └── VipApp.jsx                  # Main VIP app component
└── VIP_EXPANSION_README.md   # This file
```

## 🔧 Configuration

### Environment Variables

**Frontend (.env):**
- `VITE_OPENAI_API_KEY`: OpenAI API key for GPT-4o (required for AI features)

**Storage:**
- Tasks are stored in browser localStorage (key: `reliefiq_vip_tasks`)
- Data persists across browser sessions
- Each browser/device has its own task storage

## 📝 Usage Examples

### Creating a Task

1. Select a region and NGO in the VIP dashboard
2. Click "+ Add" in the To-Do Panel
3. Enter task description, select priority, and set due date
4. Click "Create Task"

### Using the Chatbot

Example queries:
- "Show current situation in Dolakha"
- "Which NGO is best positioned for Sindhupalchok?"
- "List my pending volunteer tasks"
- "What are the urgent needs in this region?"

### Analyzing Images

1. Select a region
2. Upload an image in the Image Analyzer panel
3. Click "Analyze Image"
4. Review analysis and alternate route suggestions (if applicable)

## 🚧 Production Considerations

1. **Task Storage:**
   - Consider migrating to a backend API for shared task management
   - Current localStorage approach works per-browser/device
   - For multi-user collaboration, implement backend API

2. **Real-Time Monitoring:**
   - Integrate actual USGS earthquake API
   - Integrate OpenWeatherMap API
   - Set up webhook endpoints for alerts

3. **Image Analysis:**
   - Integrate Google Maps Directions API or Mapbox
   - Add image storage (S3, Cloudinary, etc.)
   - Implement image compression

4. **Security:**
   - Consider moving OpenAI API key to backend proxy
   - Add rate limiting for AI API calls
   - Implement proper error handling

## 🐛 Troubleshooting

### Tasks not persisting
- Check browser localStorage is enabled
- Clear localStorage if tasks are corrupted: `localStorage.removeItem('reliefiq_vip_tasks')`
- Tasks are stored per-browser/device

### OpenAI API errors
- Verify `VITE_OPENAI_API_KEY` is set correctly
- Check API key has sufficient credits
- Verify API key has access to GPT-4o model

## 🎉 Next Steps

1. Set up your `.env` file with `VITE_OPENAI_API_KEY`
2. Start the frontend development server: `npm run dev`
3. Switch to VIP mode in the dashboard
4. Select a region and NGO
5. Explore all the new features!

**Note:** All features work client-side only. No backend server needed!

