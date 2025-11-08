# ReliefIQ - Nepal Disaster Response Dashboard

A modern, map-centered React + D3.js dashboard for visualizing NGO capabilities, disaster data, and AI-generated relief recommendations for Nepal.

## 🚀 Features

- **Interactive Map Visualization**: D3.js-powered choropleth map showing NGO-district match scores
- **NGO Selection**: Dynamic NGO selector with real-time map recoloring
- **District Details**: Sidebar with detailed metrics and AI-generated action plans
- **AI Chat Assistant**: OpenAI-powered chat for humanitarian decision support
- **Statistics Panel**: Summary metrics and visualizations
- **Responsive Design**: Modern UI with TailwindCSS

## 📋 Prerequisites

- Node.js 18+ and npm
- OpenAI API key (for AI features)

## 🛠️ Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd reliefiq-dashboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your OpenAI API key:
   ```
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Add data files to `public/data/`:**
   - `ngo_capabilities_converted.csv`
   - `pdna_district_damage.csv`
   - `population_density.csv`
   - `ngo_region_scores.csv`
   - `nepal-districts.geojson`

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
The app will be available at `http://localhost:3000`

### Production Build
```bash
npm run build
npm run preview
```

## 📂 Project Structure

```
reliefiq-dashboard/
├── public/
│   ├── index.html
│   └── data/              # Data files go here
├── src/
│   ├── components/
│   │   ├── MapView.jsx        # D3.js map visualization
│   │   ├── Sidebar.jsx        # District details sidebar
│   │   ├── ChatAssistant.jsx # AI chat widget
│   │   ├── Header.jsx         # Header with NGO selector
│   │   └── StatsPanel.jsx     # Statistics panel
│   ├── utils/
│   │   ├── dataLoader.js      # CSV/GeoJSON loading
│   │   ├── colorScales.js     # Color scale utilities
│   │   └── aiClient.js        # OpenAI API client
│   ├── styles/
│   │   └── global.css         # Global styles
│   ├── App.jsx                # Main app component
│   └── main.jsx               # Entry point
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🎨 Customization

### Changing Colors

Edit `src/utils/colorScales.js` to modify the color scheme:
- Red = Poor match (0-33)
- Yellow = Medium match (33-66)
- Green = Good match (66-100)
- Blue = Best match (100+)

### Adding New Data

1. Add CSV files to `public/data/`
2. Update `src/utils/dataLoader.js` to load new files
3. Merge data in the `loadData()` function

### Customizing AI Prompts

Edit `src/utils/aiClient.js` to modify:
- `generatePlan()` - Action plan generation prompt
- `generateChatResponse()` - Chat assistant prompt

## 🔧 Technologies Used

- **React 18** - UI framework
- **D3.js 7** - Data visualization and map rendering
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **OpenAI API** - AI-powered recommendations
- **Framer Motion** - Smooth animations
- **React Select** - Dropdown component

## 📊 Data Format

### Expected CSV Structure

**ngo_region_scores.csv:**
```csv
NGO,district,match,urgency,fitness_score
CARE Nepal,Sindhupalchok,0.78,0.64,0.71
```

**pdna_district_damage.csv:**
```csv
district,houses_destroyed_pct,health_facilities_damaged_pct,...
Sindhupalchok,96.0,90.0,...
```

**population_density.csv:**
```csv
district,pop_density
Sindhupalchok,110.0
```

### GeoJSON Structure

The `nepal-districts.geojson` file should contain:
- Feature properties with district names (NAME, DISTRICT, name, or district)
- Geometry data for each district

## 🐛 Troubleshooting

### Map not displaying
- Check that `nepal-districts.geojson` is in `public/data/`
- Verify GeoJSON structure in browser console

### Data not loading
- Ensure all CSV files are in `public/data/`
- Check browser console for errors
- Verify CSV column names match expected format

### AI features not working
- Verify `VITE_OPENAI_API_KEY` is set in `.env`
- Check OpenAI API quota/limits
- Review browser console for API errors

## 📝 License

MIT License - feel free to use and modify for your humanitarian projects.

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

## 📧 Support

For questions or issues, please open an issue on the repository.

