#!/bin/bash
# DocGen Unix Setup Script

# Exit on error
set -e

# Parse arguments
DEV=0
CHECK_ONLY=0

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --dev) DEV=1 ;;
        --check-only) CHECK_ONLY=1 ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Print section header
print_header() {
    echo -e "\n=== $1 ==="
}

# Check if command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "$1 is not installed or not in PATH"
        exit 1
    fi
}

# Check Python installation
print_header "Checking Python Installation"
check_command python3

# Check Node.js installation
print_header "Checking Node.js Installation"
check_command node

# Check npm installation
print_header "Checking npm Installation"
check_command npm

# Exit if only checking dependencies
if [ $CHECK_ONLY -eq 1 ]; then
    echo -e "\nAll required dependencies are installed."
    exit 0
fi

# Create Python virtual environment
print_header "Setting up Python Environment"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
source venv/bin/activate
python3 -m pip install --upgrade pip
pip install -r requirements.txt

# Install Node.js dependencies
print_header "Setting up Node.js Environment"
npm install

# Build TypeScript project
print_header "Building TypeScript Project"
npm run build

if [ $DEV -eq 1 ]; then
    # Set up development-specific configurations
    print_header "Setting up Development Environment"
    cp .env.example .env
    npm install --save-dev
fi

echo -e "\nSetup completed successfully!"
