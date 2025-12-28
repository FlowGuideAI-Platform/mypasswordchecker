/**
 * Phonetic Password Generator
 * Converts memorable phrases into quantum-resistant passwords
 *
 * Features:
 * - Phonetic substitutions for memorability
 * - Randomized variations (never same output twice)
 * - Quantum resistance validation (80+ bits entropy)
 * - Multiple character encoding strategies
 */

const PhoneticGenerator = (() => {
  // NATO Phonetic Alphabet (for level 5 only)
  const natoPhonetic = {
    'a': 'Alpha', 'b': 'Bravo', 'c': 'Charlie', 'd': 'Delta', 'e': 'Echo',
    'f': 'Foxtrot', 'g': 'Golf', 'h': 'Hotel', 'i': 'India', 'j': 'Juliett',
    'k': 'Kilo', 'l': 'Lima', 'm': 'Mike', 'n': 'November', 'o': 'Oscar',
    'p': 'Papa', 'q': 'Quebec', 'r': 'Romeo', 's': 'Sierra', 't': 'Tango',
    'u': 'Uniform', 'v': 'Victor', 'w': 'Whiskey', 'x': 'X-ray', 'y': 'Yankee', 'z': 'Zulu'
  };

  // Simple substitutions for lower levels - memorable and easy to type
  const simpleSubstitutions = {
    'a': ['A', '@'],
    'e': ['E', '3'],
    'i': ['I', '!'],
    'o': ['O', '0'],
    's': ['S', '$'],
    't': ['T'],
    'b': ['B'],
    'c': ['C'],
    'd': ['D'],
    'f': ['F'],
    'g': ['G'],
    'h': ['H'],
    'j': ['J'],
    'k': ['K'],
    'l': ['L'],
    'm': ['M'],
    'n': ['N'],
    'p': ['P'],
    'q': ['Q'],
    'r': ['R'],
    'u': ['U'],
    'v': ['V'],
    'w': ['W'],
    'x': ['X'],
    'y': ['Y'],
    'z': ['Z']
  };

  // Full substitution rules with multiple options per character (for medium-high levels)
  // Using only ASCII and common readable characters for better compatibility
  const substitutions = {
    'a': ['@', '4', 'A'],
    'b': ['8', 'B'],
    'c': ['(', 'C'],
    'd': ['D'],
    'e': ['3', 'E'],
    'f': ['F'],
    'g': ['9', '6', 'G'],
    'h': ['#', 'H'],
    'i': ['1', '!', 'I', '|'],
    'j': ['J'],
    'k': ['K'],
    'l': ['1', '|', 'L'],
    'm': ['M'],
    'n': ['N'],
    'o': ['0', 'O'],
    'p': ['P'],
    'q': ['Q'],
    'r': ['R'],
    's': ['$', '5', 'S'],
    't': ['7', 'T', '+'],
    'u': ['U'],
    'v': ['V'],
    'w': ['W'],
    'x': ['X'],
    'y': ['Y'],
    'z': ['Z', '2']
  };

  // Word separators (randomly chosen) - ASCII only for readability
  const separators = ['_', '-', '~', '^', '=', '+', '*', '&', '%', '#'];

  // Special characters for entropy boosting
  const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '=', '[', ']', '{', '}', '|', ':', ';', '<', '>', '?', '~'];

  // Capitalization patterns
  const capPatterns = [
    'first',      // First letter of each word
    'random',     // Random letters
    'alternate',  // Alternate capitals
    'bookend',    // First and last
    'camel'       // camelCase style
  ];

  /**
   * Generate random variation of phonetic password
   * Uses timestamp and random seeds to ensure uniqueness
   */
  function generateVariation(phrase, options = {}, iterationIndex = 0) {
    const {
      aggressiveness = 'medium' // very-low, low, medium, high, very-high
    } = options;

    // Adjust minimum entropy based on aggressiveness level
    // Lower levels (very-low, low) are NOT quantum safe but still strong passwords
    // Using pessimistic quantum estimates (more conservative)
    const entropyTargets = {
      'very-low': 20,   // Strong password, very memorable (10-20 days pessimistic quantum, NOT quantum safe)
      'low': 30,         // Strong password, memorable (20-50 days pessimistic quantum, NOT quantum safe)
      'medium': 80,      // Quantum safe begins (1+ years pessimistic)
      'high': 90,        // Strong quantum resistance
      'very-high': 100   // Maximum quantum resistance
    };
    const minEntropy = options.minEntropy || entropyTargets[aggressiveness] || 80;

    // Adjust minimum length based on aggressiveness level
    const minLengthTargets = {
      'very-low': 0,    // No minimum - use natural phrase length
      'low': 0,         // No minimum - use natural phrase length
      'medium': 20,
      'high': 20,
      'very-high': 20
    };
    const minLength = options.minLength || minLengthTargets[aggressiveness] || 20;

    // Maximum boost attempts based on aggressiveness
    // Level 1: No boosting (keep simple)
    // Level 2: Minimal boosting (add year or simple suffix)
    // Level 3: Moderate boosting
    // Level 4: Aggressive boosting
    // Level 5: Moderate boosting (NATO already adds complexity)
    const maxBoostAttempts = {
      'very-low': 0,   // Level 1: NO boosting - keep it simple and memorable
      'low': 3,        // Level 2: Light boosting - maybe add year or simple suffix
      'medium': 6,     // Level 3: Moderate boosting
      'high': 10,      // Level 4: Aggressive boosting
      'very-high': 6   // Level 5: Moderate boosting
    };
    const maxBoosts = maxBoostAttempts[aggressiveness] || 10;

    // Add timestamp-based seed for uniqueness (add iteration to ensure different seeds)
    const timeSeed = (Date.now() + iterationIndex * 1000) % 10000;
    const randomSeed = Math.random() + (iterationIndex * 0.1);

    // Clean phrase
    const words = phrase.toLowerCase().trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) {
      throw new Error('Phrase must contain at least one word');
    }

    // For level 5 (very-high), convert to NATO phonetic alphabet FIRST
    let processedWords = words;
    if (aggressiveness === 'very-high') {
      processedWords = words.map(word => {
        // Convert each letter to its NATO phonetic equivalent
        const phoneticParts = word.split('').map(char => {
          const nato = natoPhonetic[char.toLowerCase()];
          if (nato) {
            // Use first 3-4 letters of NATO word
            return nato.substring(0, Math.min(4, nato.length));
          }
          return char; // Keep non-alphabetic chars as-is
        });
        // Join letters of the word together (no separator within word)
        return phoneticParts.join('');
      });
    }

    // Determine substitution aggressiveness and table
    // Level 1: Simple subs only
    // Level 2: Simple subs with higher chance
    // Level 3: Full substitutions
    // Level 4: Aggressive full substitutions
    // Level 5: NATO phonetic with moderate substitutions
    const subConfig = {
      'very-low': { chance: 0.35, table: simpleSubstitutions },   // Level 1
      'low': { chance: 0.55, table: simpleSubstitutions },        // Level 2
      'medium': { chance: 0.65, table: substitutions },           // Level 3
      'high': { chance: 0.80, table: substitutions },             // Level 4
      'very-high': { chance: 0.60, table: substitutions }         // Level 5 (NATO)
    };
    const { chance: subChance, table: subsTable } = subConfig[aggressiveness] || subConfig['medium'];

    // Transform each word
    const transformedWords = processedWords.map((word, wordIndex) => {
      return word.split('').map((char, charIndex) => {
        const subs = subsTable[char];

        if (!subs) return char; // No substitution available

        // Decide whether to substitute (using time + random for variability)
        const shouldSub = ((timeSeed + wordIndex + charIndex + randomSeed) % 100) / 100 < subChance;

        if (shouldSub) {
          // Pick random substitution (time-seeded for variability)
          const subIndex = Math.floor(((timeSeed + charIndex + randomSeed * 1000) % subs.length));
          return subs[subIndex];
        }

        return char;
      }).join('');
    });

    // Apply capitalization pattern - each level has specific patterns
    let capitalized;
    let pattern;
    if (aggressiveness === 'very-low') {
      // Level 1: Minimal capitalization - mostly lowercase
      if (Math.random() > 0.5) {
        capitalized = transformedWords;
        pattern = 'lowercase';
      } else {
        capitalized = transformedWords.map(w => w.charAt(0).toUpperCase() + w.slice(1));
        pattern = 'first';
      }
    } else if (aggressiveness === 'low') {
      // Level 2: Always capitalize first letter of each word
      capitalized = transformedWords.map(w => w.charAt(0).toUpperCase() + w.slice(1));
      pattern = 'first';
    } else if (aggressiveness === 'medium') {
      // Level 3: Use camelCase or bookend patterns
      const mediumPatterns = ['camel', 'bookend'];
      pattern = mediumPatterns[Math.floor((timeSeed + randomSeed * 100) % mediumPatterns.length)];
      capitalized = applyCapitalization(transformedWords, pattern, timeSeed, randomSeed);
    } else if (aggressiveness === 'high') {
      // Level 4: Use alternate or random patterns (more chaotic)
      const highPatterns = ['alternate', 'random'];
      pattern = highPatterns[Math.floor((timeSeed + randomSeed * 100) % highPatterns.length)];
      capitalized = applyCapitalization(transformedWords, pattern, timeSeed, randomSeed);
    } else {
      // Level 5: Use first letter capitalization for NATO words
      capitalized = transformedWords.map(w => w.charAt(0).toUpperCase() + w.slice(1));
      pattern = 'first';
    }

    // Join with separator - each level uses different separators
    let separator;
    if (aggressiveness === 'very-low') {
      // Level 1: Always use space - most readable/memorable (like "! LoV3 c0ff33 @ Sunr!s3")
      separator = ' ';
    } else if (aggressiveness === 'low') {
      // Level 2: Use hyphen or underscore only (readable but more secure than space)
      const level2Separators = ['-', '_'];
      separator = level2Separators[Math.floor((timeSeed + randomSeed * 200) % level2Separators.length)];
    } else if (aggressiveness === 'medium') {
      // Level 3: Use moderate special chars
      const level3Separators = ['_', '-', '~', '^'];
      separator = level3Separators[Math.floor((timeSeed + randomSeed * 200) % level3Separators.length)];
    } else if (aggressiveness === 'high') {
      // Level 4: Use aggressive special chars
      const level4Separators = ['~', '^', '=', '+', '*', '&', '%', '#'];
      separator = level4Separators[Math.floor((timeSeed + randomSeed * 200) % level4Separators.length)];
    } else {
      // Level 5: Always use hyphen for NATO phonetic words
      separator = '-';
    }
    let password = capitalized.join(separator);

    // Calculate initial entropy
    let entropy = QuantumEstimator.calculateEntropy(password);

    // Add entropy boosters if needed - different strategies per level
    let boostAttempts = 0;
    while (entropy < minEntropy && boostAttempts < maxBoosts) {
      if (aggressiveness === 'low') {
        // Level 2: Add simple digits at the end (like year)
        const boostDigit = String((timeSeed + boostAttempts) % 10);
        password = password + boostDigit;
      } else if (aggressiveness === 'medium') {
        // Level 3: Add special char + digit pairs at end
        const boostChar = specialChars[Math.floor((timeSeed + boostAttempts + randomSeed * 300) % specialChars.length)];
        const boostDigit = String((timeSeed + boostAttempts) % 10);
        password = password + boostChar + boostDigit;
      } else {
        // Level 4 & 5: Insert special char + digit at random positions
        const boostChar = specialChars[Math.floor((timeSeed + boostAttempts + randomSeed * 300) % specialChars.length)];
        const boostDigit = String((timeSeed + boostAttempts) % 10);

        if (Math.random() > 0.5) {
          password = password + boostChar + boostDigit;
        } else {
          const insertPos = Math.floor(Math.random() * password.length);
          password = password.slice(0, insertPos) + boostChar + boostDigit + password.slice(insertPos);
        }
      }

      entropy = QuantumEstimator.calculateEntropy(password);
      boostAttempts++;
    }

    // Ensure minimum length (but not for very-low/low - keep them simple!)
    if (aggressiveness !== 'very-low' && aggressiveness !== 'low') {
      while (password.length < minLength) {
        const extra = specialChars[Math.floor((timeSeed + password.length + randomSeed * 400) % specialChars.length)];
        password += extra;
        entropy = QuantumEstimator.calculateEntropy(password);
      }
    }

    return {
      password,
      entropy,
      length: password.length,
      pattern,
      aggressiveness
    };
  }

  /**
   * Apply capitalization pattern to words
   */
  function applyCapitalization(words, pattern, timeSeed, randomSeed) {
    switch (pattern) {
      case 'first':
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1));

      case 'random':
        return words.map(w =>
          w.split('').map(c =>
            (Math.random() + (timeSeed % 100) / 100) > 0.5 ? c.toUpperCase() : c
          ).join('')
        );

      case 'alternate':
        return words.map(w =>
          w.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c).join('')
        );

      case 'bookend':
        return words.map(w => {
          if (w.length <= 1) return w.toUpperCase();
          return w.charAt(0).toUpperCase() + w.slice(1, -1) + w.charAt(w.length - 1).toUpperCase();
        });

      case 'camel':
        return words.map((w, i) =>
          i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)
        );

      default:
        return words;
    }
  }

  /**
   * Generate multiple variations
   */
  function generateMultiple(phrase, count = 5, options = {}) {
    const variations = [];

    for (let i = 0; i < count; i++) {
      // Pass iteration index to ensure different seeds for each variation
      const variation = generateVariation(phrase, options, i);

      // Get full analysis using quantum estimator
      const analysis = QuantumEstimator.estimateTimes(variation.password);

      // Check if quantum resistant (1+ year = 365+ days) using pessimistic estimates
      const quantumSeconds = analysis.quantum.pessimistic.human.seconds || 0;
      const quantumDays = quantumSeconds / 86400; // Convert seconds to days
      const isQuantumResistant = quantumDays >= 365;

      variations.push({
        password: variation.password,
        entropy: variation.entropy,
        length: variation.length,
        pattern: variation.pattern,
        aggressiveness: variation.aggressiveness,
        quantumResistant: isQuantumResistant,
        classical: analysis.classical,
        quantum: analysis.quantum,
        zxcvbn: analysis.zxcvbn
      });
    }

    // Sort by entropy (highest first)
    variations.sort((a, b) => b.entropy - a.entropy);

    return variations;
  }

  return {
    generateVariation,
    generateMultiple
  };
})();

// Expose to window for widget compatibility
if (typeof window !== 'undefined') {
  window.PhoneticGenerator = PhoneticGenerator;
}
