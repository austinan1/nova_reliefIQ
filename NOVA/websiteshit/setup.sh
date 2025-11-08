#!/bin/bash

# ReliefIQ Setup Script
# This script sets up the React + D3.js dashboard

echo "🚀 Setting up ReliefIQ Dashboard..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

echo "✓ Node.js and Python found"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Create public/data directories
echo "📁 Creating public/data directories..."
mkdir -p public/data/input public/data/output

# Copy data files to public directory
echo "📋 Copying data files..."
if [ -d "data/input" ]; then
    cp -r data/input/* public/data/input/ 2>/dev/null || true
    echo "✓ Copied input data files"
fi

if [ -d "data/output" ]; then
    cp -r data/output/* public/data/output/ 2>/dev/null || true
    echo "✓ Copied output data files"
fi

if [ -f "data/nepal-districts.geojson" ]; then
    cp data/nepal-districts.geojson public/data/ 2>/dev/null || true
    echo "✓ Copied GeoJSON file"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating .env.example..."
    echo "VITE_OPENAI_API_KEY=your_openai_api_key_here" > .env.example
    echo "📝 Please create a .env file with your OpenAI API key:"
    echo "   VITE_OPENAI_API_KEY=your_api_key_here"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Generate NGO region scores: python generate_ngo_scores.py"
echo "2. Download GeoJSON file: python download_geojson.py"
echo "3. Copy data files to public/data/ if not already done"
echo "4. Create .env file with your OpenAI API key"
echo "5. Run: npm run dev"

