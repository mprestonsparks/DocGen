/**
 * Workflow artifact management functionality
 */

import * as fs from 'fs';
import * as path from 'path';
import * as logger from '../../../utils/logger';
import { WorkflowState } from './types';

/**
 * Save workflow artifact
 */
export async function saveArtifact(
  artifactPath: string,
  content: string | Buffer,
  metadata: {
    type: string;
    stepId: string;
  }
): Promise<WorkflowState['artifacts'][0]> {
  try {
    // Ensure directory exists
    const dir = path.dirname(artifactPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write artifact
    if (typeof content === 'string') {
      await fs.promises.writeFile(artifactPath, content, 'utf8');
    } else {
      await fs.promises.writeFile(artifactPath, content);
    }

    return {
      id: path.basename(artifactPath),
      type: metadata.type,
      path: artifactPath,
      stepId: metadata.stepId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to save artifact', { error, artifactPath });
    throw error;
  }
}

/**
 * Load workflow artifact
 */
export async function loadArtifact(
  artifact: WorkflowState['artifacts'][0]
): Promise<string | Buffer> {
  try {
    const content = await fs.promises.readFile(artifact.path);
    return content;
  } catch (error) {
    logger.error('Failed to load artifact', { error, artifact });
    throw error;
  }
}

/**
 * List workflow artifacts
 */
export function listArtifacts(
  state: WorkflowState,
  filter?: {
    type?: string;
    stepId?: string;
  }
): WorkflowState['artifacts'] {
  try {
    let artifacts = state.artifacts;

    if (filter?.type) {
      artifacts = artifacts.filter(a => a.type === filter.type);
    }

    if (filter?.stepId) {
      artifacts = artifacts.filter(a => a.stepId === filter.stepId);
    }

    return artifacts;
  } catch (error) {
    logger.error('Failed to list artifacts', { error });
    throw error;
  }
}

/**
 * Clean up workflow artifacts
 */
export async function cleanupArtifacts(
  state: WorkflowState,
  filter?: {
    type?: string;
    stepId?: string;
    olderThan?: Date;
  }
): Promise<void> {
  try {
    const artifacts = listArtifacts(state, filter);

    for (const artifact of artifacts) {
      if (filter?.olderThan && new Date(artifact.timestamp) > filter.olderThan) {
        continue;
      }

      if (fs.existsSync(artifact.path)) {
        await fs.promises.unlink(artifact.path);
      }
    }
  } catch (error) {
    logger.error('Failed to cleanup artifacts', { error });
    throw error;
  }
}
