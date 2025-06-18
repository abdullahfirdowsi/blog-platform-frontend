export const normalizeTag = (tag: string) => tag.trim().toLowerCase();
export const normalizeTags = (tags: string[] = []) => tags.map(normalizeTag);
export const areTagsEqual = (a: string, b: string) => normalizeTag(a) === normalizeTag(b);

