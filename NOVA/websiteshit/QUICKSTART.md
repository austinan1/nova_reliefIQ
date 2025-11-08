# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Data Files (Python)
```bash
# Install Python dependencies
pip install -r requirements.txt

# Generate NGO region scores
python generate_ngo_scores.py

# Download GeoJSON (optional - can be done manually)
python download_geojson.py
```

### 3. Copy Data Files to Public Directory
```bash
# Create directories
mkdir -p public/data/input public/data/output

# Copy files
cp -r data/input/* public/data/input/
cp -r data/output/* public/data/output/
cp data/nepal-districts.geojson public/data/
```

Or use the setup script:
```bash
./setup.sh
```

### 4. Set Up OpenAI API Key
Create a `.env` file:
```bash
echo "VITE_OPENAI_API_KEY=your_api_key_here" > .env
```

### 5. Start Development Server
```bash
npm run dev
```

The app will open at `http://localhost:3000`

## 📋 Required Data Files

Make sure these files exist in `public/data/`:

- `public/data/input/ngo_capabilities.csv`
- `public/data/input/pdna_district_damage.csv`
- `public/data/input/population_density.csv`
- `public/data/output/ngo_region_scores.csv` (generated)
- `public/data/nepal-districts.geojson` (downloaded)

## 🎯 Usage

1. **Select an NGO** from the left sidebar dropdown
2. **View the map** - districts are color-coded by match score:
   - 🔴 Red = Poor match (0-33)
   - 🟡 Yellow = Good match (33-66)
   - 🟢 Green = Better match (66-80)
   - 🔵 Blue = Best match (80-100)
3. **Click on a district** to open the info panel with:
   - Detailed metrics
   - AI-generated action plan
4. **Check priority districts** in the left sidebar

## 🔧 Troubleshooting

### Data files not loading?
- Check browser console for 404 errors
- Verify files are in `public/data/` directory
- Ensure file paths match exactly

### Map not displaying?
- Check that GeoJSON file exists in `public/data/nepal-districts.geojson`
- Open browser console to check for D3.js errors
- Verify district names match between CSV and GeoJSON

### OpenAI API not working?
- Check `.env` file has `VITE_OPENAI_API_KEY` (note the `VITE_` prefix)
- Restart dev server after changing `.env`
- Check browser console for API errors

## 📚 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Customize the dashboard for your needs
- Add new data sources
- Deploy to production

