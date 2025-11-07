import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { useQuery } from '@tanstack/react-query'
import { searchMulti, getPosterUrl, getMovieDetails, getTVShowDetails, getPopularMovies, getPopularTVShows } from '@/lib/movieApi'
import { useAddMovie } from '@/hooks/useMovies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import MediaPreviewModal from '@/components/MediaPreviewModal'
import StreamingProviders from '@/components/StreamingProviders'
import { Search, Film, Plus, Tv, Eye, Loader2, TrendingUp } from 'lucide-react'
import SkeletonLoader from '@/components/SkeletonLoader'
import type { MovieDetails, TVShowDetails } from '@/types'

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [error, setError] = useState('')
  const [previewMedia, setPreviewMedia] = useState<{
    id: number
    mediaType: 'movie' | 'tv'
  } | null>(null)
  const [previewDetails, setPreviewDetails] = useState<MovieDetails | TVShowDetails | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const navigate = useNavigate()
  const addMovie = useAddMovie()

  // Debounce the query for auto-search (wait 500ms after user stops typing)
  const debouncedQuery = useDebounce(query.trim(), 500)

  // Update URL params when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      setSearchParams({ q: debouncedQuery }, { replace: true })
    } else if (searchParams.get('q')) {
      // Clear search params if query is empty
      setSearchParams({}, { replace: true })
    }
  }, [debouncedQuery, setSearchParams, searchParams])

  // Sync query with URL params on mount
  useEffect(() => {
    const urlQuery = searchParams.get('q')
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const searchQuery = searchParams.get('q') || ''

  // Search query
  const { data, isLoading, error: searchError } = useQuery({
    queryKey: ['media-search', searchQuery],
    queryFn: () => searchMulti(searchQuery),
    enabled: searchQuery.length >= 2, // Only search if at least 2 characters
    retry: 1,
  })

  // Popular movies (shown when no search query)
  const { data: popularMovies, isLoading: isLoadingPopularMovies } = useQuery({
    queryKey: ['popular-movies'],
    queryFn: () => getPopularMovies(1),
    enabled: searchQuery.length === 0, // Only fetch when there's no search query
    retry: 1,
  })

  // Popular TV shows (shown when no search query)
  const { data: popularTVShows, isLoading: isLoadingPopularTVShows } = useQuery({
    queryKey: ['popular-tv-shows'],
    queryFn: () => getPopularTVShows(1),
    enabled: searchQuery.length === 0, // Only fetch when there's no search query
    retry: 1,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (query.trim()) {
      setSearchParams({ q: query.trim() })
    } else {
      setError('Please enter a search query')
    }
  }

  const handlePreviewMedia = async (mediaId: number, mediaType: 'movie' | 'tv') => {
    setPreviewMedia({ id: mediaId, mediaType })
    setIsLoadingPreview(true)
    setPreviewDetails(null)

    try {
      const details = mediaType === 'movie'
        ? await getMovieDetails(mediaId)
        : await getTVShowDetails(mediaId)
      setPreviewDetails(details)
    } catch (error: any) {
      console.error('Error loading preview:', error)
      setError(error.message || 'Failed to load details. Please try again.')
      setPreviewMedia(null)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleAddFromPreview = (collectionId: string) => {
    if (!previewMedia || !previewDetails) return

    const { mediaType } = previewMedia

    try {
      if (mediaType === 'movie') {
        const details = previewDetails as MovieDetails
        const year = details.release_date
          ? new Date(details.release_date).getFullYear()
          : undefined

        addMovie.mutate(
          {
            collectionId,
            movieData: {
              movieId: `tmdb:${details.id}`,
              title: details.title,
              year: year || 0,
              type: 'movie',
              poster: details.poster_path || undefined,
              runtime: details.runtime,
              genres: details.genres?.map((g) => g.name) || [],
              critics: {
                imdb: details.vote_average ? details.vote_average * 10 : undefined,
              },
              trailer: details.videos?.results?.find(
                (v) => v.type === 'Trailer' && v.site === 'YouTube'
              )
                ? {
                    provider: 'youtube',
                    key: details.videos.results.find(
                      (v) => v.type === 'Trailer' && v.site === 'YouTube'
                    )!.key,
                  }
                : undefined,
              formats: ['DVD'],
              quantity: 1,
              addedBy: '',
              updatedBy: '',
            },
          },
          {
            onSuccess: () => {
              setPreviewMedia(null)
              setPreviewDetails(null)
              navigate(`/library`)
            },
            onError: (error: any) => {
              setError(error.message || 'Failed to add movie. Please try again.')
            },
          }
        )
      } else {
        // TV Show
        const details = previewDetails as TVShowDetails
        const year = details.first_air_date
          ? new Date(details.first_air_date).getFullYear()
          : undefined

        addMovie.mutate(
          {
            collectionId,
            movieData: {
              movieId: `tmdb:tv:${details.id}`,
              title: details.name,
              year: year || 0,
              type: 'tv',
              poster: details.poster_path || undefined,
              runtime: details.episode_run_time?.[0] || undefined,
              genres: details.genres?.map((g) => g.name) || [],
              critics: {
                imdb: details.vote_average ? details.vote_average * 10 : undefined,
              },
              trailer: details.videos?.results?.find(
                (v) => v.type === 'Trailer' && v.site === 'YouTube'
              )
                ? {
                    provider: 'youtube',
                    key: details.videos.results.find(
                      (v) => v.type === 'Trailer' && v.site === 'YouTube'
                    )!.key,
                  }
                : undefined,
              formats: ['DVD'],
              quantity: 1,
              addedBy: '',
              updatedBy: '',
              numberOfSeasons: details.number_of_seasons,
              numberOfEpisodes: details.number_of_episodes,
              firstAirDate: details.first_air_date,
            },
          },
          {
            onSuccess: () => {
              setPreviewMedia(null)
              setPreviewDetails(null)
              navigate(`/library`)
            },
            onError: (error: any) => {
              setError(error.message || 'Failed to add TV show. Please try again.')
            },
          }
        )
      }
    } catch (error: any) {
      console.error('Error adding media:', error)
      setError(error.message || 'Failed to add item. Please try again.')
    }
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Search Movies & TV Shows</h1>
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(e as any)
                    }
                  }}
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={!query.trim() || isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </form>

          {(error || searchError) && (
            <div className="mb-6 p-3 text-sm text-destructive bg-destructive/10 rounded-md whitespace-pre-line">
              {error || (searchError as Error)?.message || 'Failed to search. Please check your TMDB API key.'}
            </div>
          )}

          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <div className="mb-6 p-3 text-sm text-muted-foreground bg-muted rounded-md">
              Type at least 2 characters to search
            </div>
          )}

          {isLoading && searchQuery.length >= 2 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <SkeletonLoader key={i} variant="card" className="h-96" />
              ))}
            </div>
          )}

          {!isLoading && searchQuery.length >= 2 && data && data.results.length === 0 && (
            <div className="text-center py-12">
              <Film className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
            </div>
          )}

          {!searchQuery && (
            <>
              {/* Popular Movies Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-bold">Popular Movies</h2>
                </div>
                {isLoadingPopularMovies ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <SkeletonLoader key={i} variant="card" className="h-96" />
                    ))}
                  </div>
                ) : popularMovies && popularMovies.results.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {popularMovies.results.map((item, index) => {
                      const year = item.release_date
                        ? new Date(item.release_date).getFullYear()
                        : null

                      return (
                        <Card 
                          key={`movie-${item.id}`} 
                          className="hover:shadow-xl transition-smooth hover:scale-[1.03] cursor-pointer group animate-fade-in-up"
                          style={{ animationDelay: `${index * 0.03}s` }}
                          onClick={() => handlePreviewMedia(item.id, 'movie')}
                        >
                          <CardContent className="p-0">
                            <div className="aspect-[2/3] relative overflow-hidden rounded-t-lg">
                              {item.poster_path ? (
                                <img
                                  src={getPosterUrl(item.poster_path)}
                                  alt={item.title}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                  <Film className="h-12 w-12 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="p-3">
                              <h3 className="font-semibold text-sm line-clamp-2 mb-2">
                                {item.title}
                              </h3>
                              {year && (
                                <p className="text-xs text-muted-foreground mb-2">
                                  {year}
                                </p>
                              )}
                              <div className="mb-2">
                                <StreamingProviders 
                                  movieId={item.id} 
                                  type="movie"
                                  maxProviders={3}
                                  size="sm"
                                />
                              </div>
                              <div className="flex gap-1.5 min-w-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 min-w-0 text-xs px-2"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handlePreviewMedia(item.id, 'movie')
                                  }}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Preview
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1 min-w-0 text-xs px-2"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handlePreviewMedia(item.id, 'movie')
                                  }}
                                  disabled={addMovie.isPending}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No popular movies available
                  </div>
                )}
              </div>

              {/* Popular TV Shows Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-bold">Popular TV Shows</h2>
                </div>
                {isLoadingPopularTVShows ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <SkeletonLoader key={i} variant="card" className="h-96" />
                    ))}
                  </div>
                ) : popularTVShows && popularTVShows.results.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {popularTVShows.results.map((item, index) => {
                      const year = item.first_air_date
                        ? new Date(item.first_air_date).getFullYear()
                        : null

                      return (
                        <Card 
                          key={`tv-${item.id}`} 
                          className="hover:shadow-xl transition-smooth hover:scale-[1.03] cursor-pointer group animate-fade-in-up"
                          style={{ animationDelay: `${index * 0.03}s` }}
                          onClick={() => handlePreviewMedia(item.id, 'tv')}
                        >
                          <CardContent className="p-0">
                            <div className="aspect-[2/3] relative overflow-hidden rounded-t-lg">
                              {item.poster_path ? (
                                <img
                                  src={getPosterUrl(item.poster_path)}
                                  alt={item.title}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                  <Tv className="h-12 w-12 text-muted-foreground" />
                                </div>
                              )}
                              <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
                                TV
                              </div>
                            </div>
                            <div className="p-3">
                              <h3 className="font-semibold text-sm line-clamp-2 mb-2">
                                {item.title}
                              </h3>
                              {year && (
                                <p className="text-xs text-muted-foreground mb-2">
                                  {year}
                                </p>
                              )}
                              <div className="mb-2">
                                <StreamingProviders 
                                  movieId={item.id} 
                                  type="tv"
                                  maxProviders={3}
                                  size="sm"
                                />
                              </div>
                              <div className="flex gap-1.5 min-w-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 min-w-0 text-xs px-2"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handlePreviewMedia(item.id, 'tv')
                                  }}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Preview
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1 min-w-0 text-xs px-2"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handlePreviewMedia(item.id, 'tv')
                                  }}
                                  disabled={addMovie.isPending}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No popular TV shows available
                  </div>
                )}
              </div>
            </>
          )}

          {data && data.results.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.results.map((item, index) => {
                const isTV = item.media_type === 'tv'
                const year = item.release_date
                  ? new Date(item.release_date).getFullYear()
                  : item.first_air_date
                  ? new Date(item.first_air_date).getFullYear()
                  : null

                return (
                  <Card 
                    key={`${item.media_type}-${item.id}`} 
                    className="hover:shadow-xl transition-smooth hover:scale-[1.03] cursor-pointer group animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.03}s` }}
                    onClick={() => handlePreviewMedia(item.id, item.media_type || 'movie')}
                  >
                    <CardContent className="p-0">
                      <div className="aspect-[2/3] relative overflow-hidden rounded-t-lg">
                        {item.poster_path ? (
                          <img
                            src={getPosterUrl(item.poster_path)}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            {isTV ? (
                              <Tv className="h-12 w-12 text-muted-foreground" />
                            ) : (
                              <Film className="h-12 w-12 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        {isTV && (
                          <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
                            TV
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold text-sm line-clamp-2 mb-2">
                          {item.title}
                        </h3>
                        {year && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {year}
                          </p>
                        )}
                        <div className="mb-2">
                          <StreamingProviders 
                            movieId={item.id} 
                            type={item.media_type || 'movie'}
                            maxProviders={3}
                            size="sm"
                          />
                        </div>
                        <div className="flex gap-1.5 min-w-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 min-w-0 text-xs px-2"
                            onClick={() => handlePreviewMedia(item.id, item.media_type || 'movie')}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 min-w-0 text-xs px-2"
                            onClick={() => handlePreviewMedia(item.id, item.media_type || 'movie')}
                            disabled={addMovie.isPending}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          <MediaPreviewModal
            isOpen={!!previewMedia}
            onClose={() => {
              setPreviewMedia(null)
              setPreviewDetails(null)
            }}
            onAdd={handleAddFromPreview}
            mediaType={previewMedia?.mediaType || 'movie'}
            details={previewDetails}
            isLoading={isLoadingPreview}
            isAdding={addMovie.isPending}
          />
        </div>
      </div>
    </Layout>
  )
}

