/**
 * Utility functions
 */

export { isLLMApiAvailable, callLLM } from './llm';

/**
 * Generate a unique ID for an entity
 */
export function generateUniqueId(prefix: string, name: string): string {
  const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const timestamp = Date.now();
  return `${prefix}_${sanitizedName}_${timestamp}`;
}

/**
 * Extract JSON from a string that might contain other text
 */
export function extractJson(str: string): string | null {
  const jsonMatch = str.match(/```json\s*([\s\S]*?)\s*```/) || 
                   str.match(/```\s*([\s\S]*?)\s*```/) ||
                   str.match(/(\{[\s\S]*\})/);
                   
  return jsonMatch ? jsonMatch[1] : null;
}
