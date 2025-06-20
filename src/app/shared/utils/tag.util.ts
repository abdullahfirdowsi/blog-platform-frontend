/**
 * Tag utility functions for normalizing and comparing tags
 */

/**
 * Normalizes a single tag by trimming whitespace and converting to lowercase
 * @param tag - The tag string to normalize
 * @returns The normalized tag string
 */
export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

/**
 * Normalizes an array of tags
 * @param tags - Array of tag strings to normalize
 * @returns Array of normalized tag strings
 */
export function normalizeTags(tags: string[]): string[] {
  return tags.map(tag => normalizeTag(tag)).filter(tag => tag.length > 0);
}

/**
 * Compares two tags for equality (case-insensitive)
 * @param tag1 - First tag to compare
 * @param tag2 - Second tag to compare
 * @returns True if tags are equal, false otherwise
 */
export function areTagsEqual(tag1: string, tag2: string): boolean {
  return normalizeTag(tag1) === normalizeTag(tag2);
}

