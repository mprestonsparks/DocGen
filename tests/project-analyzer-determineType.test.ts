/**
 * Tests for the determineProjectType function from project-analyzer.ts
 */
import { determineProjectType } from '../src/utils/project-analyzer-testables';
import { ProjectType } from '../src/types';

describe('determineProjectType', () => {
  it('should detect mobile projects', () => {
    // Test with React Native
    let result = determineProjectType(
      [{ name: 'JavaScript', percentage: 80, files: 20 }],
      ['ReactNative'],
      new Map()
    );
    expect(result).toBe('MOBILE');

    // Test with Flutter
    result = determineProjectType(
      [{ name: 'Dart', percentage: 80, files: 20 }],
      ['Flutter'],
      new Map()
    );
    expect(result).toBe('MOBILE');

    // Test with SwiftUI
    result = determineProjectType(
      [{ name: 'Swift', percentage: 80, files: 20 }],
      ['SwiftUI'],
      new Map()
    );
    expect(result).toBe('MOBILE');
  });

  it('should detect web projects', () => {
    // Test with React
    let result = determineProjectType(
      [{ name: 'JavaScript', percentage: 80, files: 20 }],
      ['React'],
      new Map()
    );
    expect(result).toBe('WEB');

    // Test with Angular
    result = determineProjectType(
      [{ name: 'TypeScript', percentage: 80, files: 20 }],
      ['Angular'],
      new Map()
    );
    expect(result).toBe('WEB');

    // Test with Node
    result = determineProjectType(
      [{ name: 'JavaScript', percentage: 80, files: 20 }],
      ['Node'],
      new Map()
    );
    expect(result).toBe('WEB');
  });

  it('should detect API projects', () => {
    const apiContent = new Map<string, string>();
    apiContent.set('/project/app.js', 'This is an API endpoint for REST services');

    const result = determineProjectType(
      [{ name: 'JavaScript', percentage: 80, files: 20 }],
      [], // No specific frameworks
      apiContent
    );
    expect(result).toBe('API');
  });

  it('should detect desktop projects', () => {
    // Test with Electron
    let result = determineProjectType(
      [{ name: 'JavaScript', percentage: 80, files: 20 }],
      ['Electron'],
      new Map()
    );
    expect(result).toBe('DESKTOP');

    // Test with WPF
    result = determineProjectType(
      [{ name: 'C#', percentage: 80, files: 20 }],
      ['WPF'],
      new Map()
    );
    expect(result).toBe('DESKTOP');

    // Test based on language percentage
    result = determineProjectType(
      [{ name: 'C#', percentage: 80, files: 20 }],
      [], // No specific frameworks
      new Map()
    );
    expect(result).toBe('DESKTOP');
  });

  it('should default to OTHER when no specific type is detected', () => {
    // No specific frameworks or languages that indicate a type
    const result = determineProjectType(
      [{ name: 'JavaScript', percentage: 20, files: 5 }],
      [],
      new Map()
    );
    expect(result).toBe('OTHER');
  });
});