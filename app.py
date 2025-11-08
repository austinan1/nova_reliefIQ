"""
ReliefIQ - Nepal Disaster Response Dashboard
Interactive dashboard for humanitarian responders and NGOs
"""
import streamlit as st
import pandas as pd
import geopandas as gpd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import os
from dotenv import load_dotenv
import openai
from typing import Dict, List, Optional
import json

# Load environment variables
load_dotenv()

# Page configuration
st.set_page_config(
    page_title="ReliefIQ - Nepal Disaster Response Dashboard",
    page_icon="🚨",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for modern styling
st.markdown("""
    <style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1f77b4;
        text-align: center;
        padding: 1rem 0;
        margin-bottom: 2rem;
    }
    .metric-card {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #1f77b4;
    }
    .stButton>button {
        width: 100%;
        background-color: #1f77b4;
        color: white;
    }
    </style>
""", unsafe_allow_html=True)

# Cache data loading functions
@st.cache_data
def load_damage_data():
    """Load PDNA district damage data"""
    df = pd.read_csv('data/input/pdna_district_damage.csv')
    df['district'] = df['district'].str.strip().str.lower()
    return df

@st.cache_data
def load_population_data():
    """Load population density data"""
    df = pd.read_csv('data/input/population_density.csv')
    df['district'] = df['district'].str.strip().str.lower()
    return df

@st.cache_data
def load_ngo_capabilities():
    """Load NGO capabilities data"""
    df = pd.read_csv('data/input/ngo_capabilities.csv')
    return df

@st.cache_data
def load_ngo_scores():
    """Load NGO region scores data"""
    try:
        df = pd.read_csv('data/input/ngo_region_scores.csv')
        df['district'] = df['district'].str.strip().str.lower()
        df['NGO'] = df['NGO'].str.strip()
        return df
    except FileNotFoundError:
        st.error("ngo_region_scores.csv not found. Please run generate_ngo_scores.py first.")
        return None

@st.cache_data
def load_geojson():
    """Load Nepal districts GeoJSON"""
    try:
        gdf = gpd.read_file('data/nepal-districts.geojson')
        # Normalize district names
        if 'NAME' in gdf.columns:
            gdf['district'] = gdf['NAME'].str.strip().str.lower()
        elif 'DISTRICT' in gdf.columns:
            gdf['district'] = gdf['DISTRICT'].str.strip().str.lower()
        elif 'name' in gdf.columns:
            gdf['district'] = gdf['name'].str.strip().str.lower()
        else:
            # Try to find a column with district names
            for col in gdf.columns:
                if 'district' in col.lower() or 'name' in col.lower():
                    gdf['district'] = gdf[col].str.strip().str.lower()
                    break
        return gdf
    except FileNotFoundError:
        st.warning("GeoJSON file not found. Map visualization will be limited.")
        return None
    except Exception as e:
        st.warning(f"Error loading GeoJSON: {str(e)}. Map visualization will be limited.")
        return None

def normalize_district_name(name: str) -> str:
    """Normalize district name for matching"""
    return str(name).strip().lower()

def merge_all_data(damage_df, pop_df, scores_df):
    """Merge all dataframes by district"""
    # Start with damage data
    merged = damage_df.copy()
    
    # Merge population data
    merged = merged.merge(pop_df, on='district', how='left')
    
    return merged

def get_merged_data_with_ngo(damage_df, pop_df, scores_df, selected_ngo: str):
    """Get merged data filtered by selected NGO"""
    # Filter scores for selected NGO
    ngo_scores = scores_df[scores_df['NGO'] == selected_ngo].copy()
    
    # Merge with damage and population data
    merged = damage_df.merge(pop_df, on='district', how='left')
    merged = merged.merge(ngo_scores, on='district', how='left')
    
    return merged

def create_choropleth_map(gdf, merged_data, selected_ngo: str):
    """Create choropleth map with NGO match scores"""
    # Merge GeoJSON with data
    map_data = gdf.merge(merged_data, on='district', how='left')
    
    # Fill NaN values
    map_data['match'] = map_data['match'].fillna(0)
    map_data['urgency'] = map_data['urgency'].fillna(0)
    map_data['fitness_score'] = map_data['fitness_score'].fillna(0)
    
    # Create hover text
    map_data['hover_text'] = map_data.apply(
        lambda row: f"<b>{row.get('NAME', row.get('DISTRICT', row.get('name', 'Unknown')))}</b><br>"
        f"Match Score: {row.get('match', 0):.1f}<br>"
        f"Urgency: {row.get('urgency', 0):.1f}<br>"
        f"Fitness Score: {row.get('fitness_score', 0):.1f}<br>"
        f"Damage %: {row.get('houses_destroyed_pct', 0):.1f}<br>"
        f"Population Density: {row.get('pop_density', 0):.1f}",
        axis=1
    )
    
    # Create figure
    fig = px.choropleth_mapbox(
        map_data,
        geojson=map_data.geometry,
        locations=map_data.index,
        color='match',
        hover_name='hover_text',
        hover_data={
            'match': ':.1f',
            'urgency': ':.1f',
            'fitness_score': ':.1f',
            'houses_destroyed_pct': ':.1f',
            'pop_density': ':.1f'
        },
        color_continuous_scale='RdYlGn',
        range_color=(0, 100),
        mapbox_style='open-street-map',
        zoom=6.5,
        center={'lat': 28.3949, 'lon': 84.1240},
        opacity=0.7,
        labels={'match': 'Match Score'}
    )
    
    fig.update_layout(
        height=600,
        margin=dict(l=0, r=0, t=0, b=0),
        mapbox=dict(
            center={'lat': 28.3949, 'lon': 84.1240},
            zoom=6.5
        )
    )
    
    return fig

def get_top_priority_districts(scores_df, selected_ngo: str, n: int = 5):
    """Get top N priority districts for selected NGO"""
    ngo_scores = scores_df[scores_df['NGO'] == selected_ngo].copy()
    ngo_scores = ngo_scores.sort_values('fitness_score', ascending=False)
    return ngo_scores.head(n)

def generate_ai_action_plan(district_data: Dict, selected_ngo: str, damage_df: pd.DataFrame, 
                           ngo_capabilities: pd.DataFrame) -> str:
    """Generate AI-powered action plan using OpenAI API"""
    api_key = os.getenv('OPENAI_API_KEY')
    
    if not api_key:
        return "⚠️ OpenAI API key not found. Please set OPENAI_API_KEY in your .env file."
    
    try:
        client = openai.OpenAI(api_key=api_key)
        
        # Prepare context
        district_name = district_data.get('district', 'Unknown').title()
        damage_pct = district_data.get('houses_destroyed_pct', 0)
        urgency = district_data.get('urgency', 0)
        match_score = district_data.get('match', 0)
        
        # Get NGO capabilities
        ngo_caps = ngo_capabilities[ngo_capabilities['ngo_name'] == selected_ngo]
        capabilities = ngo_caps[ngo_caps['capacity_score'] > 0]['category'].tolist()
        
        prompt = f"""You are a disaster response coordinator for Nepal. Generate a personalized relief action plan for {selected_ngo} in {district_name} district.

District Context:
- Damage Level: {damage_pct:.1f}% of houses destroyed
- Urgency Score: {urgency:.1f}/100
- Match Score: {match_score:.1f}/100
- Population Density: {district_data.get('pop_density', 0):.1f} per km²

NGO Capabilities: {', '.join(capabilities)}

Generate a concise 3-step action plan including:
1. Situation Summary (damage assessment and urgency)
2. Recommended Resource Allocations (specific to NGO capabilities)
3. Coordination Suggestions (with other NGOs if needed)
4. Potential Bottlenecks or Access Issues

Format as markdown with clear sections."""
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert disaster response coordinator with deep knowledge of humanitarian aid and Nepal's geography."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=800
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        return f"⚠️ Error generating action plan: {str(e)}"

def generate_chat_response(user_query: str, context_data: pd.DataFrame, 
                          selected_ngo: str, ngo_capabilities: pd.DataFrame) -> str:
    """Generate AI chat response using OpenAI API"""
    api_key = os.getenv('OPENAI_API_KEY')
    
    if not api_key:
        return "⚠️ OpenAI API key not found. Please set OPENAI_API_KEY in your .env file."
    
    try:
        client = openai.OpenAI(api_key=api_key)
        
        # Prepare context summary
        context_summary = f"""
Available Data:
- {len(context_data)} districts with damage and population data
- Selected NGO: {selected_ngo}
- NGO Capabilities: {', '.join(ngo_capabilities[ngo_capabilities['ngo_name'] == selected_ngo][ngo_capabilities['capacity_score'] > 0]['category'].unique())}

Top Priority Districts:
{context_data.nlargest(5, 'fitness_score')[['district', 'match', 'urgency', 'fitness_score']].to_string()}
"""
        
        prompt = f"""You are a disaster response assistant for Nepal. Answer the following question based on the available data:

{context_summary}

User Question: {user_query}

Provide a helpful, data-driven response. If the question requires specific data, reference the available information."""
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert disaster response assistant with knowledge of humanitarian aid and Nepal's geography."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        return f"⚠️ Error generating response: {str(e)}"

# Main app
def main():
    # Header
    st.markdown('<div class="main-header">🚨 ReliefIQ – Nepal Disaster Response Dashboard</div>', 
                unsafe_allow_html=True)
    
    # Load data
    damage_df = load_damage_data()
    pop_df = load_population_data()
    ngo_capabilities = load_ngo_capabilities()
    scores_df = load_ngo_scores()
    gdf = load_geojson()
    
    if scores_df is None:
        st.stop()
    
    # Get unique NGOs
    unique_ngos = sorted(scores_df['NGO'].unique())
    
    # Sidebar
    with st.sidebar:
        st.header("🎯 NGO Selection")
        selected_ngo = st.selectbox(
            "Select an NGO:",
            options=unique_ngos,
            index=0 if unique_ngos else None
        )
        
        st.divider()
        
        # Selected district info (will be populated when district is clicked)
        if 'selected_district' in st.session_state:
            st.subheader("📍 Selected District")
            st.write(f"**{st.session_state['selected_district'].title()}**")
    
    # Main content
    if selected_ngo:
        # Get merged data for selected NGO
        merged_data = get_merged_data_with_ngo(damage_df, pop_df, scores_df, selected_ngo)
        
        # Summary cards
        st.subheader("📊 Dashboard Overview")
        col1, col2, col3, col4, col5 = st.columns(5)
        
        with col1:
            st.metric("Total NGOs", len(unique_ngos))
        
        with col2:
            st.metric("Total Districts", len(damage_df))
        
        with col3:
            avg_damage = damage_df['houses_destroyed_pct'].mean()
            st.metric("Avg Damage %", f"{avg_damage:.1f}%")
        
        with col4:
            highest_urgency = merged_data.nlargest(1, 'urgency')
            if not highest_urgency.empty:
                st.metric("Highest Urgency", highest_urgency.iloc[0]['district'].title())
        
        with col5:
            avg_match = merged_data['match'].mean()
            st.metric("Avg Match Score", f"{avg_match:.1f}")
        
        st.divider()
        
        # Map visualization
        st.subheader("🗺️ District Match Map")
        
        if gdf is not None:
            fig = create_choropleth_map(gdf, merged_data, selected_ngo)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("GeoJSON file not found. Please add nepal-districts.geojson to the data/ directory.")
            
            # Fallback: Show data table
            st.dataframe(
                merged_data[['district', 'match', 'urgency', 'fitness_score', 'houses_destroyed_pct', 'pop_density']].head(20),
                use_container_width=True
            )
        
        # Top priority districts
        st.subheader("🎯 Top 5 Priority Districts")
        top_districts = get_top_priority_districts(scores_df, selected_ngo, 5)
        
        if not top_districts.empty:
            # Display as table
            display_df = top_districts[['district', 'match', 'urgency', 'fitness_score']].copy()
            display_df['district'] = display_df['district'].str.title()
            display_df.columns = ['District', 'Match Score', 'Urgency', 'Fitness Score']
            st.dataframe(display_df, use_container_width=True)
            
            # Bar chart
            fig_bar = px.bar(
                top_districts,
                x='district',
                y='fitness_score',
                title='Fitness Scores for Top Priority Districts',
                labels={'district': 'District', 'fitness_score': 'Fitness Score'},
                color='fitness_score',
                color_continuous_scale='RdYlGn'
            )
            fig_bar.update_xaxes(tickangle=45)
            st.plotly_chart(fig_bar, use_container_width=True)
        
        # District selection for detailed view
        st.divider()
        st.subheader("📍 District Details")
        
        selected_district_name = st.selectbox(
            "Select a district for detailed analysis:",
            options=sorted(merged_data['district'].unique()),
            format_func=lambda x: x.title()
        )
        
        # Store selected district in session state for sidebar
        st.session_state['selected_district'] = selected_district_name
        
        if selected_district_name:
            district_data = merged_data[merged_data['district'] == selected_district_name].iloc[0].to_dict()
            
            # Display district metrics
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric("Match Score", f"{district_data.get('match', 0):.1f}")
            with col2:
                st.metric("Urgency", f"{district_data.get('urgency', 0):.1f}")
            with col3:
                st.metric("Damage %", f"{district_data.get('houses_destroyed_pct', 0):.1f}%")
            with col4:
                st.metric("Population Density", f"{district_data.get('pop_density', 0):.1f}")
            
            # AI-generated action plan
            st.subheader("🤖 AI-Generated Action Plan")
            
            with st.expander("View Action Plan", expanded=True):
                action_plan = generate_ai_action_plan(
                    district_data, selected_ngo, damage_df, ngo_capabilities
                )
                st.markdown(action_plan)
        
        # Interactive chat assistant
        st.divider()
        st.subheader("💬 Interactive Chat Assistant")
        
        # Initialize chat history
        if 'messages' not in st.session_state:
            st.session_state.messages = []
        
        # Display chat history
        for message in st.session_state.messages:
            with st.chat_message(message['role']):
                st.markdown(message['content'])
        
        # Chat input
        if prompt := st.chat_input("Ask a question about disaster response..."):
            # Add user message
            st.session_state.messages.append({'role': 'user', 'content': prompt})
            with st.chat_message('user'):
                st.markdown(prompt)
            
            # Generate response
            with st.chat_message('assistant'):
                response = generate_chat_response(prompt, merged_data, selected_ngo, ngo_capabilities)
                st.markdown(response)
                st.session_state.messages.append({'role': 'assistant', 'content': response})

if __name__ == "__main__":
    main()

