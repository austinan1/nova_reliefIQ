# ReliefIQ - Nepal Disaster Response Dashboard

An interactive dashboard for humanitarian responders and NGOs to visualize disaster damage, NGO capabilities, and population data to generate AI-assisted relief recommendations and interactive response planning.

## 🚀 Features

- **Interactive Map Visualization**: Choropleth map of Nepal districts colored by NGO match scores
- **NGO Selection**: Dropdown to select and filter by specific NGOs
- **AI-Powered Action Plans**: Generate personalized relief plans using OpenAI GPT-4
- **Interactive Chat Assistant**: Ask contextual questions about disaster response
- **Priority Recommendations**: Top 5 priority districts based on match, urgency, and fitness scores
- **Real-time Data Analysis**: Summary cards with key metrics and statistics

## 📋 Prerequisites

- Python 3.8 or higher
- OpenAI API key (for AI features)
- Internet connection (for map visualization)

## 🛠️ Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd nova_reliefIQ
   ```

2. **Install required packages:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Generate NGO region scores:**
   ```bash
   python generate_ngo_scores.py
   ```
   This will create `data/input/ngo_region_scores.csv` with match, urgency, and fitness scores for each NGO-district combination.

4. **Download Nepal districts GeoJSON file:**
   ```bash
   python download_geojson.py
   ```
   Or manually download a Nepal districts GeoJSON file and save it as `data/nepal-districts.geojson`
   
   You can find Nepal GeoJSON files at:
   - https://github.com/codefornepal/nepalmap
   - https://github.com/younginnovations/nepal-geojson

5. **Set up OpenAI API key:**
   Create a `.env` file in the project root:
   ```bash
   echo "OPENAI_API_KEY=your_api_key_here" > .env
   ```
   Or manually create `.env` with:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```
   Get your API key from: https://platform.openai.com/api-keys

## 🎯 Usage

1. **Start the Streamlit app:**
   ```bash
   streamlit run app.py
   ```

2. **Open your browser:**
   The app will automatically open at `http://localhost:8501`

3. **Use the dashboard:**
   - Select an NGO from the sidebar dropdown
   - View the interactive map showing district match scores
   - Click on districts to see detailed metrics
   - Use the chat assistant to ask questions
   - View AI-generated action plans for selected districts

## 📁 Project Structure

```
nova_reliefIQ/
├── data/
│   ├── input/
│   │   ├── ngo_capabilities.csv
│   │   ├── pdna_district_damage.csv
│   │   ├── population_density.csv
│   │   └── ngo_region_scores.csv (generated)
│   └── nepal-districts.geojson (downloaded)
├── app.py                    # Main Streamlit application
├── generate_ngo_scores.py    # Script to generate NGO region scores
├── download_geojson.py       # Script to download GeoJSON file
├── requirements.txt          # Python dependencies
├── .env                      # Environment variables (create this)
└── README.md                 # This file
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

- **Header**: "ReliefIQ – Nepal Disaster Response Dashboard"
- **Summary Cards**: Quick metrics at the top (Total NGOs, Districts, Avg Damage, etc.)
- **Interactive Map**: Choropleth map with hover tooltips and district selection
- **Priority Districts Table**: Top 5 districts ranked by fitness score
- **District Details**: Detailed metrics and AI-generated action plan
- **Chat Assistant**: Interactive Q&A interface

## 🔧 Troubleshooting

### GeoJSON file not found
- Run `python download_geojson.py` to download the file
- Or manually download and place it in `data/nepal-districts.geojson`

### NGO region scores not found
- Run `python generate_ngo_scores.py` to generate the file

### OpenAI API errors
- Check that your `.env` file contains a valid `OPENAI_API_KEY`
- Ensure you have API credits available
- Check your internet connection

### Map not displaying
- Ensure the GeoJSON file is in the correct location
- Check that district names match between CSV and GeoJSON files
- The app will show a data table fallback if GeoJSON is unavailable

## 📝 Adding New Datasets

To add new datasets:

1. **Add CSV file** to `data/input/` directory
2. **Update `app.py`** to load the new data:
   ```python
   @st.cache_data
   def load_new_data():
       return pd.read_csv('data/input/new_data.csv')
   ```
3. **Merge with existing data** in the merge functions
4. **Update visualizations** to include new metrics

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available for humanitarian use.

## 🙏 Acknowledgments

- Data sources: PDNA (Post-Disaster Needs Assessment) data
- GeoJSON: Nepal districts boundary data from open sources
- Built with Streamlit, Plotly, and OpenAI

## 📞 Support

For issues or questions, please open an issue on the repository or contact the development team.

---

**Built with ❤️ for humanitarian responders**
