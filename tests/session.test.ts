/**
 * Tests for session utility
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as session from '../src/utils/session';
import { SessionData } from '../src/types';

// Mock config
jest.mock('../src/utils/config', () => ({
  getSessionStoragePath: jest.fn(() => '/mock/sessions')
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn()
}));

// Mock fs
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
  unlinkSync: jest.fn()
}));

// Mock crypto
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  createHash: jest.fn()
}));

describe('Session Utility', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSessionId', () => {
    it('should generate a session ID based on project name and timestamp', () => {
      // Setup
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('1234567890abcdef')
      };
      (crypto.createHash as jest.Mock).mockReturnValue(mockHash);
      
      // Execute
      const sessionId = session.generateSessionId('Test Project');
      
      // Verify
      expect(crypto.createHash).toHaveBeenCalledWith('md5');
      expect(mockHash.update).toHaveBeenCalledWith(expect.stringMatching(/Test Project-\d+/));
      expect(mockHash.digest).toHaveBeenCalledWith('hex');
      expect(sessionId).toBe('test-project-12345678');
    });

    it('should sanitize project name for session ID', () => {
      // Setup
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('1234567890abcdef')
      };
      (crypto.createHash as jest.Mock).mockReturnValue(mockHash);
      
      // Execute
      const sessionId = session.generateSessionId('Test @#$% Project!');
      
      // Verify
      expect(sessionId).toBe('test------project--12345678');
    });
  });

  describe('saveSession', () => {
    it('should save session data to a file', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const sessionData: SessionData = {
        projectInfo: {
          id: 'PROJ-001',
          name: 'Test Project',
          description: 'A test project',
          type: 'WEB',
          created: '2025-03-06T12:00:00Z'
        },
        interviewAnswers: {
          'What is the main goal?': 'Testing'
        }
      };
      
      // Execute
      session.saveSession('test-session', sessionData);
      
      // Verify
      expect(fs.existsSync).toHaveBeenCalledWith('/mock/sessions');
      expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/sessions', { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/mock/sessions/test-session.json',
        expect.any(String),
        'utf8'
      );
      
      // Verify the JSON contains the updated timestamp
      const writtenData = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1]);
      expect(writtenData._lastUpdated).toBeDefined();
    });

    it('should handle errors when saving session', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Write error');
      });
      
      // Execute & Verify
      expect(() => 
        session.saveSession('test-session', { interviewAnswers: {} })
      ).toThrow('Error saving session: Write error');
    });
  });

  describe('loadSession', () => {
    it('should load session data from a file', () => {
      // Setup
      const mockSessionData: SessionData = {
        projectInfo: {
          id: 'PROJ-001',
          name: 'Test Project',
          description: 'A test project',
          type: 'WEB',
          created: '2025-03-06T12:00:00Z'
        },
        interviewAnswers: {},
        _lastUpdated: '2025-03-06T12:00:00Z'
      };
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockSessionData));
      
      // Execute
      const result = session.loadSession('test-session');
      
      // Verify
      expect(fs.existsSync).toHaveBeenCalledWith('/mock/sessions/test-session.json');
      expect(fs.readFileSync).toHaveBeenCalledWith('/mock/sessions/test-session.json', 'utf8');
      expect(result).toEqual(mockSessionData);
    });

    it('should throw an error if session does not exist', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      // Execute & Verify
      expect(() => session.loadSession('nonexistent-session')).toThrow('Session not found');
    });

    it('should handle errors when loading session', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read error');
      });
      
      // Execute & Verify
      expect(() => session.loadSession('test-session')).toThrow('Error loading session: Read error');
    });
  });

  describe('listSessions', () => {
    it('should list all available sessions', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['session1.json', 'session2.json', 'not-a-session.txt']);
      
      const mockSessionData1 = {
        projectInfo: { name: 'Project 1' },
        _lastUpdated: '2025-03-06T13:00:00Z'
      };
      
      const mockSessionData2 = {
        projectInfo: { name: 'Project 2' },
        _lastUpdated: '2025-03-06T12:00:00Z'
      };
      
      (fs.readFileSync as jest.Mock).mockImplementation((filePath) => {
        if (filePath.includes('session1.json')) {
          return JSON.stringify(mockSessionData1);
        } else if (filePath.includes('session2.json')) {
          return JSON.stringify(mockSessionData2);
        }
        return '';
      });
      
      // Execute
      const sessions = session.listSessions();
      
      // Verify
      expect(fs.readdirSync).toHaveBeenCalledWith('/mock/sessions');
      expect(sessions.length).toBe(2);
      
      // Sessions should be sorted by last updated (most recent first)
      expect(sessions[0].sessionId).toBe('session1');
      expect(sessions[0].projectName).toBe('Project 1');
      expect(sessions[1].sessionId).toBe('session2');
      expect(sessions[1].projectName).toBe('Project 2');
    });

    it('should handle errors when reading session files', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['session1.json', 'invalid.json']);
      
      (fs.readFileSync as jest.Mock).mockImplementation((filePath) => {
        if (filePath.includes('session1.json')) {
          return JSON.stringify({
            projectInfo: { name: 'Project 1' },
            _lastUpdated: '2025-03-06T12:00:00Z'
          });
        } else if (filePath.includes('invalid.json')) {
          throw new Error('Parse error');
        }
        return '';
      });
      
      // Execute
      const sessions = session.listSessions();
      
      // Verify - should skip the invalid file and continue
      expect(sessions.length).toBe(1);
      expect(sessions[0].sessionId).toBe('session1');
    });

    it('should return empty array if session directory does not exist', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      // Execute
      const sessions = session.listSessions();
      
      // Verify
      expect(sessions).toEqual([]);
    });
  });

  describe('deleteSession', () => {
    it('should delete a session file', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      // Execute
      session.deleteSession('test-session');
      
      // Verify
      expect(fs.unlinkSync).toHaveBeenCalledWith('/mock/sessions/test-session.json');
    });

    it('should handle case when session file does not exist', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      // Execute
      session.deleteSession('nonexistent-session');
      
      // Verify
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle errors when deleting session', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw new Error('Delete error');
      });
      
      // Execute & Verify
      expect(() => session.deleteSession('test-session')).toThrow('Error deleting session: Delete error');
    });
  });
});