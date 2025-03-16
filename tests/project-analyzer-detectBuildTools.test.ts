/**
 * Tests for the detectBuildTools function in project-analyzer.ts
 */
import { detectBuildTools } from '../src/utils/project-analyzer-testables';

describe('detectBuildTools', () => {
  it('should detect npm as a build tool with package.json', async () => {
    const files = ['/project/package.json'];
    const fileContents = new Map<string, string>();
    fileContents.set('/project/package.json', JSON.stringify({
      name: 'test-project',
      dependencies: {
        'react': '^17.0.2'
      }
    }));
    
    const result = await detectBuildTools(files, fileContents);
    expect(result).toContain('npm');
  });
  
  it('should detect webpack from package.json', async () => {
    const files = ['/project/package.json'];
    const fileContents = new Map<string, string>();
    fileContents.set('/project/package.json', JSON.stringify({
      name: 'test-project',
      devDependencies: {
        'webpack': '^5.0.0'
      }
    }));
    
    const result = await detectBuildTools(files, fileContents);
    expect(result).toContain('webpack');
  });
  
  it('should detect multiple build tools', async () => {
    const files = ['/project/package.json'];
    const fileContents = new Map<string, string>();
    fileContents.set('/project/package.json', JSON.stringify({
      name: 'test-project',
      devDependencies: {
        'webpack': '^5.0.0',
        'babel': '^7.0.0',
        'eslint': '^8.0.0',
        'typescript': '^4.0.0'
      }
    }));
    
    const result = await detectBuildTools(files, fileContents);
    expect(result).toContain('webpack');
    expect(result).toContain('babel');
    expect(result).toContain('eslint');
    expect(result).toContain('typescript');
  });
  
  it('should detect Maven from pom.xml', async () => {
    const files = ['/project/pom.xml'];
    const fileContents = new Map<string, string>();
    fileContents.set('/project/pom.xml', '<project>Maven project</project>');
    
    const result = await detectBuildTools(files, fileContents);
    expect(result).toContain('Maven');
  });
  
  it('should detect Gradle from build.gradle', async () => {
    const files = ['/project/build.gradle'];
    const fileContents = new Map<string, string>();
    fileContents.set('/project/build.gradle', 'apply plugin: "java"');
    
    const result = await detectBuildTools(files, fileContents);
    expect(result).toContain('Gradle');
  });
  
  it('should detect Make from Makefile', async () => {
    const files = ['/project/Makefile'];
    const fileContents = new Map<string, string>();
    fileContents.set('/project/Makefile', 'all: build\nbuild: compile');
    
    const result = await detectBuildTools(files, fileContents);
    expect(result).toContain('Make');
  });
  
  it('should detect Poetry from pyproject.toml', async () => {
    const files = ['/project/pyproject.toml'];
    const fileContents = new Map<string, string>();
    fileContents.set('/project/pyproject.toml', '[tool.poetry]');
    
    const result = await detectBuildTools(files, fileContents);
    expect(result).toContain('Poetry');
  });
  
  it('should detect tox from tox.ini', async () => {
    const files = ['/project/tox.ini'];
    const fileContents = new Map<string, string>();
    fileContents.set('/project/tox.ini', '[tox]');
    
    const result = await detectBuildTools(files, fileContents);
    expect(result).toContain('tox');
  });
  
  it('should detect Cargo from Cargo.toml', async () => {
    const files = ['/project/Cargo.toml'];
    const fileContents = new Map<string, string>();
    fileContents.set('/project/Cargo.toml', '[package]');
    
    const result = await detectBuildTools(files, fileContents);
    expect(result).toContain('Cargo');
  });
  
  it('should detect CMake from CMakeLists.txt', async () => {
    const files = ['/project/CMakeLists.txt'];
    const fileContents = new Map<string, string>();
    fileContents.set('/project/CMakeLists.txt', 'cmake_minimum_required(VERSION 3.10)');
    
    const result = await detectBuildTools(files, fileContents);
    expect(result).toContain('CMake');
  });
  
  it('should detect Bundler from Gemfile', async () => {
    const files = ['/project/Gemfile'];
    const fileContents = new Map<string, string>();
    fileContents.set('/project/Gemfile', 'source "https://rubygems.org"');
    
    const result = await detectBuildTools(files, fileContents);
    expect(result).toContain('Bundler');
  });
  
  it('should detect pip from requirements.txt', async () => {
    const files = ['/project/requirements.txt'];
    const fileContents = new Map<string, string>();
    fileContents.set('/project/requirements.txt', 'flask==2.0.0');
    
    const result = await detectBuildTools(files, fileContents);
    expect(result).toContain('pip');
  });
  
  it('should return empty array for no build tools', async () => {
    const files: string[] = [];
    const fileContents = new Map<string, string>();
    
    const result = await detectBuildTools(files, fileContents);
    expect(result).toEqual([]);
  });
});