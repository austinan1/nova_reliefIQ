# ReliefIQ - Nepal Disaster Response Dashboard

An interactive dashboard for humanitarian responders and NGOs to visualize disaster damage, NGO capabilities, and population data to generate AI-assisted relief recommendations and interactive response planning.

## 🚀 Features

- **Interactive Map Visualization**: Choropleth map of Nepal districts colored by NGO match scores (Red → Poor, Yellow → Good, Green → Better, Blue → Best)
- **NGO Selection**: Dropdown to select and filter by specific NGOs
- **AI-Powered Action Plans**: Generate personalized relief plans using OpenAI GPT-4
- **District Click Interaction**: Click on any district to view detailed metrics and AI-generated action plan
- **Priority Recommendations**: Top 5 priority districts based on match, urgency, and fitness scores
- **Real-time Data Analysis**: Summary cards with key metrics and statistics
- **Modern React + D3.js Interface**: Fast, responsive, and interactive web application

## 📋 Prerequisites

- **Node.js** 18+ and npm (for React frontend)
- **Python** 3.8+ (for data generation scripts)
- **OpenAI API key** (for AI features)
- Internet connection (for map visualization)

## 🛠️ Installation

### Step 1: Data Preparation (Python)

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Generate NGO region scores:**
   ```bash
   python generate_ngo_scores.py
   ```
   This will create `data/output/ngo_region_scores.csv` with match, urgency, and fitness scores for each NGO-district combination.

3. **Download Nepal districts GeoJSON file:**
   ```bash
   python download_geojson.py
   ```
   Or manually download a Nepal districts GeoJSON file and save it as `data/nepal-districts.geojson`
   
   You can find Nepal GeoJSON files at:
   - https://github.com/codefornepal/nepalmap
   - https://github.com/younginnovations/nepal-geojson

### Step 2: React Frontend Setup

1. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

2. **Copy data files to public directory:**
   ```bash
   # Create public/data directories
   mkdir -p public/data/input public/data/output
   
   # Copy data files
   cp -r data/input/* public/data/input/
   cp -r data/output/* public/data/output/
   cp data/nepal-districts.geojson public/data/
   ```

3. **Set up OpenAI API key:**
   Create a `.env` file in the project root:
   ```bash
   echo "VITE_OPENAI_API_KEY=your_api_key_here" > .env
   ```
   Or manually create `.env` with:
   ```
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```
   Get your API key from: https://platform.openai.com/api-keys
   
   **⚠️ Security Note**: In production, use a backend proxy instead of exposing the API key in the frontend.

## 🎯 Usage

### Start the React Development Server

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   The app will automatically open at `http://localhost:3000`

3. **Use the dashboard:**
   - Select an NGO from the left sidebar dropdown
   - View the interactive D3.js map showing district match scores
   - **Click on any district** to open the right info panel with detailed metrics
   - View AI-generated action plans for selected districts
   - Check the top 5 priority districts in the sidebar
   - View summary cards at the top with key metrics

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory. Deploy this directory to any static hosting service.

## 📁 Project Structure

```
nova_reliefIQ/
├── data/                      # Source data files
│   ├── input/
│   │   ├── ngo_capabilities.csv
│   │   ├── pdna_district_damage.csv
│   │   └── population_density.csv
│   ├── output/
│   │   └── ngo_region_scores.csv (generated)
│   └── nepal-districts.geojson (downloaded)
├── public/                     # Public assets (copy data files here)
│   └── data/                   # Data files served to frontend
│       ├── input/
│       ├── output/
│       └── nepal-districts.geojson
├── src/                        # React source code
│   ├── components/            # React components
│   │   ├── MapVisualization.jsx
│   │   ├── InfoPanel.jsx
│   │   ├── SummaryCards.jsx
│   │   ├── NGOSelector.jsx
│   │   └── PriorityRecommendations.jsx
│   ├── utils/                 # Utility functions
│   │   ├── dataLoader.js      # CSV/GeoJSON loading
│   │   └── aiService.js       # OpenAI API integration
│   ├── App.jsx                # Main app component
│   ├── App.css
│   ├── main.jsx               # Entry point
│   └── index.css
├── package.json                # Node.js dependencies
├── vite.config.js              # Vite configuration
├── generate_ngo_scores.py      # Python script to generate NGO scores
├── download_geojson.py         # Python script to download GeoJSON
├── requirements.txt            # Python dependencies
├── .env                        # Environment variables (create this)
└── README.md                   # This file
```

## 📊 Data Files

### Input Data

- **pdna_district_damage.csv**: Contains damage metrics for each district (houses destroyed, health facilities damaged, water facilities damaged, etc.)
- **population_density.csv**: Population density per district
- **ngo_capabilities.csv**: NGO capabilities and focus areas with capacity scores
- **ngo_region_scores.csv**: Generated file with match, urgency, and fitness scores for each NGO-district combination

### Generated Data

- **ngo_region_scores.csv**: Created by `generate_ngo_scores.py`, contains:
  - `NGO`: NGO name
  - `district`: District name
  - `match`: Match score (0-100) based on NGO capabilities vs district needs
  - `urgency`: Urgency score (0-100) based on damage metrics
  - `fitness_score`: Combined fitness score (0-100) for prioritization

## 🧠 How It Works

### Match Score Calculation
The match score is calculated based on how well an NGO's capabilities align with a district's needs:
- Health facilities damaged → Emergency Health Response capability
- Water facilities damaged → Water & Sanitation Recovery capability
- Food insecure households → Emergency Food Distribution capability
- Houses destroyed → Emergency Shelter & Housing capability
- Public infrastructure damaged → Critical Infrastructure Restoration capability

### Urgency Score Calculation
The urgency score combines multiple damage metrics:
- Houses destroyed (20%)
- Health facilities damaged (15%)
- Water facilities damaged (15%)
- Food insecure households (20%)
- Displaced population (15%)
- Road accessibility (15%)

### Fitness Score
The fitness score combines match and urgency:
```
fitness_score = (match_score * 0.6 + urgency * 0.4) * 100
```

## 🤖 AI Features

The dashboard uses OpenAI's GPT-4 model to:
- Generate personalized action plans for selected districts
- Answer contextual questions about disaster response
- Provide recommendations based on available data

**Note**: AI features require a valid OpenAI API key. Without it, the app will still function but AI-generated content will show error messages.

## 🎨 UI Components

- **Header**: "ReliefIQ – Nepal Disaster Response Dashboard" with gradient styling
- **Left Sidebar**: NGO selector and top 5 priority districts list
- **Summary Cards**: Quick metrics at the top (Total NGOs, Districts, Avg Damage, etc.)
- **Interactive D3.js Map**: 
  - Choropleth map with color-coded districts (Red → Poor, Yellow → Good, Green → Better, Blue → Best)
  - Hover tooltips showing key metrics
  - Click on districts to open info panel
  - Legend showing color scale
- **Right Info Panel**: 
  - Detailed district metrics (8 key metrics)
  - AI-generated action plan with markdown formatting
  - Closable panel with smooth animations
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🔧 Troubleshooting

### Data files not loading
- Ensure data files are copied to `public/data/` directory
- Check browser console for 404 errors
- Verify file paths match the structure in `public/data/`

### GeoJSON file not found
- Run `python download_geojson.py` to download the file
- Copy it to `public/data/nepal-districts.geojson`
- Check browser console for loading errors

### NGO region scores not found
- Run `python generate_ngo_scores.py` to generate the file
- Copy `data/output/ngo_region_scores.csv` to `public/data/output/`

### OpenAI API errors
- Check that your `.env` file contains a valid `VITE_OPENAI_API_KEY` (note the `VITE_` prefix)
- Restart the dev server after changing `.env` file
- Ensure you have API credits available
- Check your internet connection
- **Security**: In production, use a backend proxy instead of exposing API keys

### Map not displaying
- Ensure the GeoJSON file is in `public/data/nepal-districts.geojson`
- Check that district names match between CSV and GeoJSON files
- Open browser console to check for D3.js errors
- Verify D3.js is properly installed: `npm list d3`

### Build errors
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Check Node.js version: `node --version` (should be 18+)
- Check for TypeScript errors in console

## 📝 Adding New Datasets

To add new datasets:

1. **Add CSV file** to `data/input/` directory and copy to `public/data/input/`
2. **Update `src/utils/dataLoader.js`** to load the new data:
   ```javascript
   const newData = await loadCSV('/data/input/new_data.csv')
   ```
3. **Merge with existing data** in the `loadData` function
4. **Update components** to display new metrics:
   - Add to `InfoPanel.jsx` for district details
   - Add to `SummaryCards.jsx` for summary metrics
   - Update `MapVisualization.jsx` hover tooltips

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available for humanitarian use.

## 🙏 Acknowledgments

- Data sources: PDNA (Post-Disaster Needs Assessment) data
- GeoJSON: Nepal districts boundary data from open sources
- Built with React, D3.js, Vite, and OpenAI
- Map visualization powered by D3.js and GeoJSON

## 📞 Support

For issues or questions, please open an issue on the repository or contact the development team.

---

**Built with ❤️ for humanitarian responders**
