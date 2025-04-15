// Free alternative to AI image generation using stock photos from Unsplash

/**
 * Map poem content to an appropriate category for image selection
 * @param text Poem content, title, or any text to analyze
 * @returns Category string for image search
 */
export function analyzeContentForImageCategory(text: string): string {
  const lowercaseText = text.toLowerCase();
  
  const categories = [
    { name: "nature", keywords: ["tree", "leaf", "green", "earth", "plant", "garden", "nature", "forest", "woods"] },
    { name: "landscape", keywords: ["mountain", "hill", "landscape", "horizon", "vista", "valley", "panorama"] },
    { name: "abstract", keywords: ["abstract", "concept", "idea", "thought", "dream", "imagination", "vision"] },
    { name: "sunset", keywords: ["sunset", "dusk", "twilight", "evening", "dawn", "sun", "horizon", "orange", "red"] },
    { name: "ocean", keywords: ["ocean", "sea", "water", "wave", "beach", "shore", "coast", "blue"] },
    { name: "flowers", keywords: ["flower", "bloom", "blossom", "petal", "rose", "tulip", "garden", "botanical"] },
    { name: "stars", keywords: ["star", "night", "sky", "moon", "galaxy", "universe", "cosmic", "space"] },
    { name: "clouds", keywords: ["cloud", "sky", "heaven", "white", "gray", "storm", "rain", "weather"] },
    { name: "city", keywords: ["city", "urban", "street", "building", "skyscraper", "downtown", "architecture"] },
    { name: "love", keywords: ["love", "heart", "romance", "passion", "affection", "relationship", "embrace"] },
    { name: "sadness", keywords: ["sad", "tears", "sorrow", "grief", "melancholy", "weep", "pain", "loneliness"] },
    { name: "joy", keywords: ["joy", "happy", "happiness", "delight", "smile", "laugh", "celebrate", "cheer"] },
    { name: "time", keywords: ["time", "clock", "moment", "hour", "day", "past", "future", "eternal", "memory"] }
  ];
  
  // Score each category based on keyword matches
  const scores = categories.map(category => {
    const score = category.keywords.reduce((total, keyword) => {
      // Check if keyword is in the text
      if (lowercaseText.includes(keyword)) {
        return total + 1;
      }
      return total;
    }, 0);
    
    return { name: category.name, score };
  });
  
  // Sort by score (highest first)
  scores.sort((a, b) => b.score - a.score);
  
  // Return highest scoring category or default to 'abstract'
  return scores[0].score > 0 ? scores[0].name : 'abstract';
}

/**
 * Generate an image URL from Unsplash based on category
 * @param category Category for the image
 * @returns URL for an appropriate stock image
 */
export function generateUnsplashImageUrl(category: string): string {
  const imageSize = "1200x800";
  const randomSeed = Math.floor(Math.random() * 1000); // Ensure variety of images
  return `https://source.unsplash.com/${imageSize}/?${category}&sig=${randomSeed}`;
}

/**
 * Fetch image data from a URL and convert to base64
 * @param url URL to fetch the image from
 * @returns Promise with base64 encoded image data
 */
export async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error fetching image:', error);
    // Return a simple gray placeholder image if fetch fails
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  }
}

/**
 * Generate a relevant image for poem content
 * @param text Poem content or title to analyze
 * @returns Promise with base64 encoded image data
 */
export async function generateImageForPoem(text: string): Promise<string> {
  const category = analyzeContentForImageCategory(text);
  const imageUrl = generateUnsplashImageUrl(category);
  return fetchImageAsBase64(imageUrl);
}