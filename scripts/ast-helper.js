
      // Helper script to analyze AST in a separate process
      const path = require('path');
      const fs = require('fs');
      const astAnalyzer = require(path.join(process.cwd(), 'src/utils/ast-analyzer.js'));
      
      // Get the component path from args
      const componentPath = process.argv[2];
      
      // Run basic analysis on the file
      astAnalyzer.analyzeFileForTodos(componentPath)
        .then(todos => {
          // Just write sample data to show it works
          console.log(JSON.stringify({
            todos,
            source: componentPath,
            timestamp: new Date().toISOString()
          }));
        })
        .catch(err => {
          console.error('Error:', err.message);
          process.exit(1);
        });
      