import type { Collection, MovieItem } from '@/types'

export interface ExportData {
  version: string
  exportedAt: string
  collection: {
    name: string
    items: Omit<MovieItem, 'id' | 'addedAt' | 'updatedAt' | 'addedBy' | 'updatedBy'>[]
  }
}

/**
 * Export a collection to JSON format
 */
export async function exportCollection(
  collection: Collection,
  items: MovieItem[]
): Promise<string> {
  const exportData: ExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    collection: {
      name: collection.name,
      items: items.map((item) => {
        // Remove Firestore-specific fields
        const { id, addedAt, updatedAt, addedBy, updatedBy, ...itemData } = item
        return itemData
      }),
    },
  }

  return JSON.stringify(exportData, null, 2)
}

/**
 * Download exported data as a file
 */
export function downloadExport(data: string, filename: string) {
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Parse CSV line handling quoted fields with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  // Add last field
  result.push(current.trim())
  
  return result
}

/**
 * Parse CSV text into array of objects
 */
function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row')
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''))
  
  // Parse data rows
  const items: any[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, ''))
    if (values.length !== headers.length) continue
    
    const item: any = {}
    headers.forEach((header, index) => {
      const value = values[index]
      // Try to parse as number or boolean, otherwise keep as string
      if (value === 'true' || value === 'TRUE') {
        item[header] = true
      } else if (value === 'false' || value === 'FALSE') {
        item[header] = false
      } else if (!isNaN(Number(value)) && value !== '') {
        item[header] = Number(value)
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Try to parse as array
        try {
          item[header] = JSON.parse(value)
        } catch {
          item[header] = value
        }
      } else {
        item[header] = value
      }
    })
    items.push(item)
  }
  
  return items
}

/**
 * Convert CSV items to MovieItem format
 */
function convertCSVToMovieItems(items: any[]): Omit<MovieItem, 'id' | 'addedAt' | 'updatedAt' | 'addedBy' | 'updatedBy'>[] {
  return items.map(item => {
    // Map common CSV column names to MovieItem fields
    const movieItem: any = {
      movieId: item.movieId || item.movie_id || item['Movie ID'] || `tmdb:${item.tmdbId || item.tmdb_id || ''}`,
      title: item.title || item.Title || item.name || item.Name || '',
      year: item.year || item.Year || item.release_year || 0,
      type: (item.type || item.Type || item.media_type || 'movie').toLowerCase() === 'tv' ? 'tv' : 'movie',
      poster: item.poster || item.poster_path || item['Poster URL'] || undefined,
      runtime: item.runtime || item.Runtime || undefined,
      genres: Array.isArray(item.genres) ? item.genres : 
              typeof item.genres === 'string' ? item.genres.split(',').map((g: string) => g.trim()) : 
              item.Genres ? item.Genres.split(',').map((g: string) => g.trim()) : [],
      critics: {
        imdb: item.imdb || item.IMDB || item.imdb_rating || undefined,
        metacritic: item.metacritic || item.Metacritic || item.metacritic_score || undefined,
        rottenTomatoes: item.rottenTomatoes || item['Rotten Tomatoes'] || item.rt_score || undefined,
      },
      trailer: item.trailer ? (typeof item.trailer === 'string' ? JSON.parse(item.trailer) : item.trailer) : undefined,
      formats: Array.isArray(item.formats) ? item.formats : 
              typeof item.formats === 'string' ? item.formats.split(',').map((f: string) => f.trim()) : 
              item.Formats ? item.Formats.split(',').map((f: string) => f.trim()) : ['DVD'],
      condition: item.condition || item.Condition || undefined,
      location: item.location || item.Location || undefined,
      quantity: item.quantity || item.Quantity || 1,
    }

    // TV show specific fields
    if (movieItem.type === 'tv') {
      movieItem.numberOfSeasons = item.numberOfSeasons || item['Number of Seasons'] || undefined
      movieItem.numberOfEpisodes = item.numberOfEpisodes || item['Number of Episodes'] || undefined
      movieItem.firstAirDate = item.firstAirDate || item['First Air Date'] || undefined
    }

    return movieItem
  })
}

/**
 * Fetch CSV from Google Sheets URL
 */
export async function fetchGoogleSheetsCSV(url: string): Promise<string> {
  try {
    // Extract sheet ID from various Google Sheets URL formats
    let sheetId = ''
    let gid = '0'
    
    // Format 1: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit#gid={GID}
    // Format 2: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit?usp=sharing
    // Format 3: https://docs.google.com/spreadsheets/d/{SHEET_ID}
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (match) {
      sheetId = match[1]
    }
    
    // Extract GID if present
    const gidMatch = url.match(/[#&]gid=([0-9]+)/)
    if (gidMatch) {
      gid = gidMatch[1]
    }
    
    if (!sheetId) {
      throw new Error('Invalid Google Sheets URL format')
    }
    
    // Fetch as CSV
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
    const response = await fetch(csvUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheet: ${response.status} ${response.statusText}`)
    }
    
    return await response.text()
  } catch (error: any) {
    throw new Error(`Failed to fetch Google Sheet: ${error.message}`)
  }
}

/**
 * Parse imported JSON file
 */
export function parseImportFile(file: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const fileName = file.name.toLowerCase()
        
        // Check if it's a CSV file
        if (fileName.endsWith('.csv')) {
          const items = parseCSV(text)
          const movieItems = convertCSVToMovieItems(items)
          const collectionName = file.name.replace('.csv', '') || `Imported Collection ${new Date().toLocaleDateString()}`
          
          resolve({
            version: '1.0',
            exportedAt: new Date().toISOString(),
            collection: {
              name: collectionName,
              items: movieItems,
            },
          })
          return
        }
        
        // Otherwise, treat as JSON
        const data = JSON.parse(text) as ExportData
        
        // Validate the import data structure
        if (!data.collection || !data.collection.name) {
          throw new Error('Invalid import file format: missing collection name')
        }
        
        if (!Array.isArray(data.collection.items)) {
          throw new Error('Invalid import file format: items must be an array')
        }
        
        resolve(data)
      } catch (error: any) {
        reject(new Error(`Failed to parse import file: ${error.message}`))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsText(file)
  })
}

/**
 * Parse imported data from Google Sheets URL
 */
export async function parseGoogleSheetsImport(url: string, collectionName?: string): Promise<ExportData> {
  try {
    const csvText = await fetchGoogleSheetsCSV(url)
    const items = parseCSV(csvText)
    const movieItems = convertCSVToMovieItems(items)
    
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      collection: {
        name: collectionName || `Imported Collection ${new Date().toLocaleDateString()}`,
        items: movieItems,
      },
    }
  } catch (error: any) {
    throw new Error(`Failed to import from Google Sheets: ${error.message}`)
  }
}

/**
 * Validate imported items
 */
export function validateImportItems(items: any[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  items.forEach((item, index) => {
    if (!item.title) {
      errors.push(`Item ${index + 1}: Missing title`)
    }
    if (!item.movieId) {
      errors.push(`Item ${index + 1}: Missing movieId`)
    }
    if (typeof item.year !== 'number') {
      errors.push(`Item ${index + 1}: Invalid year`)
    }
    if (!item.type || !['movie', 'tv'].includes(item.type)) {
      errors.push(`Item ${index + 1}: Invalid type (must be 'movie' or 'tv')`)
    }
    if (!Array.isArray(item.genres)) {
      errors.push(`Item ${index + 1}: Genres must be an array`)
    }
    if (!Array.isArray(item.formats)) {
      errors.push(`Item ${index + 1}: Formats must be an array`)
    }
    if (typeof item.quantity !== 'number') {
      errors.push(`Item ${index + 1}: Invalid quantity`)
    }
  })
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

