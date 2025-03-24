/**
 * Custom Jest coverage reporter for extraction module
 * 
 * This reporter provides focused coverage information for specific modules,
 * including details about uncovered functions and branches.
 */

class ExtractionCoverageReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options || {};
    this.modulePath = options.modulePath || 'paper_architect/extraction';
  }

  onRunComplete(contexts, results) {
    // Skip if no coverage data
    if (!results.coverageMap) {
      console.log('\nNo coverage information available');
      return;
    }

    try {
      this.printModuleCoverage(results.coverageMap);
      
      if (this.options.detailed) {
        this.printUncoveredFunctions(results.coverageMap);
        this.printUncoveredBranches(results.coverageMap);
      }
      
    } catch (error) {
      console.error('Error in coverage reporter:', error.message);
    }
  }

  // Print coverage summary for target module
  printModuleCoverage(coverageMap) {
    const moduleKeys = Object.keys(coverageMap.data)
      .filter(key => key.includes(this.modulePath));

    if (moduleKeys.length === 0) {
      console.log(`\nNo coverage data found for module: ${this.modulePath}`);
      return;
    }

    console.log('\n=== EXTRACTION MODULE COVERAGE ===');
    
    let totalStatements = 0;
    let coveredStatements = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    
    moduleKeys.forEach(moduleKey => {
      const fileCoverage = coverageMap.data[moduleKey];
      
      // Get the file name without the full path
      const fileName = moduleKey.split('/').pop();
      console.log(`\nFile: ${fileName}`);
      
      // Statements
      const statements = this.getCoverageInfo(
        fileCoverage.statementMap,
        fileCoverage.s
      );
      console.log(`  Statements: ${statements.percentage}% (${statements.covered}/${statements.total})`);
      totalStatements += statements.total;
      coveredStatements += statements.covered;
      
      // Branches
      const branches = this.getCoverageInfo(
        fileCoverage.branchMap,
        fileCoverage.b,
        (map, coverage) => {
          // For branches, the coverage is an array for each branch location
          let total = 0;
          let covered = 0;
          
          Object.keys(map).forEach(key => {
            const branchArray = coverage[key] || [];
            total += branchArray.length;
            covered += branchArray.filter(count => count > 0).length;
          });
          
          return { total, covered };
        }
      );
      console.log(`  Branches:   ${branches.percentage}% (${branches.covered}/${branches.total})`);
      totalBranches += branches.total;
      coveredBranches += branches.covered;
      
      // Functions
      const functions = this.getCoverageInfo(
        fileCoverage.fnMap,
        fileCoverage.f
      );
      console.log(`  Functions:  ${functions.percentage}% (${functions.covered}/${functions.total})`);
      totalFunctions += functions.total;
      coveredFunctions += functions.covered;
    });
    
    // Print overall totals if multiple files
    if (moduleKeys.length > 1) {
      console.log('\nOVERALL COVERAGE:');
      console.log(`  Statements: ${this.getPercentage(coveredStatements, totalStatements)}% (${coveredStatements}/${totalStatements})`);
      console.log(`  Branches:   ${this.getPercentage(coveredBranches, totalBranches)}% (${coveredBranches}/${totalBranches})`);
      console.log(`  Functions:  ${this.getPercentage(coveredFunctions, totalFunctions)}% (${coveredFunctions}/${totalFunctions})`);
    }
  }

  // Print details about uncovered functions
  printUncoveredFunctions(coverageMap) {
    const moduleKeys = Object.keys(coverageMap.data)
      .filter(key => key.includes(this.modulePath));

    if (moduleKeys.length === 0) return;

    const uncoveredFunctions = [];
    
    moduleKeys.forEach(moduleKey => {
      const fileCoverage = coverageMap.data[moduleKey];
      const fileName = moduleKey.split('/').pop();
      
      // Find uncovered functions
      Object.keys(fileCoverage.f).forEach(key => {
        if (fileCoverage.f[key] === 0) {
          const fnInfo = fileCoverage.fnMap[key];
          if (fnInfo) {
            uncoveredFunctions.push({
              file: fileName,
              name: fnInfo.name || `<anonymous function>`,
              line: fnInfo.loc ? fnInfo.loc.start.line : 'unknown',
              moduleKey
            });
          }
        }
      });
    });
    
    if (uncoveredFunctions.length > 0) {
      console.log('\n=== UNCOVERED FUNCTIONS ===');
      uncoveredFunctions.forEach(fn => {
        console.log(`  ${fn.file}:${fn.line} - ${fn.name}`);
      });
    }
  }

  // Print details about uncovered branches
  printUncoveredBranches(coverageMap) {
    const moduleKeys = Object.keys(coverageMap.data)
      .filter(key => key.includes(this.modulePath));

    if (moduleKeys.length === 0) return;

    const uncoveredBranches = [];
    
    moduleKeys.forEach(moduleKey => {
      const fileCoverage = coverageMap.data[moduleKey];
      const fileName = moduleKey.split('/').pop();
      
      // Find uncovered branches
      Object.keys(fileCoverage.b).forEach(key => {
        const branchArray = fileCoverage.b[key];
        branchArray.forEach((count, index) => {
          if (count === 0) {
            const branchInfo = fileCoverage.branchMap[key];
            if (branchInfo) {
              const locations = branchInfo.locations || [];
              const location = locations[index] || branchInfo.loc;
              
              uncoveredBranches.push({
                file: fileName,
                type: branchInfo.type || 'branch',
                line: location ? location.start.line : 'unknown',
                moduleKey
              });
            }
          }
        });
      });
    });
    
    if (uncoveredBranches.length > 0) {
      console.log('\n=== UNCOVERED BRANCHES ===');
      uncoveredBranches.forEach(branch => {
        console.log(`  ${branch.file}:${branch.line} - ${branch.type}`);
      });
    }
  }

  // Helper method to calculate coverage info
  getCoverageInfo(map, coverage, customCalc) {
    if (customCalc) {
      const { total, covered } = customCalc(map, coverage);
      return {
        total,
        covered,
        percentage: this.getPercentage(covered, total)
      };
    }
    
    const total = Object.keys(map).length;
    const covered = Object.keys(coverage)
      .filter(key => coverage[key] > 0)
      .length;
    
    return {
      total,
      covered,
      percentage: this.getPercentage(covered, total)
    };
  }

  // Helper method to calculate percentage
  getPercentage(covered, total) {
    if (total === 0) return 100;
    return Math.round((covered / total) * 100);
  }
}

module.exports = ExtractionCoverageReporter;