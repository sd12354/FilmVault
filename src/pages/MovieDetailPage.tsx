import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import { useMovie, useUserMeta, useUpdateUserMeta } from '@/hooks/useMovies'
import { useAddWatched } from '@/hooks/useWatched'
import { getPosterUrl } from '@/lib/movieApi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Star, ArrowLeft, Check, X, Tv, Film, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const collectionId = searchParams.get('collection') || ''
  const navigate = useNavigate()
  const { data: movie, isLoading } = useMovie(collectionId, id || '')
  const { data: userMeta } = useUserMeta(collectionId, id || '')
  const updateUserMeta = useUpdateUserMeta()
  const addWatched = useAddWatched()
  const [rating, setRating] = useState(userMeta?.rating || 0)
  const [notes, setNotes] = useState(userMeta?.notes || '')
  const [showWatchedDialog, setShowWatchedDialog] = useState(false)
  const [watchedType, setWatchedType] = useState<'movie' | 'tv'>('movie')
  
  // Update watchedType when movie loads
  useEffect(() => {
    if (movie?.type) {
      setWatchedType(movie.type)
    }
  }, [movie?.type])
  const [streamingService, setStreamingService] = useState('Physical')
  const [watchedRating, setWatchedRating] = useState(0)
  const [watchedNotes, setWatchedNotes] = useState('')

  const handleRatingClick = (value: number) => {
    setRating(value)
    updateUserMeta.mutate({
      collectionId,
      movieId: id || '',
      meta: { rating: value },
    })
  }

  const handleNotesSave = () => {
    updateUserMeta.mutate({
      collectionId,
      movieId: id || '',
      meta: { notes },
    })
  }

  const handleMarkAsWatched = async () => {
    if (!movie) return

    try {
      await addWatched.mutateAsync({
        movieId: movie.movieId || `tmdb:${movie.id}`,
        title: movie.title,
        year: movie.year,
        poster: movie.poster,
        type: movie.type || watchedType,
        streamingService,
        rating: watchedRating > 0 ? watchedRating : undefined,
        notes: watchedNotes || undefined,
      })
      setShowWatchedDialog(false)
      setWatchedRating(0)
      setWatchedNotes('')
      setStreamingService('Physical')
      setWatchedType(movie?.type || 'movie')
    } catch (error: any) {
      alert(error.message || 'Failed to mark as watched')
    }
  }

  const streamingServices = [
    'Physical',
    'Netflix',
    'Disney+',
    'Hulu',
    'Amazon Prime Video',
    'HBO Max',
    'Apple TV+',
    'Paramount+',
    'Peacock',
    'YouTube',
    'Other',
  ]

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <div>Loading...</div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!movie) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Item not found</div>
        </div>
      </Layout>
    )
  }

  const isTV = movie.type === 'tv'

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/library')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Library
        </Button>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Poster */}
          <div>
            {movie.poster ? (
              <img
                src={getPosterUrl(movie.poster, 'w500')}
                alt={movie.title}
                className="w-full rounded-lg shadow-lg"
              />
            ) : (
              <div className="aspect-[2/3] bg-muted rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground">No poster</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">{movie.title}</h1>
                {isTV && (
                  <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium flex items-center gap-1">
                    <Tv className="h-4 w-4" />
                    TV Show
                  </span>
                )}
              </div>
              {movie.year && (
                <p className="text-xl text-muted-foreground">{movie.year}</p>
              )}
              {isTV && movie.numberOfSeasons && (
                <p className="text-sm text-muted-foreground mt-1">
                  {movie.numberOfSeasons} {movie.numberOfSeasons === 1 ? 'season' : 'seasons'}
                  {movie.numberOfEpisodes && ` • ${movie.numberOfEpisodes} episodes`}
                </p>
              )}
            </div>

            {/* Critics Scores */}
            {Object.keys(movie.critics || {}).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Critics Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {movie.critics.imdb && (
                      <div>
                        <div className="text-sm text-muted-foreground">IMDb</div>
                        <div className="text-2xl font-bold">{movie.critics.imdb}/100</div>
                      </div>
                    )}
                    {movie.critics.metacritic && (
                      <div>
                        <div className="text-sm text-muted-foreground">Metacritic</div>
                        <div className="text-2xl font-bold">{movie.critics.metacritic}/100</div>
                      </div>
                    )}
                    {movie.critics.rottenTomatoes && (
                      <div>
                        <div className="text-sm text-muted-foreground">Rotten Tomatoes</div>
                        <div className="text-2xl font-bold">{movie.critics.rottenTomatoes}%</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mark as Watched */}
            <Card>
              <CardHeader>
                <CardTitle>Watched</CardTitle>
                <CardDescription>
                  Mark this as watched to share with your friends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowWatchedDialog(true)}
                  className="w-full"
                  variant="outline"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark as Watched
                </Button>
              </CardContent>
            </Card>

            {/* Personal Rating */}
            <Card>
              <CardHeader>
                <CardTitle>Your Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => handleRatingClick(value)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          rating >= value
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleNotesSave}
                  placeholder="Add your thoughts..."
                  className="w-full min-h-[100px] p-3 border rounded-md"
                />
              </CardContent>
            </Card>

            {/* Movie Info */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {movie.genres && movie.genres.length > 0 && (
                  <div>
                    <span className="font-semibold">Genres: </span>
                    {movie.genres.join(', ')}
                  </div>
                )}
                {movie.runtime && (
                  <div>
                    <span className="font-semibold">{isTV ? 'Episode Runtime' : 'Runtime'}: </span>
                    {movie.runtime} minutes
                  </div>
                )}
                {isTV && movie.firstAirDate && (
                  <div>
                    <span className="font-semibold">First Air Date: </span>
                    {new Date(movie.firstAirDate).toLocaleDateString()}
                  </div>
                )}
                {movie.formats && movie.formats.length > 0 && (
                  <div>
                    <span className="font-semibold">Formats: </span>
                    {movie.formats.join(', ')}
                  </div>
                )}
                {movie.location && (
                  <div>
                    <span className="font-semibold">Location: </span>
                    {movie.location}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trailer */}
            {movie.trailer && movie.trailer.provider === 'youtube' && (
              <Card>
                <CardHeader>
                  <CardTitle>Trailer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${movie.trailer.key}`}
                      title="Trailer"
                      className="w-full h-full rounded"
                      allowFullScreen
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Mark as Watched Dialog */}
        {showWatchedDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Mark as Watched</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowWatchedDialog(false)
                      setWatchedRating(0)
                      setWatchedNotes('')
                      setStreamingService('Physical')
                      setWatchedType('movie')
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>
                  {movie.title} ({movie.year}) {isTV && '• TV Show'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Type Selection - only show if type is not already set */}
                {!movie.type && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Type</label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={watchedType === 'movie' ? 'default' : 'outline'}
                        onClick={() => setWatchedType('movie')}
                        className="flex-1"
                      >
                        <Film className="h-4 w-4 mr-2" />
                        Movie
                      </Button>
                      <Button
                        type="button"
                        variant={watchedType === 'tv' ? 'default' : 'outline'}
                        onClick={() => setWatchedType('tv')}
                        className="flex-1"
                      >
                        <Tv className="h-4 w-4 mr-2" />
                        TV Show
                      </Button>
                    </div>
                  </div>
                )}

                {/* Streaming Service */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Streaming Service
                  </label>
                  <select
                    value={streamingService}
                    onChange={(e) => setStreamingService(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    {streamingServices.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rating */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Rating (optional)
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setWatchedRating(watchedRating === value ? 0 : value)
                        }
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            watchedRating >= value
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Notes (optional)
                  </label>
                  <textarea
                    value={watchedNotes}
                    onChange={(e) => setWatchedNotes(e.target.value)}
                    placeholder="Add your thoughts..."
                    className="w-full min-h-[80px] p-2 border rounded-md"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowWatchedDialog(false)
                      setWatchedRating(0)
                      setWatchedNotes('')
                      setStreamingService('Physical')
                      setWatchedType('movie')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={handleMarkAsWatched}
                    disabled={addWatched.isPending}
                  >
                    {addWatched.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Mark as Watched'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  )
}

