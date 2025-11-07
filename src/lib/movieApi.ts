import type { MovieSearchResult, MovieDetails, TVShowDetails } from '@/types'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

export function getPosterUrl(path: string | undefined, size: 'w154' | 'w342' | 'w500' | 'w780' = 'w500'): string {
  if (!path) return '/placeholder-poster.png'
  return `${TMDB_IMAGE_BASE}/${size}${path}`
}

export async function searchMovies(query: string, page = 1): Promise<{ results: MovieSearchResult[]; totalPages: number }> {
  if (!TMDB_API_KEY || TMDB_API_KEY === 'your_tmdb_api_key') {
    throw new Error('TMDB API key not configured. Please add VITE_TMDB_API_KEY to your .env file and restart the dev server.')
  }

  if (!query || query.trim().length === 0) {
    return { results: [], totalPages: 0 }
  }

  const response = await fetch(
    `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query.trim())}&page=${page}`
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    
    // Handle TMDB specific error codes
    if (errorData.status_code === 7 || response.status === 401) {
      throw new Error(
        'TMDB API key is invalid. Please:\n' +
        '1. Get a free API key at https://www.themoviedb.org/settings/api\n' +
        '2. Add VITE_TMDB_API_KEY=your_key_here to your .env file\n' +
        '3. Restart your dev server (npm run dev)'
      )
    }
    if (errorData.status_code === 25 || response.status === 429) {
      throw new Error('TMDB API rate limit exceeded. Please try again later.')
    }
    throw new Error(errorData.status_message || `Failed to search movies: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return {
    results: data.results || [],
    totalPages: data.total_pages || 1,
  }
}

export async function getMovieDetails(movieId: number): Promise<MovieDetails> {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB API key not configured. Please add VITE_TMDB_API_KEY to your .env file.')
  }

  const response = await fetch(
    `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits,watch/providers`
  )

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('TMDB API key is invalid or unauthorized. Please check your VITE_TMDB_API_KEY in .env file.')
    }
    if (response.status === 404) {
      throw new Error('Movie not found')
    }
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.status_message || `Failed to fetch movie details: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function searchTVShows(query: string, page = 1): Promise<{ results: MovieSearchResult[]; totalPages: number }> {
  if (!TMDB_API_KEY || TMDB_API_KEY === 'your_tmdb_api_key') {
    throw new Error('TMDB API key not configured. Please add VITE_TMDB_API_KEY to your .env file and restart the dev server.')
  }

  if (!query || query.trim().length === 0) {
    return { results: [], totalPages: 0 }
  }

  const response = await fetch(
    `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query.trim())}&page=${page}`
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    
    if (errorData.status_code === 7 || response.status === 401) {
      throw new Error(
        'TMDB API key is invalid. Please:\n' +
        '1. Get a free API key at https://www.themoviedb.org/settings/api\n' +
        '2. Add VITE_TMDB_API_KEY=your_key_here to your .env file\n' +
        '3. Restart your dev server (npm run dev)'
      )
    }
    if (errorData.status_code === 25 || response.status === 429) {
      throw new Error('TMDB API rate limit exceeded. Please try again later.')
    }
    throw new Error(errorData.status_message || `Failed to search TV shows: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return {
    results: (data.results || []).map((show: any) => ({
      id: show.id,
      title: show.name,
      first_air_date: show.first_air_date,
      poster_path: show.poster_path,
      overview: show.overview,
      vote_average: show.vote_average,
      media_type: 'tv' as const,
    })),
    totalPages: data.total_pages || 1,
  }
}

export async function searchMulti(query: string, page = 1): Promise<{ results: MovieSearchResult[]; totalPages: number }> {
  if (!TMDB_API_KEY || TMDB_API_KEY === 'your_tmdb_api_key') {
    throw new Error('TMDB API key not configured. Please add VITE_TMDB_API_KEY to your .env file and restart the dev server.')
  }

  if (!query || query.trim().length === 0) {
    return { results: [], totalPages: 0 }
  }

  const response = await fetch(
    `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query.trim())}&page=${page}`
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    
    if (errorData.status_code === 7 || response.status === 401) {
      throw new Error(
        'TMDB API key is invalid. Please:\n' +
        '1. Get a free API key at https://www.themoviedb.org/settings/api\n' +
        '2. Add VITE_TMDB_API_KEY=your_key_here to your .env file\n' +
        '3. Restart your dev server (npm run dev)'
      )
    }
    if (errorData.status_code === 25 || response.status === 429) {
      throw new Error('TMDB API rate limit exceeded. Please try again later.')
    }
    throw new Error(errorData.status_message || `Failed to search: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return {
    results: (data.results || [])
      .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
      .map((item: any) => ({
        id: item.id,
        title: item.title || item.name,
        release_date: item.release_date,
        first_air_date: item.first_air_date,
        poster_path: item.poster_path,
        overview: item.overview,
        vote_average: item.vote_average,
        media_type: item.media_type,
      })),
    totalPages: data.total_pages || 1,
  }
}

export async function getTVShowDetails(tvId: number): Promise<TVShowDetails> {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB API key not configured. Please add VITE_TMDB_API_KEY to your .env file.')
  }

  const response = await fetch(
    `${TMDB_BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits,watch/providers`
  )

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('TMDB API key is invalid or unauthorized. Please check your VITE_TMDB_API_KEY in .env file.')
    }
    if (response.status === 404) {
      throw new Error('TV show not found')
    }
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.status_message || `Failed to fetch TV show details: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function getPopularMovies(page = 1): Promise<{ results: MovieSearchResult[]; totalPages: number }> {
  if (!TMDB_API_KEY || TMDB_API_KEY === 'your_tmdb_api_key') {
    throw new Error('TMDB API key not configured. Please add VITE_TMDB_API_KEY to your .env file and restart the dev server.')
  }

  const response = await fetch(
    `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    
    if (errorData.status_code === 7 || response.status === 401) {
      throw new Error(
        'TMDB API key is invalid. Please:\n' +
        '1. Get a free API key at https://www.themoviedb.org/settings/api\n' +
        '2. Add VITE_TMDB_API_KEY=your_key_here to your .env file\n' +
        '3. Restart your dev server (npm run dev)'
      )
    }
    if (errorData.status_code === 25 || response.status === 429) {
      throw new Error('TMDB API rate limit exceeded. Please try again later.')
    }
    throw new Error(errorData.status_message || `Failed to fetch popular movies: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return {
    results: (data.results || []).map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      release_date: movie.release_date,
      poster_path: movie.poster_path,
      overview: movie.overview,
      vote_average: movie.vote_average,
      media_type: 'movie' as const,
    })),
    totalPages: data.total_pages || 1,
  }
}

export async function getPopularTVShows(page = 1): Promise<{ results: MovieSearchResult[]; totalPages: number }> {
  if (!TMDB_API_KEY || TMDB_API_KEY === 'your_tmdb_api_key') {
    throw new Error('TMDB API key not configured. Please add VITE_TMDB_API_KEY to your .env file and restart the dev server.')
  }

  const response = await fetch(
    `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&page=${page}`
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    
    if (errorData.status_code === 7 || response.status === 401) {
      throw new Error(
        'TMDB API key is invalid. Please:\n' +
        '1. Get a free API key at https://www.themoviedb.org/settings/api\n' +
        '2. Add VITE_TMDB_API_KEY=your_key_here to your .env file\n' +
        '3. Restart your dev server (npm run dev)'
      )
    }
    if (errorData.status_code === 25 || response.status === 429) {
      throw new Error('TMDB API rate limit exceeded. Please try again later.')
    }
    throw new Error(errorData.status_message || `Failed to fetch popular TV shows: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return {
    results: (data.results || []).map((show: any) => ({
      id: show.id,
      title: show.name,
      first_air_date: show.first_air_date,
      poster_path: show.poster_path,
      overview: show.overview,
      vote_average: show.vote_average,
      media_type: 'tv' as const,
    })),
    totalPages: data.total_pages || 1,
  }
}

// Fetch watch providers for a movie or TV show
export async function getWatchProviders(movieId: number, type: 'movie' | 'tv'): Promise<{
  flatrate?: Array<{ provider_id: number; provider_name: string; logo_path?: string }>
  buy?: Array<{ provider_id: number; provider_name: string; logo_path?: string }>
  rent?: Array<{ provider_id: number; provider_name: string; logo_path?: string }>
} | null> {
  if (!TMDB_API_KEY) {
    return null
  }

  try {
    const endpoint = type === 'movie' ? 'movie' : 'tv'
    const response = await fetch(
      `${TMDB_BASE_URL}/${endpoint}/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const usProviders = data.results?.US
    if (!usProviders) return null

    return {
      flatrate: usProviders.flatrate || [],
      buy: usProviders.buy || [],
      rent: usProviders.rent || [],
    }
  } catch {
    return null
  }
}

export async function getMovieByBarcode(barcode: string): Promise<MovieSearchResult | null> {
  // Barcode lookup would typically require a UPC/EAN to movie mapping service
  // For now, we'll try searching with the barcode as a query
  // In production, you might use a service like UPCitemdb or maintain your own mapping
  try {
    const { results } = await searchMulti(barcode, 1)
    return results[0] || null
  } catch {
    return null
  }
}
