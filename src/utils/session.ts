/**
 * Session management utility for DocGen
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SessionData, SessionMetadata } from '../types';
import { getSessionStoragePath } from './config';
import * as logger from './logger';

/**
 * Generate a session ID based on the project name and a timestamp
 * @param projectName The project name
 * @returns The session ID
 */
export const generateSessionId = (projectName: string): string => {
  const timestamp = Date.now();
  const hash = crypto
    .createHash('md5')
    .update(`${projectName}-${timestamp}`)
    .digest('hex')
    .substring(0, 8);
  
  return `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${hash}`;
};

/**
 * Ensure the session directory exists
 */
const ensureSessionDirectory = (): void => {
  const sessionDir = getSessionStoragePath();
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
};

/**
 * Get the file path for a session
 * @param sessionId The session ID
 * @returns The file path
 */
const getSessionFilePath = (sessionId: string): string => {
  return path.join(getSessionStoragePath(), `${sessionId}.json`);
};

/**
 * Save a session
 * @param sessionId The session ID
 * @param data The session data
 */
export const saveSession = (sessionId: string, data: SessionData): void => {
  try {
    ensureSessionDirectory();
    
    // Update the last updated timestamp
    const sessionData: SessionData = {
      ...data,
      _lastUpdated: new Date().toISOString()
    };
    
    const filePath = getSessionFilePath(sessionId);
    fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2), 'utf8');
    
    logger.info('Session saved', { sessionId, filePath });
  } catch (error) {
    logger.error('Error saving session', { error, sessionId });
    throw new Error(`Error saving session: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Load a session
 * @param sessionId The session ID
 * @returns The session data
 */
export const loadSession = (sessionId: string): SessionData => {
  try {
    const filePath = getSessionFilePath(sessionId);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    const sessionData = JSON.parse(fs.readFileSync(filePath, 'utf8')) as SessionData;
    logger.info('Session loaded', { sessionId, filePath });
    
    return sessionData;
  } catch (error) {
    logger.error('Error loading session', { error, sessionId });
    throw new Error(`Error loading session: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * List all available sessions
 * @returns The session metadata
 */
export const listSessions = (): SessionMetadata[] => {
  try {
    ensureSessionDirectory();
    const sessionDir = getSessionStoragePath();
    
    if (!fs.existsSync(sessionDir)) {
      return [];
    }
    
    const sessionFiles = fs.readdirSync(sessionDir)
      .filter(file => file.endsWith('.json'));
    
    const sessions: SessionMetadata[] = [];
    
    for (const file of sessionFiles) {
      try {
        const filePath = path.join(sessionDir, file);
        const sessionData = JSON.parse(fs.readFileSync(filePath, 'utf8')) as SessionData;
        
        if (sessionData.projectInfo) {
          sessions.push({
            sessionId: path.basename(file, '.json'),
            projectName: sessionData.projectInfo.name,
            lastUpdated: sessionData._lastUpdated || new Date().toISOString()
          });
        }
      } catch (error) {
        logger.warn('Error parsing session file', { error, file });
        // Skip this file and continue
      }
    }
    
    // Sort by last updated, most recent first
    return sessions.sort((a, b) => 
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );
  } catch (error) {
    logger.error('Error listing sessions', { error });
    return [];
  }
};

/**
 * Delete a session
 * @param sessionId The session ID
 */
export const deleteSession = (sessionId: string): void => {
  try {
    const filePath = getSessionFilePath(sessionId);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info('Session deleted', { sessionId, filePath });
    } else {
      logger.warn('Session not found for deletion', { sessionId, filePath });
    }
  } catch (error) {
    logger.error('Error deleting session', { error, sessionId });
    throw new Error(`Error deleting session: ${error instanceof Error ? error.message : String(error)}`);
  }
};