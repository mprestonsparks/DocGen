/**
 * @ai-evolution-manager
 * @version 1.0
 * @description Manages evolutionary history of AI-generated tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface TestEvolutionMetadata {
  id: string;
  targetModule: string;
  targetFunction: string;
  targetCoverage: string[];
  generation: number;
  timestamp: string;
  parentId?: string;
  improvements: string[];
  coverageImpact: {
    linesAdded: number;
    branchesAdded: number;
    functionsAdded: number;
  };
  decisions: {
    id: string;
    value: string;
    reason: string;
  }[];
}

export interface TestGeneration {
  metadata: TestEvolutionMetadata;
  testContent: string;
}

export class TestEvolutionManager {
  private static _instance: TestEvolutionManager;
  private evolutionRecords: Map<string, TestEvolutionMetadata[]> = new Map();
  private currentTests: Map<string, TestGeneration> = new Map();
  private evolutionDir: string;

  constructor(evolutionDir?: string) {
    this.evolutionDir = evolutionDir || path.resolve(__dirname);
    this.loadEvolutionHistory();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(evolutionDir?: string): TestEvolutionManager {
    if (!TestEvolutionManager._instance) {
      TestEvolutionManager._instance = new TestEvolutionManager(evolutionDir);
    }
    return TestEvolutionManager._instance;
  }

  /**
   * Load existing evolution history
   */
  private loadEvolutionHistory(): void {
    try {
      const historyFile = path.join(this.evolutionDir, 'evolution-history.json');
      if (fs.existsSync(historyFile)) {
        const data = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        
        // Convert to Map
        Object.entries(data).forEach(([moduleId, history]) => {
          this.evolutionRecords.set(moduleId, history as TestEvolutionMetadata[]);
        });
      }

      // Load test content
      const testsDir = path.join(this.evolutionDir, 'tests');
      if (fs.existsSync(testsDir)) {
        fs.readdirSync(testsDir).forEach(fileName => {
          if (fileName.endsWith('.json')) {
            try {
              const filePath = path.join(testsDir, fileName);
              const content = fs.readFileSync(filePath, 'utf8');
              const testGen = JSON.parse(content) as TestGeneration;
              this.currentTests.set(testGen.metadata.id, testGen);
            } catch (err) {
              console.warn(`Could not load test file ${fileName}:`, err);
            }
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load evolution history:', error);
    }
  }

  /**
   * Save evolution history
   */
  private saveEvolutionHistory(): void {
    try {
      // Ensure directories exist
      const testsDir = path.join(this.evolutionDir, 'tests');
      if (!fs.existsSync(testsDir)) {
        fs.mkdirSync(testsDir, { recursive: true });
      }

      // Save evolution history
      const historyFile = path.join(this.evolutionDir, 'evolution-history.json');
      const historyData = Object.fromEntries(this.evolutionRecords.entries());
      fs.writeFileSync(historyFile, JSON.stringify(historyData, null, 2));
    } catch (error) {
      console.error('Failed to save evolution history:', error);
    }
  }

  /**
   * Save a specific test generation
   */
  private saveTestGeneration(testId: string): void {
    try {
      const testsDir = path.join(this.evolutionDir, 'tests');
      if (!fs.existsSync(testsDir)) {
        fs.mkdirSync(testsDir, { recursive: true });
      }

      const testGen = this.currentTests.get(testId);
      if (testGen) {
        const filePath = path.join(testsDir, `${testId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(testGen, null, 2));
      }
    } catch (error) {
      console.error(`Failed to save test generation ${testId}:`, error);
    }
  }

  /**
   * Register a new test generation
   */
  public registerTestGeneration(
    testContent: string,
    metadata: {
      targetModule: string;
      targetFunction: string;
      targetCoverage: string[];
      parentId?: string;
      improvements?: string[];
      coverageImpact?: {
        linesAdded: number;
        branchesAdded: number;
        functionsAdded: number;
      };
      decisions?: {
        id: string;
        value: string;
        reason: string;
      }[];
    }
  ): string {
    const testId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Determine generation number
    let generation = 1;
    if (metadata.parentId) {
      const parentTest = this.getTestGeneration(metadata.parentId);
      if (parentTest) {
        generation = parentTest.metadata.generation + 1;
      }
    }
    
    // Create evolution metadata
    const evolutionMetadata: TestEvolutionMetadata = {
      id: testId,
      targetModule: metadata.targetModule,
      targetFunction: metadata.targetFunction,
      targetCoverage: metadata.targetCoverage || [],
      generation,
      timestamp,
      parentId: metadata.parentId,
      improvements: metadata.improvements || [],
      coverageImpact: metadata.coverageImpact || {
        linesAdded: 0,
        branchesAdded: 0,
        functionsAdded: 0
      },
      decisions: metadata.decisions || []
    };
    
    // Store the test generation
    this.currentTests.set(testId, {
      metadata: evolutionMetadata,
      testContent
    });
    
    // Update evolution records
    const moduleId = metadata.targetModule;
    const moduleHistory = this.evolutionRecords.get(moduleId) || [];
    moduleHistory.push(evolutionMetadata);
    this.evolutionRecords.set(moduleId, moduleHistory);
    
    // Save changes
    this.saveEvolutionHistory();
    this.saveTestGeneration(testId);
    
    return testId;
  }

  /**
   * Get a specific test generation
   */
  public getTestGeneration(testId: string): TestGeneration | undefined {
    return this.currentTests.get(testId);
  }

  /**
   * Get all test generations for a module
   */
  public getModuleEvolutionHistory(moduleId: string): TestEvolutionMetadata[] {
    return this.evolutionRecords.get(moduleId) || [];
  }

  /**
   * Get the latest test generation for a module function
   */
  public getLatestTestGeneration(moduleId: string, functionName: string): TestGeneration | undefined {
    const moduleHistory = this.getModuleEvolutionHistory(moduleId);
    
    // Find the latest generation for this function
    const latestMetadata = moduleHistory
      .filter(meta => meta.targetFunction === functionName)
      .sort((a, b) => b.generation - a.generation)[0];
    
    if (latestMetadata) {
      return this.getTestGeneration(latestMetadata.id);
    }
    
    return undefined;
  }

  /**
   * Get evolutionary path for a test
   */
  public getEvolutionaryPath(testId: string): TestEvolutionMetadata[] {
    const test = this.getTestGeneration(testId);
    if (!test) return [];
    
    const path: TestEvolutionMetadata[] = [test.metadata];
    let currentId = test.metadata.parentId;
    
    // Traverse up the parent chain
    while (currentId) {
      const parent = this.getTestGeneration(currentId);
      if (parent) {
        path.unshift(parent.metadata);
        currentId = parent.metadata.parentId;
      } else {
        break;
      }
    }
    
    return path;
  }

  /**
   * Get all modules with test evolution history
   */
  public getModulesWithEvolutionHistory(): string[] {
    return Array.from(this.evolutionRecords.keys());
  }
}

// Export a singleton instance
export const testEvolutionManager = TestEvolutionManager.getInstance();