#!/bin/bash

# ReliefIQ Dashboard Setup Script
# This script helps copy data files from the parent project

echo "🚨 ReliefIQ Dashboard Setup"
echo "=========================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the reliefiq-dashboard directory"
    exit 1
fi

# Create data directory if it doesn't exist
mkdir -p public/data

echo "📁 Setting up data files..."
echo ""

# Copy data files from parent project if they exist
PARENT_DIR="../"

# Check and copy files
if [ -f "${PARENT_DIR}data_generation/data/ngo_capabilities.csv" ]; then
    echo "✓ Copying ngo_capabilities.csv..."
    cp "${PARENT_DIR}data_generation/data/ngo_capabilities.csv" public/data/ngo_capabilities_converted.csv
fi

if [ -f "${PARENT_DIR}data_generation/data/pdna_district_damage.csv" ]; then
    echo "✓ Copying pdna_district_damage.csv..."
    cp "${PARENT_DIR}data_generation/data/pdna_district_damage.csv" public/data/
fi

if [ -f "${PARENT_DIR}data_generation/data/population_density.csv" ]; then
    echo "✓ Copying population_density.csv..."
    cp "${PARENT_DIR}data_generation/data/population_density.csv" public/data/
fi

if [ -f "${PARENT_DIR}data_generation/outputs/ngo_region_scores.csv" ]; then
    echo "✓ Copying ngo_region_scores.csv..."
    cp "${PARENT_DIR}data_generation/outputs/ngo_region_scores.csv" public/data/
fi

if [ -f "${PARENT_DIR}websiteshit/data/nepal-districts.geojson" ]; then
    echo "✓ Copying nepal-districts.geojson..."
    cp "${PARENT_DIR}websiteshit/data/nepal-districts.geojson" public/data/
elif [ -f "${PARENT_DIR}websiteshit/public/data/nepal-districts.geojson" ]; then
    echo "✓ Copying nepal-districts.geojson..."
    cp "${PARENT_DIR}websiteshit/public/data/nepal-districts.geojson" public/data/
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Install dependencies: npm install"
echo "2. Create .env file with your OpenAI API key"
echo "3. Run the app: npm run dev"
echo ""

