/**
 * @ai-metrics-collector
 * @version 1.0
 * @description Collects and analyzes coverage metrics for AI-driven test generation
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CoverageReport {
  timestamp: string;
  moduleName: string;
  moduleId: string;
  summary: {
    statements: { total: number; covered: number; pct: number };
    branches: { total: number; covered: number; pct: number };
    functions: { total: number; covered: number; pct: number };
    lines: { total: number; covered: number; pct: number };
  };
  uncoveredItems: {
    statements: Array<{ id: string; line: number; column: number }>;
    branches: Array<{ id: string; line: number; column: number; condition: string }>;
    functions: Array<{ id: string; name: string; line: number }>;
  };
  generatedTests: string[];
  evolution: {
    initialCoverage: number;
    currentCoverage: number;
    iterations: number;
    lastImprovement: string;
  };
}

export interface CoverageHistoryItem {
  timestamp: string;
  testId: string;
  coverageDelta: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  newlyCovered: {
    statements: string[];
    branches: string[];
    functions: string[];
  };
}

export class CoverageCollector {
  private static _instance: CoverageCollector;
  private coverageReports: Map<string, CoverageReport> = new Map();
  private historyLog: Map<string, CoverageHistoryItem[]> = new Map();
  private metricsDir: string;

  constructor(metricsDir?: string) {
    this.metricsDir = metricsDir || path.resolve(__dirname);
    this.loadExistingReports();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(metricsDir?: string): CoverageCollector {
    if (!CoverageCollector._instance) {
      CoverageCollector._instance = new CoverageCollector(metricsDir);
    }
    return CoverageCollector._instance;
  }

  /**
   * Load existing coverage reports
   */
  private loadExistingReports(): void {
    try {
      const reportsFile = path.join(this.metricsDir, 'coverage-reports.json');
      if (fs.existsSync(reportsFile)) {
        const data = JSON.parse(fs.readFileSync(reportsFile, 'utf8'));
        
        // Convert to Map
        if (Array.isArray(data)) {
          data.forEach(report => {
            this.coverageReports.set(report.moduleId, report);
          });
        }
      }

      const historyFile = path.join(this.metricsDir, 'coverage-history.json');
      if (fs.existsSync(historyFile)) {
        const data = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        
        // Convert to Map
        Object.entries(data).forEach(([moduleId, history]) => {
          this.historyLog.set(moduleId, history as CoverageHistoryItem[]);
        });
      }
    } catch (error) {
      console.warn('Failed to load existing coverage reports:', error);
    }
  }

  /**
   * Save coverage reports to disk
   */
  private saveReports(): void {
    try {
      const reportsFile = path.join(this.metricsDir, 'coverage-reports.json');
      const data = Array.from(this.coverageReports.values());
      fs.writeFileSync(reportsFile, JSON.stringify(data, null, 2));

      const historyFile = path.join(this.metricsDir, 'coverage-history.json');
      const historyData = Object.fromEntries(this.historyLog.entries());
      fs.writeFileSync(historyFile, JSON.stringify(historyData, null, 2));
    } catch (error) {
      console.error('Failed to save coverage reports:', error);
    }
  }

  /**
   * Update coverage for a module
   */
  public updateCoverage(
    moduleId: string,
    moduleName: string,
    coverageData: any,
    testId?: string
  ): void {
    const timestamp = new Date().toISOString();
    const existing = this.coverageReports.get(moduleId);
    
    // Extract uncovered items from the coverage data
    const uncoveredItems = this.extractUncoveredItems(coverageData);
    
    // Calculate coverage summary from raw data
    const summary = this.calculateSummary(coverageData);

    // Create new report if none exists
    if (!existing) {
      const report: CoverageReport = {
        timestamp,
        moduleName,
        moduleId,
        summary,
        uncoveredItems,
        generatedTests: testId ? [testId] : [],
        evolution: {
          initialCoverage: summary.lines.pct,
          currentCoverage: summary.lines.pct,
          iterations: 1,
          lastImprovement: timestamp
        }
      };
      
      this.coverageReports.set(moduleId, report);
    } else {
      // Determine what's newly covered compared to existing report
      const newlyCovered = this.findNewlyCovered(existing.uncoveredItems, uncoveredItems);
      
      // Only record history if something was newly covered
      if (
        testId && 
        (newlyCovered.statements.length > 0 || 
         newlyCovered.branches.length > 0 || 
         newlyCovered.functions.length > 0)
      ) {
        const historyItem: CoverageHistoryItem = {
          timestamp,
          testId,
          coverageDelta: {
            statements: summary.statements.pct - existing.summary.statements.pct,
            branches: summary.branches.pct - existing.summary.branches.pct,
            functions: summary.functions.pct - existing.summary.functions.pct,
            lines: summary.lines.pct - existing.summary.lines.pct
          },
          newlyCovered
        };
        
        // Add to history log
        const history = this.historyLog.get(moduleId) || [];
        history.push(historyItem);
        this.historyLog.set(moduleId, history);
        
        // Update the report
        existing.timestamp = timestamp;
        existing.summary = summary;
        existing.uncoveredItems = uncoveredItems;
        
        if (testId && !existing.generatedTests.includes(testId)) {
          existing.generatedTests.push(testId);
        }
        
        // Update evolution data
        existing.evolution.currentCoverage = summary.lines.pct;
        existing.evolution.iterations += 1;
        
        // Update last improvement if we have better coverage
        if (summary.lines.pct > existing.evolution.currentCoverage) {
          existing.evolution.lastImprovement = timestamp;
        }
        
        this.coverageReports.set(moduleId, existing);
      }
    }
    
    // Save all reports to disk
    this.saveReports();
  }

  /**
   * Extract uncovered items from coverage data
   */
  private extractUncoveredItems(coverageData: any): CoverageReport['uncoveredItems'] {
    const uncovered = {
      statements: [],
      branches: [],
      functions: []
    } as CoverageReport['uncoveredItems'];
    
    // Extract from jest coverage format
    try {
      Object.entries(coverageData).forEach(([filePath, fileData]: [string, any]) => {
        // Process uncovered statements
        Object.entries(fileData.statementMap).forEach(([id, statement]: [string, any]) => {
          if (!fileData.s[id]) {
            uncovered.statements.push({
              id,
              line: statement.start.line,
              column: statement.start.column
            });
          }
        });
        
        // Process uncovered branches
        Object.entries(fileData.branchMap).forEach(([id, branch]: [string, any]) => {
          branch.locations.forEach((location: any, locationIndex: number) => {
            const branchId = `${id}.${locationIndex}`;
            if (!fileData.b[id][locationIndex]) {
              uncovered.branches.push({
                id: branchId,
                line: location.start.line,
                column: location.start.column,
                condition: branch.type
              });
            }
          });
        });
        
        // Process uncovered functions
        Object.entries(fileData.fnMap).forEach(([id, fn]: [string, any]) => {
          if (!fileData.f[id]) {
            uncovered.functions.push({
              id,
              name: fn.name,
              line: fn.loc.start.line
            });
          }
        });
      });
    } catch (e) {
      console.error('Failed to extract uncovered items:', e);
    }
    
    return uncovered;
  }

  /**
   * Calculate coverage summary from raw data
   */
  private calculateSummary(coverageData: any): CoverageReport['summary'] {
    const summary = {
      statements: { total: 0, covered: 0, pct: 0 },
      branches: { total: 0, covered: 0, pct: 0 },
      functions: { total: 0, covered: 0, pct: 0 },
      lines: { total: 0, covered: 0, pct: 0 }
    };
    
    try {
      Object.values(coverageData).forEach((fileData: any) => {
        // Statements
        const stTotal = Object.keys(fileData.s).length;
        const stCovered = Object.values(fileData.s).filter(v => !!v).length;
        summary.statements.total += stTotal;
        summary.statements.covered += stCovered;
        
        // Branches
        let brTotal = 0;
        let brCovered = 0;
        Object.values(fileData.b).forEach((branches: any) => {
          brTotal += branches.length;
          brCovered += branches.filter((b: number) => b > 0).length;
        });
        summary.branches.total += brTotal;
        summary.branches.covered += brCovered;
        
        // Functions
        const fnTotal = Object.keys(fileData.f).length;
        const fnCovered = Object.values(fileData.f).filter(v => !!v).length;
        summary.functions.total += fnTotal;
        summary.functions.covered += fnCovered;
        
        // Lines
        const lnTotal = Object.keys(fileData.l).length;
        const lnCovered = Object.values(fileData.l).filter(v => !!v).length;
        summary.lines.total += lnTotal;
        summary.lines.covered += lnCovered;
      });
      
      // Calculate percentages
      summary.statements.pct = summary.statements.total === 0 ? 0 : 
        (summary.statements.covered / summary.statements.total) * 100;
      summary.branches.pct = summary.branches.total === 0 ? 0 : 
        (summary.branches.covered / summary.branches.total) * 100;
      summary.functions.pct = summary.functions.total === 0 ? 0 : 
        (summary.functions.covered / summary.functions.total) * 100;
      summary.lines.pct = summary.lines.total === 0 ? 0 : 
        (summary.lines.covered / summary.lines.total) * 100;
    } catch (e) {
      console.error('Failed to calculate summary:', e);
    }
    
    return summary;
  }

  /**
   * Find items that are newly covered
   */
  private findNewlyCovered(
    previous: CoverageReport['uncoveredItems'],
    current: CoverageReport['uncoveredItems']
  ): { statements: string[], branches: string[], functions: string[] } {
    const newlyCovered = {
      statements: [],
      branches: [],
      functions: []
    } as { statements: string[], branches: string[], functions: string[] };
    
    // Find newly covered statements
    const prevStatementIds = new Set(previous.statements.map(s => s.id));
    const currStatementIds = new Set(current.statements.map(s => s.id));
    prevStatementIds.forEach(id => {
      if (!currStatementIds.has(id)) {
        newlyCovered.statements.push(id);
      }
    });
    
    // Find newly covered branches
    const prevBranchIds = new Set(previous.branches.map(b => b.id));
    const currBranchIds = new Set(current.branches.map(b => b.id));
    prevBranchIds.forEach(id => {
      if (!currBranchIds.has(id)) {
        newlyCovered.branches.push(id);
      }
    });
    
    // Find newly covered functions
    const prevFunctionIds = new Set(previous.functions.map(f => f.id));
    const currFunctionIds = new Set(current.functions.map(f => f.id));
    prevFunctionIds.forEach(id => {
      if (!currFunctionIds.has(id)) {
        newlyCovered.functions.push(id);
      }
    });
    
    return newlyCovered;
  }

  /**
   * Get the current coverage report for a module
   */
  public getCoverageReport(moduleId: string): CoverageReport | undefined {
    return this.coverageReports.get(moduleId);
  }

  /**
   * Get coverage history for a module
   */
  public getCoverageHistory(moduleId: string): CoverageHistoryItem[] {
    return this.historyLog.get(moduleId) || [];
  }
  
  /**
   * Get all uncovered items for a module
   */
  public getUncoveredItems(moduleId: string): CoverageReport['uncoveredItems'] | undefined {
    const report = this.coverageReports.get(moduleId);
    return report?.uncoveredItems;
  }

  /**
   * Get modules with the lowest coverage
   */
  public getLowestCoverageModules(limit = 5): Array<{ id: string, name: string, coverage: number }> {
    return Array.from(this.coverageReports.values())
      .map(report => ({
        id: report.moduleId,
        name: report.moduleName,
        coverage: report.summary.lines.pct
      }))
      .sort((a, b) => a.coverage - b.coverage)
      .slice(0, limit);
  }
}

// Export a singleton instance
export const coverageCollector = CoverageCollector.getInstance();