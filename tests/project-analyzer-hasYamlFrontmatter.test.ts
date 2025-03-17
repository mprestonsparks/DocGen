/**
 * Tests for the hasYamlFrontmatter function in project-analyzer.ts
 */
import * as fs from 'fs';
import * as yaml from 'js-yaml';

// Mock yaml to test the function
jest.mock('js-yaml', () => ({
  load: jest.fn()
}));

// Import a module that contains the hasYamlFrontmatter function
import { hasYamlFrontmatter } from '../src/utils/project-analyzer-testables';

describe('hasYamlFrontmatter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false if content has no frontmatter', () => {
    const content = 'This is just a regular markdown file with no frontmatter.';
    const result = hasYamlFrontmatter(content);
    expect(result).toBe(false);
  });

  it('should return true if content has valid YAML frontmatter', () => {
    const content = `---
title: Test Document
author: Test User
date: 2023-01-01
---
Content goes here.`;

    // Mock the yaml.load function to return a valid object
    (yaml.load as jest.Mock).mockReturnValue({ title: 'Test Document' });

    const result = hasYamlFrontmatter(content);
    expect(result).toBe(true);
  });

  it('should return false if frontmatter is invalid YAML', () => {
    const content = `---
title: Test Document
author: Test User
date: 2023-01-01: malformed
---
Content goes here.`;

    // Mock the yaml.load function to throw an error
    (yaml.load as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid YAML');
    });

    const result = hasYamlFrontmatter(content);
    expect(result).toBe(false);
  });

  it('should return false if content has frontmatter-like structure but is not valid', () => {
    const content = `-- Not quite frontmatter
title: Test Document
---
Content goes here.`;

    const result = hasYamlFrontmatter(content);
    expect(result).toBe(false);
  });
});