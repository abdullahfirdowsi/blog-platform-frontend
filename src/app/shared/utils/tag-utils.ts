// Tag abbreviation mapping configuration
export interface TagMapping {
  abbreviation: string;
  fullForm: string;
  aliases?: string[];
  category?: string;
}

// Comprehensive tag mapping for common abbreviations
export const TAG_MAPPINGS: TagMapping[] = [
  // Technology & Programming
  { abbreviation: 'ai', fullForm: 'Artificial Intelligence', aliases: ['artificial-intelligence', 'machine-intelligence'], category: 'technology' },
  { abbreviation: 'ml', fullForm: 'Machine Learning', aliases: ['machine-learning', 'statistical-learning'], category: 'technology' },
  { abbreviation: 'dl', fullForm: 'Deep Learning', aliases: ['deep-learning', 'neural-networks'], category: 'technology' },
  { abbreviation: 'nlp', fullForm: 'Natural Language Processing', aliases: ['natural-language-processing', 'text-processing'], category: 'technology' },
  { abbreviation: 'cv', fullForm: 'Computer Vision', aliases: ['computer-vision', 'image-processing'], category: 'technology' },
  { abbreviation: 'api', fullForm: 'Application Programming Interface', aliases: ['application-programming-interface', 'web-api'], category: 'technology' },
  { abbreviation: 'ui', fullForm: 'User Interface', aliases: ['user-interface', 'frontend'], category: 'technology' },
  { abbreviation: 'ux', fullForm: 'User Experience', aliases: ['user-experience', 'design'], category: 'technology' },
  { abbreviation: 'db', fullForm: 'Database', aliases: ['database', 'data-storage'], category: 'technology' },
  { abbreviation: 'devops', fullForm: 'Development Operations', aliases: ['development-operations', 'deployment'], category: 'technology' },
  { abbreviation: 'ci', fullForm: 'Continuous Integration', aliases: ['continuous-integration', 'automation'], category: 'technology' },
  { abbreviation: 'cd', fullForm: 'Continuous Deployment', aliases: ['continuous-deployment', 'delivery'], category: 'technology' },
  { abbreviation: 'seo', fullForm: 'Search Engine Optimization', aliases: ['search-engine-optimization', 'web-optimization'], category: 'marketing' },
  { abbreviation: 'cms', fullForm: 'Content Management System', aliases: ['content-management-system', 'website-management'], category: 'technology' },
  { abbreviation: 'iot', fullForm: 'Internet of Things', aliases: ['internet-of-things', 'connected-devices'], category: 'technology' },
  { abbreviation: 'ar', fullForm: 'Augmented Reality', aliases: ['augmented-reality', 'mixed-reality'], category: 'technology' },
  { abbreviation: 'vr', fullForm: 'Virtual Reality', aliases: ['virtual-reality', 'immersive-tech'], category: 'technology' },
  
  // Business & Finance
  { abbreviation: 'roi', fullForm: 'Return on Investment', aliases: ['return-on-investment', 'profitability'], category: 'business' },
  { abbreviation: 'kpi', fullForm: 'Key Performance Indicator', aliases: ['key-performance-indicator', 'metrics'], category: 'business' },
  { abbreviation: 'crm', fullForm: 'Customer Relationship Management', aliases: ['customer-relationship-management', 'sales'], category: 'business' },
  { abbreviation: 'erp', fullForm: 'Enterprise Resource Planning', aliases: ['enterprise-resource-planning', 'business-software'], category: 'business' },
  { abbreviation: 'b2b', fullForm: 'Business to Business', aliases: ['business-to-business', 'enterprise'], category: 'business' },
  { abbreviation: 'b2c', fullForm: 'Business to Consumer', aliases: ['business-to-consumer', 'retail'], category: 'business' },
  
  // General
  { abbreviation: 'diy', fullForm: 'Do It Yourself', aliases: ['do-it-yourself', 'self-made'], category: 'lifestyle' },
  { abbreviation: 'faq', fullForm: 'Frequently Asked Questions', aliases: ['frequently-asked-questions', 'help'], category: 'general' },
  { abbreviation: 'qa', fullForm: 'Quality Assurance', aliases: ['quality-assurance', 'testing'], category: 'technology' },
  { abbreviation: 'qc', fullForm: 'Quality Control', aliases: ['quality-control', 'inspection'], category: 'business' }
];

// Utility functions for tag normalization
export const normalizeTag = (tag: string) => tag.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
export const normalizeTags = (tags: string[] = []) => tags.map(normalizeTag);
export const areTagsEqual = (a: string, b: string) => normalizeTag(a) === normalizeTag(b);

// Create lookup maps for efficient searching
const ABBREVIATION_TO_FULL_MAP = new Map<string, TagMapping>();
const FULL_TO_ABBREVIATION_MAP = new Map<string, TagMapping>();
const ALIAS_TO_MAPPING_MAP = new Map<string, TagMapping>();

// Initialize lookup maps
TAG_MAPPINGS.forEach(mapping => {
  const normalizedAbbr = normalizeTag(mapping.abbreviation);
  const normalizedFull = normalizeTag(mapping.fullForm);
  
  ABBREVIATION_TO_FULL_MAP.set(normalizedAbbr, mapping);
  FULL_TO_ABBREVIATION_MAP.set(normalizedFull, mapping);
  
  // Add aliases to the lookup
  if (mapping.aliases) {
    mapping.aliases.forEach(alias => {
      ALIAS_TO_MAPPING_MAP.set(normalizeTag(alias), mapping);
    });
  }
});

/**
 * Enhanced tag matching that handles abbreviations and full forms
 * Returns the best matching tag format and confidence score
 */
export interface TagMatchResult {
  matchedTag: string;
  confidence: number;
  matchType: 'exact' | 'abbreviation' | 'fullform' | 'alias' | 'partial';
  originalMapping?: TagMapping;
}

/**
 * Find the best tag match considering abbreviations, full forms, and aliases
 */
export function findBestTagMatch(
  userInput: string, 
  availableTags: string[], 
  preferFullForm: boolean = true
): TagMatchResult | null {
  const normalizedInput = normalizeTag(userInput);
  const normalizedAvailableTags = availableTags.map(tag => ({
    original: tag,
    normalized: normalizeTag(tag)
  }));
  
  // 1. Exact match
  const exactMatch = normalizedAvailableTags.find(tag => tag.normalized === normalizedInput);
  if (exactMatch) {
    return {
      matchedTag: exactMatch.original,
      confidence: 1.0,
      matchType: 'exact'
    };
  }
  
  // 2. Check if input is an abbreviation
  const abbreviationMapping = ABBREVIATION_TO_FULL_MAP.get(normalizedInput);
  if (abbreviationMapping) {
    // Look for the full form in available tags
    const fullFormMatch = normalizedAvailableTags.find(tag => 
      tag.normalized === normalizeTag(abbreviationMapping.fullForm)
    );
    if (fullFormMatch) {
      return {
        matchedTag: fullFormMatch.original,
        confidence: 0.95,
        matchType: 'fullform',
        originalMapping: abbreviationMapping
      };
    }
    
    // Look for aliases in available tags
    if (abbreviationMapping.aliases) {
      for (const alias of abbreviationMapping.aliases) {
        const aliasMatch = normalizedAvailableTags.find(tag => 
          tag.normalized === normalizeTag(alias)
        );
        if (aliasMatch) {
          return {
            matchedTag: aliasMatch.original,
            confidence: 0.9,
            matchType: 'alias',
            originalMapping: abbreviationMapping
          };
        }
      }
    }
  }
  
  // 3. Check if input is a full form
  const fullFormMapping = FULL_TO_ABBREVIATION_MAP.get(normalizedInput);
  if (fullFormMapping) {
    // Look for the abbreviation in available tags
    const abbrMatch = normalizedAvailableTags.find(tag => 
      tag.normalized === normalizeTag(fullFormMapping.abbreviation)
    );
    if (abbrMatch) {
      return {
        matchedTag: abbrMatch.original,
        confidence: 0.95,
        matchType: 'abbreviation',
        originalMapping: fullFormMapping
      };
    }
  }
  
  // 4. Check aliases
  const aliasMapping = ALIAS_TO_MAPPING_MAP.get(normalizedInput);
  if (aliasMapping) {
    // Look for the preferred form (full form or abbreviation) in available tags
    const preferredForm = preferFullForm ? aliasMapping.fullForm : aliasMapping.abbreviation;
    const preferredMatch = normalizedAvailableTags.find(tag => 
      tag.normalized === normalizeTag(preferredForm)
    );
    if (preferredMatch) {
      return {
        matchedTag: preferredMatch.original,
        confidence: 0.9,
        matchType: 'alias',
        originalMapping: aliasMapping
      };
    }
  }
  
  // 5. Partial matching (fuzzy matching)
  const partialMatches = normalizedAvailableTags.filter(tag => {
    const inputWords = normalizedInput.split('-');
    const tagWords = tag.normalized.split('-');
    
    // Check if any input word is contained in tag words or vice versa
    return inputWords.some(inputWord => 
      tagWords.some(tagWord => 
        inputWord.includes(tagWord) || tagWord.includes(inputWord)
      )
    );
  });
  
  if (partialMatches.length > 0) {
    // Return the first partial match with lower confidence
    return {
      matchedTag: partialMatches[0].original,
      confidence: 0.7,
      matchType: 'partial'
    };
  }
  
  return null;
}

/**
 * Get the preferred tag format (abbreviation or full form) for display
 */
export function getPreferredTagFormat(
  tag: string, 
  context: 'display' | 'storage' | 'search' = 'display'
): string {
  const normalizedTag = normalizeTag(tag);
  
  // Check if this tag has a mapping
  const abbreviationMapping = ABBREVIATION_TO_FULL_MAP.get(normalizedTag);
  const fullFormMapping = FULL_TO_ABBREVIATION_MAP.get(normalizedTag);
  const aliasMapping = ALIAS_TO_MAPPING_MAP.get(normalizedTag);
  
  const mapping = abbreviationMapping || fullFormMapping || aliasMapping;
  
  if (mapping) {
    switch (context) {
      case 'display':
        // For display, prefer full form for better readability
        return mapping.fullForm;
      case 'storage':
        // For storage, prefer abbreviation for consistency
        return mapping.abbreviation;
      case 'search':
        // For search, use original input but normalize
        return tag;
      default:
        return mapping.fullForm;
    }
  }
  
  // If no mapping found, return original tag
  return tag;
}

/**
 * Get all possible variations of a tag (abbreviation, full form, aliases)
 */
export function getTagVariations(tag: string): string[] {
  const normalizedTag = normalizeTag(tag);
  const variations = new Set<string>([tag]); // Include original
  
  // Check if this tag has a mapping
  const abbreviationMapping = ABBREVIATION_TO_FULL_MAP.get(normalizedTag);
  const fullFormMapping = FULL_TO_ABBREVIATION_MAP.get(normalizedTag);
  const aliasMapping = ALIAS_TO_MAPPING_MAP.get(normalizedTag);
  
  const mapping = abbreviationMapping || fullFormMapping || aliasMapping;
  
  if (mapping) {
    variations.add(mapping.abbreviation);
    variations.add(mapping.fullForm);
    if (mapping.aliases) {
      mapping.aliases.forEach(alias => variations.add(alias));
    }
  }
  
  return Array.from(variations);
}

/**
 * Check if two tags are semantically equivalent (considering abbreviations)
 */
export function areTagsEquivalent(tagA: string, tagB: string): boolean {
  if (areTagsEqual(tagA, tagB)) {
    return true;
  }
  
  const variationsA = getTagVariations(tagA).map(normalizeTag);
  const variationsB = getTagVariations(tagB).map(normalizeTag);
  
  // Check if any variation of tagA matches any variation of tagB
  return variationsA.some(varA => variationsB.some(varB => varA === varB));
}

// =============================================================================
// TAG DISPLAY AND RECOMMENDATION UTILITIES
// =============================================================================

export interface TagDisplayPreferences {
  showFullForms: boolean;
  showTooltips: boolean;
  showCategories: boolean;
  highlightMappedTags: boolean;
}

/**
 * Get the mapping for a tag if it exists
 */
export function getTagMapping(tag: string): TagMapping | null {
  const normalizedTag = normalizeTag(tag);
  
  // Check direct mappings
  let mapping: TagMapping | undefined = ABBREVIATION_TO_FULL_MAP.get(normalizedTag) || 
                FULL_TO_ABBREVIATION_MAP.get(normalizedTag) ||
                ALIAS_TO_MAPPING_MAP.get(normalizedTag);
  
  if (!mapping) {
    // Check if tag matches any mapping through variations
    mapping = TAG_MAPPINGS.find(m => 
      areTagsEquivalent(tag, m.abbreviation) || 
      areTagsEquivalent(tag, m.fullForm) ||
      (m.aliases && m.aliases.some(alias => areTagsEquivalent(tag, alias)))
    );
  }
  
  return mapping || null;
}

/**
 * Get display text for a tag based on preferences
 */
export function getTagDisplayText(tag: string, showFullForm: boolean = true): string {
  if (showFullForm) {
    return getPreferredTagFormat(tag, 'display');
  }
  return tag;
}

/**
 * Get tooltip text for a tag (shows all variations and mapping info)
 */
export function getTagTooltipText(tag: string): string | null {
  const variations = getTagVariations(tag);
  const mapping = getTagMapping(tag);
  
  if (variations.length <= 1 && !mapping) {
    return null;
  }

  const parts: string[] = [];
  
  if (mapping) {
    parts.push(`Full form: ${mapping.fullForm}`);
    parts.push(`Abbreviation: ${mapping.abbreviation}`);
    
    if (mapping.category) {
      parts.push(`Category: ${mapping.category}`);
    }
    
    if (mapping.aliases && mapping.aliases.length > 0) {
      parts.push(`Also known as: ${mapping.aliases.join(', ')}`);
    }
  } else if (variations.length > 1) {
    parts.push(`Variations: ${variations.join(', ')}`);
  }

  return parts.join('\n');
}

/**
 * Get CSS classes for a tag based on its properties
 */
export function getTagCssClasses(tag: string, baseClass: string = 'tag'): string[] {
  const classes = [baseClass];
  const mapping = getTagMapping(tag);
  
  if (mapping) {
    classes.push(`${baseClass}--mapped`);
    
    if (mapping.category) {
      classes.push(`${baseClass}--category-${mapping.category}`);
    }
  }
  
  return classes;
}

/**
 * Handle abbreviation conflicts by suggesting the best format for "For You" recommendations
 */
export function resolveForYouTagFormat(userInput: string, availableTags: string[]): {
  suggestedTag: string;
  reason: string;
  confidence: number;
  alternatives: string[];
} | null {
  const mapping = getTagMapping(userInput);
  
  if (!mapping) {
    return null;
  }
  
  const fullFormExists = availableTags.some(tag => areTagsEquivalent(tag, mapping.fullForm));
  const abbrExists = availableTags.some(tag => areTagsEquivalent(tag, mapping.abbreviation));
  
  if (fullFormExists && abbrExists) {
    // Both exist - suggest full form for clarity in "For You" context
    return {
      suggestedTag: mapping.fullForm,
      reason: 'Using full form for better clarity in recommendations',
      confidence: 0.95,
      alternatives: [mapping.abbreviation]
    };
  } else if (fullFormExists) {
    return {
      suggestedTag: mapping.fullForm,
      reason: `Full form available for "${userInput}"`,
      confidence: 0.9,
      alternatives: []
    };
  } else if (abbrExists) {
    return {
      suggestedTag: mapping.abbreviation,
      reason: `Abbreviation available for "${userInput}"`,
      confidence: 0.85,
      alternatives: []
    };
  }
  
  return null;
}

/**
 * Get smart display recommendations for "For You" section based on user interests
 */
export function getForYouRecommendations(userInterests: string[], availableTags: string[]): {
  recommendedTags: { tag: string; reason: string; confidence: number }[];
  conflictResolutions: Map<string, string>;
} {
  const recommendedTags: { tag: string; reason: string; confidence: number }[] = [];
  const conflictResolutions = new Map<string, string>();
  const processedTags = new Set<string>();
  
  userInterests.forEach(interest => {
    console.log(`🎯 Processing interest: "${interest}"`);
    
    // Try to find the best match using enhanced matching
    const matchResult = findBestTagMatch(interest, availableTags, true);
    
    if (matchResult) {
      const normalizedTag = normalizeTag(matchResult.matchedTag);
      
      // Avoid duplicates
      if (!processedTags.has(normalizedTag)) {
        processedTags.add(normalizedTag);
        
        // Check if there's a mapping conflict to resolve
        const resolution = resolveForYouTagFormat(interest, availableTags);
        
        let finalTag = matchResult.matchedTag;
        let reason = `Based on your interest in "${interest}"`;
        
        if (resolution && resolution.suggestedTag !== matchResult.matchedTag) {
          finalTag = resolution.suggestedTag;
          reason = resolution.reason;
          conflictResolutions.set(interest, 
            `"${interest}" → "${finalTag}" (${resolution.reason})`);
        }
        
        recommendedTags.push({
          tag: finalTag,
          reason: reason,
          confidence: matchResult.confidence
        });
        
        console.log(`✅ Recommended: "${finalTag}" for interest "${interest}" (${matchResult.matchType}, confidence: ${matchResult.confidence})`);
      }
    } else {
      console.log(`❌ No match found for interest: "${interest}"`);
    }
  });
  
  // Sort by confidence (highest first)
  recommendedTags.sort((a, b) => b.confidence - a.confidence);
  
  return { recommendedTags, conflictResolutions };
}

/**
 * Get explanation text for why a tag was recommended in "For You"
 */
export function getRecommendationExplanation(
  recommendedTag: string, 
  userInterest: string, 
  matchType: string,
  confidence: number
): string {
  const mapping = getTagMapping(recommendedTag);
  
  let explanation = `Recommended because you're interested in "${userInterest}"`;
  
  if (mapping) {
    if (matchType === 'fullform') {
      explanation += ` ("${userInterest}" is the abbreviation for "${recommendedTag}")`;
    } else if (matchType === 'abbreviation') {
      explanation += ` ("${userInterest}" is the full form of "${recommendedTag}")`;
    } else if (matchType === 'alias') {
      explanation += ` ("${userInterest}" is related to "${recommendedTag}")`;
    }
  }
  
  if (confidence < 0.8) {
    explanation += ` (${Math.round(confidence * 100)}% match)`;
  }
  
  return explanation;
}

