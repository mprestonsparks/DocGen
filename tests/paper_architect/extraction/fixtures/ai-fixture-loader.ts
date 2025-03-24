/**
 * @ai-fixture-loader
 * @version 1.0
 * @description Enhanced fixture loader with metadata for AI-driven testing
 */

import * as fs from 'fs';
import * as path from 'path';

export interface FixtureMetadata {
  name: string;
  type: string;
  description: string;
  scenarios: string[];
  generationData?: {
    version: number;
    generatedBy: string;
    timestamp: string;
    purpose: string;
  };
  dependencies?: string[];
}

export interface Fixture<T = any> {
  metadata: FixtureMetadata;
  content: T;
}

const FIXTURES_DIR = path.resolve(__dirname);
const FIXTURE_REGISTRY: Map<string, FixtureMetadata> = new Map();

/**
 * Register a fixture with metadata
 */
export function registerFixture(metadata: FixtureMetadata): void {
  FIXTURE_REGISTRY.set(metadata.name, metadata);
}

/**
 * Get all available fixtures
 */
export function getAvailableFixtures(): FixtureMetadata[] {
  return Array.from(FIXTURE_REGISTRY.values());
}

/**
 * Get fixtures by scenario
 */
export function getFixturesByScenario(scenarioName: string): FixtureMetadata[] {
  return getAvailableFixtures().filter(meta => 
    meta.scenarios.includes(scenarioName)
  );
}

/**
 * Load a fixture by name
 */
export function loadFixture<T = any>(fixtureName: string): Fixture<T> {
  const fixturePath = path.join(FIXTURES_DIR, `${fixtureName}`);
  let metadata: FixtureMetadata;
  let content: T;

  try {
    // Load content and metadata based on file extension
    if (fixtureName.endsWith('.json')) {
      const rawData = fs.readFileSync(fixturePath, 'utf8');
      const parsed = JSON.parse(rawData);
      
      metadata = parsed.metadata || { 
        name: fixtureName,
        type: 'json',
        description: 'Auto-loaded JSON fixture',
        scenarios: ['default']
      };
      
      content = parsed.content || parsed;
    } 
    else if (fixtureName.endsWith('.xml') || fixtureName.endsWith('.tei.xml')) {
      const xmlContent = fs.readFileSync(fixturePath, 'utf8');
      // Load metadata from registry or create default
      metadata = FIXTURE_REGISTRY.get(fixtureName) || {
        name: fixtureName,
        type: 'xml',
        description: 'XML data fixture',
        scenarios: ['default']
      };
      content = xmlContent as unknown as T;
    }
    else if (fixtureName.endsWith('.ts') || fixtureName.endsWith('.js')) {
      // Dynamic import for TS/JS fixtures
      const imported = require(fixturePath);
      metadata = imported.metadata || {
        name: fixtureName,
        type: 'code',
        description: 'Code fixture module',
        scenarios: ['default']
      };
      content = imported.default || imported;
    }
    else {
      // Default to raw file content
      content = fs.readFileSync(fixturePath, 'utf8') as unknown as T;
      metadata = FIXTURE_REGISTRY.get(fixtureName) || {
        name: fixtureName,
        type: 'raw',
        description: 'Raw content fixture',
        scenarios: ['default']
      };
    }

    return { metadata, content };
  } catch (error) {
    console.error(`Error loading fixture '${fixtureName}':`, error);
    throw new Error(`Failed to load fixture: ${fixtureName}`);
  }
}

/**
 * Generate a new fixture (for AI-driven test generation)
 */
export function generateFixture<T = any>(
  name: string, 
  content: T, 
  metadata: Partial<FixtureMetadata>
): string {
  const fullMetadata: FixtureMetadata = {
    name,
    type: metadata.type || 'generated',
    description: metadata.description || 'AI-generated test fixture',
    scenarios: metadata.scenarios || ['default'],
    generationData: {
      version: 1,
      generatedBy: 'ai-test-framework',
      timestamp: new Date().toISOString(),
      purpose: metadata.generationData?.purpose || 'Automated test generation'
    },
    dependencies: metadata.dependencies || []
  };

  // Determine file extension based on type
  let fileExtension = '.json';
  if (metadata.type === 'xml') fileExtension = '.xml';
  if (metadata.type === 'code') fileExtension = '.ts';
  if (metadata.type === 'raw') fileExtension = '.txt';

  const fileName = name.endsWith(fileExtension) ? name : `${name}${fileExtension}`;
  const filePath = path.join(FIXTURES_DIR, fileName);

  // Create the fixture file
  if (metadata.type === 'json' || !metadata.type) {
    const fixtureData = {
      metadata: fullMetadata,
      content
    };
    fs.writeFileSync(filePath, JSON.stringify(fixtureData, null, 2), 'utf8');
  } else if (metadata.type === 'xml') {
    // For XML, we just write the content directly
    fs.writeFileSync(filePath, content as unknown as string, 'utf8');
    // Register the metadata separately
    registerFixture(fullMetadata);
  } else {
    // Default to writing raw content
    fs.writeFileSync(filePath, content as unknown as string, 'utf8');
    // Register the metadata separately
    registerFixture(fullMetadata);
  }

  return fileName;
}

// Initialize available fixtures
export function initializeFixtures(): void {
  try {
    const entries = fs.readdirSync(FIXTURES_DIR);
    
    entries.forEach(entry => {
      if (entry.endsWith('.json')) {
        try {
          const filePath = path.join(FIXTURES_DIR, entry);
          const content = fs.readFileSync(filePath, 'utf8');
          const parsed = JSON.parse(content);
          
          if (parsed.metadata) {
            registerFixture(parsed.metadata);
          }
        } catch (err) {
          console.warn(`Could not load fixture metadata for ${entry}`);
        }
      }
    });
  } catch (error) {
    console.warn('Failed to initialize fixtures registry:', error);
  }
}

// Initialize fixtures registry
initializeFixtures();