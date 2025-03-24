/**
 * Tests for session utilities in session.ts
 */
import fs from 'fs';
import path from 'path';
import * as session from '../src/utils/session';
import * as config from '../src/utils/config';
import { SessionData } from '../src/types';

// Mock fs functions
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
  unlinkSync: jest.fn()
}));

// Mock dependencies
jest.mock('../src/utils/config', () => ({
  getSessionStoragePath: jest.fn().mockReturnValue('/test/sessions'),
  getLogLevel: jest.fn().mockReturnValue('info')
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  getLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })
}));

describe('Session utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('generateSessionId', () => {
    it('should generate a valid session ID from project name', () => {
      const result = session.generateSessionId('Test Project');
      
      // Should include lowercased project name with dashes
      expect(result).toMatch(/^test-project-[a-f0-9]{8}$/);
    });
    
    it('should generate unique session IDs for different project names', () => {
      const id1 = session.generateSessionId('Project1');
      const id2 = session.generateSessionId('Project2');
      
      expect(id1).not.toBe(id2);
    });
    
    it('should sanitize project names for safe file paths', () => {
      const result = session.generateSessionId('Test/Project!@#');
      
      // Should replace unsafe characters with dashes
      // Note: Actual implementation uses all character replacements together, not exact number of dashes
      expect(result).toMatch(/^test-project[a-z0-9-]*-[a-f0-9]{8}$/);
    });
  });
  
  describe('saveSession', () => {
    it('should save session data', () => {
      // Prepare test data
      const sessionId = 'test-session-12345678';
      const sessionData = {
        projectInfo: {
          name: 'Test Project',
          type: 'WEB'
        },
        interviewAnswers: {
          projectName: 'Test Project',
          projectType: 'WEB'
        }
      };
      
      // Mock file system
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      // Call the function
      session.saveSession(sessionId, sessionData);
      
      // Should have created the directory
      expect(fs.mkdirSync).toHaveBeenCalledWith('/test/sessions', { recursive: true });
      
      // Should have written the file
      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeArgs = (fs.writeFileSync as jest.Mock).mock.calls[0];
      expect(writeArgs[0]).toBe('/test/sessions/test-session-12345678.json');
      
      // Should have added _lastUpdated field
      const savedData = JSON.parse(writeArgs[1]);
      expect(savedData._lastUpdated).toBeDefined();
    });
  });
  
  describe('loadSession', () => {
    it('should load existing session data', () => {
      // Prepare test data
      const sessionId = 'test-session-12345678';
      const sessionData = {
        projectInfo: {
          name: 'Test Project',
          type: 'WEB'
        },
        interviewAnswers: {
          projectName: 'Test Project',
          projectType: 'WEB'
        },
        _lastUpdated: '2023-06-01T12:00:00Z'
      };
      
      // Mock file system
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(sessionData));
      
      // Call the function
      const result = session.loadSession(sessionId);
      
      // Should have read the file
      expect(fs.readFileSync).toHaveBeenCalledWith('/test/sessions/test-session-12345678.json', 'utf8');
      
      // Should return the parsed data
      expect(result).toEqual(sessionData);
    });
    
    it('should throw an error if session does not exist', () => {
      // Mock file system
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      // Call the function
      expect(() => session.loadSession('nonexistent-session'))
        .toThrow('Error loading session: Session not found: nonexistent-session');
    });
  });
  
  describe('listSessions', () => {
    it('should list all sessions', () => {
      // Prepare test data
      const sessionFiles = ['session1.json', 'session2.json'];
      const sessionData1 = {
        projectInfo: { name: 'Project 1' },
        _lastUpdated: '2023-06-01T12:00:00Z'
      };
      const sessionData2 = {
        projectInfo: { name: 'Project 2' },
        _lastUpdated: '2023-06-02T12:00:00Z'
      };
      
      // Mock file system
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(sessionFiles);
      (fs.readFileSync as jest.Mock)
        .mockReturnValueOnce(JSON.stringify(sessionData1))
        .mockReturnValueOnce(JSON.stringify(sessionData2));
      
      // Call the function
      const result = session.listSessions();
      
      // Should have the correct number of sessions
      expect(result.length).toBe(2);
      
      // Should be sorted by date (most recent first)
      expect(result[0].projectName).toBe('Project 2');
      expect(result[1].projectName).toBe('Project 1');
    });
    
    it('should return empty array if session directory does not exist', () => {
      // Mock file system
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      // Call the function
      const result = session.listSessions();
      
      // Should return empty array
      expect(result).toEqual([]);
    });
  });
  
  describe('deleteSession', () => {
    it('should delete an existing session', () => {
      // Mock file system
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      // Call the function
      session.deleteSession('test-session-12345678');
      
      // Should have deleted the file
      expect(fs.unlinkSync).toHaveBeenCalledWith('/test/sessions/test-session-12345678.json');
    });
    
    it('should not throw if session does not exist', () => {
      // Mock file system
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      // Call the function
      expect(() => session.deleteSession('nonexistent-session')).not.toThrow();
      
      // Should not have deleted any file
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });
});