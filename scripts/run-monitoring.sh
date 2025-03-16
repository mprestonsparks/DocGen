#!/bin/bash

# DocGen Implementation Monitoring System
# This script runs the full monitoring system for the DocGen project
# It combines TODO analysis with report generation to provide a complete
# implementation gap analysis

echo "Starting DocGen Implementation Monitoring System..."
echo "--------------------------------------------"

# Make sure reports directory exists
mkdir -p ./docs/reports

# Step 1: Run the basic TODO validator
echo "✅ Running basic TODO validation..."
npx ts-node --esm ./scripts/validate-todos.ts --project-path . --report-path ./docs/reports/todo-report.md
BASIC_TODO_STATUS=$?

# Step 2: Run the enhanced TODO validator with semantic analysis
echo "✅ Running enhanced TODO validation with semantic analysis..."
npx ts-node --esm ./scripts/validate-todos.ts --project-path . --report-path ./docs/reports/enhanced-todo-report.md --analyze-semantics --enhanced
ENHANCED_TODO_STATUS=$?

# Step 3: Generate combined implementation status report
echo "✅ Generating implementation status report..."
node ./scripts/generate-reports.js
REPORT_STATUS=$?

# Step 4: Display summary
echo ""
echo "Implementation Monitoring Completed!"
echo "--------------------------------------------"
echo "Reports generated in docs/reports/ directory"
echo ""
echo "Key Reports:"
echo "* Basic TODO Analysis: docs/reports/todo-report.md"
echo "* Implementation Status: docs/reports/implementation-status.md"

# Step 5: Check if monitoring system discovered high-severity issues
if [ -f ./docs/reports/enhanced-todo-report.md ]; then
  # Check if there's a High Severity section in the report
  if grep -q "High Severity" ./docs/reports/enhanced-todo-report.md; then
    echo ""
    echo "⚠️ WARNING: Found high severity implementation issues!"
    echo "Please review docs/reports/enhanced-todo-report.md for details."
  fi
fi

echo ""
echo "Run 'npm run monitor' or './scripts/run-monitoring.sh' to re-run this analysis"
echo ""

# Return status code
if [ $BASIC_TODO_STATUS -ne 0 ] || [ $ENHANCED_TODO_STATUS -ne 0 ] || [ $REPORT_STATUS -ne 0 ]; then
  exit 1
fi

exit 0