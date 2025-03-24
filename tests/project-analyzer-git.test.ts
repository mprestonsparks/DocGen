/**
 * Tests for git detection functions in project-analyzer-testables.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { hasExistingGit } from '../src/utils/project-analyzer-testables';

// Mock fs functions
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  statSync: jest.fn()
}));

describe('Git detection functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('hasExistingGit', () => {
    it('should return true if project has a .git directory', () => {
      // Mock .git directory exists and is a directory
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ 
        isDirectory: () => true 
      });
      
      const result = hasExistingGit('/test/project');
      
      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith(
        path.join('/test/project', '.git')
      );
    });
    
    it('should return false if .git directory does not exist', () => {
      // Mock .git directory does not exist
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const result = hasExistingGit('/test/project');
      
      expect(result).toBe(false);
      expect(fs.existsSync).toHaveBeenCalledWith(
        path.join('/test/project', '.git')
      );
      // statSync should not be called
      expect(fs.statSync).not.toHaveBeenCalled();
    });
    
    it('should return false if .git exists but is not a directory', () => {
      // Mock .git exists but is not a directory (e.g., a file)
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ 
        isDirectory: () => false 
      });
      
      const result = hasExistingGit('/test/project');
      
      expect(result).toBe(false);
      expect(fs.existsSync).toHaveBeenCalledWith(
        path.join('/test/project', '.git')
      );
      expect(fs.statSync).toHaveBeenCalled();
    });
  });
});