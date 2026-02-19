#!/bin/bash

set -e

# Create the sourcemaps directory if it doesn't exist
mkdir -p ./sourcemaps

# Generate the source maps
echo "Generating source maps for ${{ matrix.service }}..."

# Check if the service is 'admin-api'