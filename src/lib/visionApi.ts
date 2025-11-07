const GOOGLE_VISION_API_KEY = import.meta.env.VITE_GOOGLE_VISION_API_KEY
const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate'

export interface VisionTextAnnotation {
  description: string
  boundingPoly?: {
    vertices: Array<{ x: number; y: number }>
  }
  locale?: string
}

export interface VisionBlock {
  boundingBox?: {
    vertices: Array<{ x: number; y: number }>
  }
  paragraphs?: Array<{
    boundingBox?: {
      vertices: Array<{ x: number; y: number }>
    }
    words?: Array<{
      boundingBox?: {
        vertices: Array<{ x: number; y: number }>
      }
      symbols?: Array<{
        text: string
        boundingBox?: {
          vertices: Array<{ x: number; y: number }>
        }
      }>
    }>
  }>
}

export interface VisionResponse {
  responses: Array<{
    textAnnotations?: VisionTextAnnotation[]
    fullTextAnnotation?: {
      text: string
      pages?: Array<{
        blocks?: VisionBlock[]
      }>
    }
    error?: {
      message: string
      code: number
    }
  }>
}

export interface TextWithPosition {
  text: string
  y: number // Top Y coordinate (lower = higher on page)
  height: number
  width: number
  centerX: number
  centerY: number
}

/**
 * Convert image data URL to base64 string for Google Vision API
 */
function imageDataUrlToBase64(dataUrl: string): string {
  // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
  const base64Match = dataUrl.match(/^data:image\/([a-z]+);base64,(.+)$/i)
  if (base64Match) {
    return base64Match[2]
  }
  // If already base64, return as is
  return dataUrl
}

/**
 * Enhance image for better OCR on dark covers
 * Applies contrast, brightness, and sharpening adjustments
 */
async function enhanceImageForOCR(imageDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      canvas.width = img.width
      canvas.height = img.height

      // Draw original image
      ctx.drawImage(img, 0, 0)

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      // Calculate average brightness and histogram in one pass
      let totalBrightness = 0
      const histogram = new Array(256).fill(0)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const brightness = (r + g + b) / 3
        totalBrightness += brightness
        histogram[Math.round(brightness)]++
      }
      const avgBrightness = totalBrightness / (data.length / 4)
      const isDarkImage = avgBrightness < 128

      // Find min and max brightness values (excluding outliers)
      let minBrightness = 0
      let maxBrightness = 255
      const totalPixels = data.length / 4
      let cumulative = 0
      for (let i = 0; i < 256; i++) {
        cumulative += histogram[i]
        if (cumulative > totalPixels * 0.01 && minBrightness === 0) {
          minBrightness = i
        }
        if (cumulative < totalPixels * 0.99) {
          maxBrightness = i
        }
      }

      // Enhance the image
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i]
        let g = data[i + 1]
        let b = data[i + 2]
        const originalBrightness = (r + g + b) / 3

        if (isDarkImage) {
          // For dark images, apply aggressive contrast enhancement
          // Use histogram equalization approach for better text visibility
          const normalizedBrightness = (originalBrightness - minBrightness) / (maxBrightness - minBrightness || 1)
          const enhancedBrightness = Math.pow(normalizedBrightness, 0.7) * 255 // Gamma correction
          
          // Preserve color ratios while enhancing brightness
          const ratio = enhancedBrightness / (originalBrightness || 1)
          r = Math.max(0, Math.min(255, r * ratio))
          g = Math.max(0, Math.min(255, g * ratio))
          b = Math.max(0, Math.min(255, b * ratio))

          // Additional contrast boost for dark images
          const contrast = 2.0
          const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255))
          r = Math.max(0, Math.min(255, factor * (r - 128) + 128))
          g = Math.max(0, Math.min(255, factor * (g - 128) + 128))
          b = Math.max(0, Math.min(255, factor * (b - 128) + 128))

          // Brighten mid-tones more aggressively for grey text on black
          if (originalBrightness > 30 && originalBrightness < 150) {
            const boost = 40
            r = Math.max(0, Math.min(255, r + boost))
            g = Math.max(0, Math.min(255, g + boost))
            b = Math.max(0, Math.min(255, b + boost))
          }
        } else {
          // For lighter images, moderate enhancement
          const contrast = 1.4
          const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255))
          
          r = Math.max(0, Math.min(255, factor * (r - 128) + 128))
          g = Math.max(0, Math.min(255, factor * (g - 128) + 128))
          b = Math.max(0, Math.min(255, factor * (b - 128) + 128))
        }

        // Apply edge enhancement for better text sharpness
        // This helps with grey text on dark backgrounds
        const edgeBoost = isDarkImage ? 0.3 : 0.15
        const brightnessDiff = Math.abs(originalBrightness - avgBrightness)
        if (brightnessDiff > 20) { // Edge detection threshold
          r = Math.max(0, Math.min(255, r + brightnessDiff * edgeBoost))
          g = Math.max(0, Math.min(255, g + brightnessDiff * edgeBoost))
          b = Math.max(0, Math.min(255, b + brightnessDiff * edgeBoost))
        }

        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
        // Alpha channel stays the same
      }

      // Put enhanced image data back
      ctx.putImageData(imageData, 0, 0)

      // Convert to data URL
      const enhancedDataUrl = canvas.toDataURL('image/jpeg', 0.95)
      resolve(enhancedDataUrl)
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    img.src = imageDataUrl
  })
}

/**
 * Extract text from image using Google Cloud Vision API
 */
export async function extractTextFromImage(
  imageDataUrl: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!GOOGLE_VISION_API_KEY || GOOGLE_VISION_API_KEY === 'your_google_vision_api_key') {
    throw new Error(
      'Google Vision API key not configured. Please add VITE_GOOGLE_VISION_API_KEY to your .env file.'
    )
  }

  try {
    onProgress?.(5)

    // Enhance image for better OCR on dark covers
    const enhancedImageDataUrl = await enhanceImageForOCR(imageDataUrl)
    onProgress?.(15)

    // Convert enhanced image to base64
    const base64Image = imageDataUrlToBase64(enhancedImageDataUrl)
    onProgress?.(30)

    // Prepare the request
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 1,
            },
          ],
        },
      ],
    }

    onProgress?.(50)

    // Call Google Vision API
    const response = await fetch(
      `${GOOGLE_VISION_API_URL}?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    onProgress?.(80)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (response.status === 400) {
        throw new Error('Invalid image format. Please try a different image.')
      } else if (response.status === 403) {
        throw new Error(
          'Google Vision API access denied. Please check your API key and ensure the Vision API is enabled.'
        )
      } else if (response.status === 429) {
        throw new Error('API rate limit exceeded. Please try again later.')
      }
      
      throw new Error(
        errorData.error?.message || `Failed to process image: ${response.status} ${response.statusText}`
      )
    }

    const data: VisionResponse = await response.json()
    onProgress?.(90)

    // Check for errors in response
    if (data.responses?.[0]?.error) {
      throw new Error(data.responses[0].error.message || 'Failed to extract text from image')
    }

    // Extract text from response
    const textAnnotation = data.responses?.[0]?.fullTextAnnotation
    const allAnnotations = data.responses?.[0]?.textAnnotations || []
    
    // The first annotation is usually the full text, but individual annotations might be out of order
    let text = textAnnotation?.text || allAnnotations[0]?.description || ''
    
    // If we have individual annotations, sort them by reading order (top to bottom, left to right)
    if (allAnnotations.length > 1) {
      const sortedAnnotations = [...allAnnotations]
        .slice(1) // Skip first one (it's the full text)
        .map((ann: VisionTextAnnotation) => {
          const vertices = ann.boundingPoly?.vertices || []
          if (vertices.length === 0) return { ...ann, y: Infinity, x: Infinity, avgY: Infinity }
          
          // Calculate bounding box properties
          const xs = vertices.map(v => v.x || 0).filter(x => x > 0)
          const ys = vertices.map(v => v.y || 0).filter(y => y > 0)
          
          if (xs.length === 0 || ys.length === 0) {
            return { ...ann, y: Infinity, x: Infinity, avgY: Infinity }
          }
          
          const minX = Math.min(...xs)
          const maxX = Math.max(...xs)
          const minY = Math.min(...ys)
          const maxY = Math.max(...ys)
          const avgY = (minY + maxY) / 2 // Average Y for better row detection
          const avgX = (minX + maxX) / 2 // Average X for horizontal sorting
          
          return {
            ...ann,
            y: minY,
            x: minX,
            avgY,
            avgX,
            height: maxY - minY,
            width: maxX - minX
          }
        })
        .filter((ann: any) => ann.y !== Infinity) // Remove invalid annotations
        .sort((a: any, b: any) => {
          // Sort by Y position first (top to bottom)
          // Use a threshold to group lines that are on the same row
          const rowThreshold = Math.min(a.height, b.height) * 0.8
          const yDiff = a.avgY - b.avgY
          
          if (Math.abs(yDiff) > rowThreshold) {
            // Different rows - sort by Y (top to bottom)
            return yDiff
          }
          // Same row - sort by X (left to right)
          return a.avgX - b.avgX
        })
      
      // Reconstruct text in reading order
      const orderedText = sortedAnnotations
        .map((ann: any) => ann.description)
        .filter((desc: string) => desc && desc.trim().length > 0)
        .join('\n')
      
      // Use ordered text if it's different and seems more logical
      // Compare character by character to see if order matters
      if (orderedText && orderedText.length > text.length * 0.3) {
        // Check if the ordered text is different from the original
        const originalLines = text.split('\n')
        const orderedLines = orderedText.split('\n')
        
        // If the first few lines are different, use the ordered version
        if (orderedLines.length > 0 && originalLines.length > 0) {
          const firstOriginal = originalLines[0].toLowerCase().trim()
          const firstOrdered = orderedLines[0].toLowerCase().trim()
          
          // If the first line is different, the order might be wrong
          if (firstOriginal !== firstOrdered && orderedLines.length >= originalLines.length) {
            text = orderedText
          }
        }
      }
    }

    onProgress?.(100)

    if (!text || text.trim().length === 0) {
      throw new Error('No text found in image. Please ensure the image contains readable text.')
    }

    // Extract text annotations with position data for title detection
    const textAnnotationsWithPosition = allAnnotations.slice(1).map((ann: VisionTextAnnotation) => {
      const vertices = ann.boundingPoly?.vertices || []
      if (vertices.length === 0) return null
      
      const xs = vertices.map(v => v.x || 0).filter(x => x > 0)
      const ys = vertices.map(v => v.y || 0).filter(y => y > 0)
      
      if (xs.length === 0 || ys.length === 0) return null
      
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2
      const width = maxX - minX
      const height = maxY - minY
      const area = width * height
      
      return {
        text: ann.description || '',
        centerX,
        centerY,
        minY,
        width,
        height,
        area,
        fontSize: height // Approximate font size
      }
    }).filter((item: any) => item !== null && item.text.trim().length > 0)

    // Return both the full text and structured annotations for better title detection
    return JSON.stringify({
      fullText: text.trim(),
      annotations: allAnnotations,
      blocks: textAnnotation?.pages?.[0]?.blocks || [],
      textAnnotationsWithPosition
    })
  } catch (error: any) {
    if (error.message) {
      throw error
    }
    throw new Error('Failed to extract text from image. Please try again.')
  }
}

