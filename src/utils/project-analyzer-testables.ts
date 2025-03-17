/**
 * Exports internal functions from project-analyzer for testing purposes
 */
import * as yaml from 'js-yaml';
import * as path from 'path';
import * as fs from 'fs';
import { ProjectType } from '../types';

/**
 * Detects build tools used in the project
 */
export async function detectBuildTools(
  files: string[],
  fileContents: Map<string, string>
): Promise<string[]> {
  const buildTools = new Set<string>();
  
  // Build tool detection patterns
  const patterns = [
    { file: 'package.json', tool: 'npm', check: (c: string) => true },
    { file: 'package.json', tool: 'webpack', check: (c: string) => c.includes('"webpack"') },
    { file: 'package.json', tool: 'babel', check: (c: string) => c.includes('"babel"') },
    { file: 'package.json', tool: 'eslint', check: (c: string) => c.includes('"eslint"') },
    { file: 'package.json', tool: 'typescript', check: (c: string) => c.includes('"typescript"') },
    { file: 'package.json', tool: 'jest', check: (c: string) => c.includes('"jest"') },
    { file: 'package.json', tool: 'mocha', check: (c: string) => c.includes('"mocha"') },
    { file: 'pom.xml', tool: 'Maven', check: (c: string) => true },
    { file: 'build.gradle', tool: 'Gradle', check: (c: string) => true },
    { file: 'Makefile', tool: 'Make', check: (c: string) => true },
    { file: 'CMakeLists.txt', tool: 'CMake', check: (c: string) => true },
    { file: 'Gemfile', tool: 'Bundler', check: (c: string) => true },
    { file: 'requirements.txt', tool: 'pip', check: (c: string) => true },
    { file: 'pyproject.toml', tool: 'Poetry', check: (c: string) => c.includes('[tool.poetry]') },
    { file: 'tox.ini', tool: 'tox', check: (c: string) => true },
    { file: 'Cargo.toml', tool: 'Cargo', check: (c: string) => true }
  ];
  
  for (const [filePath, content] of fileContents.entries()) {
    const fileName = path.basename(filePath);
    for (const { file, tool, check } of patterns) {
      if (fileName === file && check(content)) {
        buildTools.add(tool);
      }
    }
  }
  
  return Array.from(buildTools);
}

/**
 * Checks if a file has YAML frontmatter
 */
export function hasYamlFrontmatter(content: string): boolean {
  // Check for YAML frontmatter between --- delimiters
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);
  
  if (!match) return false;
  
  try {
    // Try to parse the YAML content
    yaml.load(match[1]);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Determines the project type based on languages and frameworks
 */
/**
 * Checks if a project has a Git repository
 * @param projectPath The path to the project
 * @returns Whether the project has a Git repository
 */
export function hasExistingGit(projectPath: string): boolean {
  const gitDir = path.join(projectPath, '.git');
  return fs.existsSync(gitDir) && fs.statSync(gitDir).isDirectory();
}

export function determineProjectType(
  languages: Array<{ name: string; percentage: number; files: number }>,
  frameworks: string[],
  fileContents: Map<string, string>
): ProjectType {
  // Simple heuristic for determining project type
  
  // Check for mobile frameworks as highest priority
  if (frameworks.some(f => 
      ['ReactNative', 'Flutter', 'SwiftUI', 'Kotlin'].includes(f))) {
    return 'MOBILE';
  }
  
  // Check for web frameworks
  if (frameworks.some(f => 
      ['React', 'Angular', 'Vue', 'jQuery', 'Node'].includes(f))) {
    return 'WEB';
  }
  
  // Check for API specific indicators
  const hasApiIndicators = Array.from(fileContents.values()).some(content => 
    content.includes('endpoint') || 
    content.includes('api') || 
    content.includes('REST') ||
    content.includes('GraphQL')
  );
  
  if (hasApiIndicators) {
    return 'API';
  }
  
  // Check for desktop app indicators
  if (frameworks.some(f => ['Electron', 'WPF', 'WinForms', 'JavaFX'].includes(f)) ||
      languages.some(l => ['C#', 'Swift', 'C++'].includes(l.name) && l.percentage > 30)) {
    return 'DESKTOP';
  }
  
  // Default to OTHER if can't determine
  return 'OTHER';
}