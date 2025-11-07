import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Plus, Film, Tv, Clock, Calendar, Star, Play, Loader2 } from 'lucide-react'
import { getPosterUrl } from '@/lib/movieApi'
import CollectionSelector from './CollectionSelector'
import { useCollections } from '@/hooks/useCollections'
import type { MovieDetails, TVShowDetails } from '@/types'

interface MediaPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (collectionId: string) => void
  mediaType: 'movie' | 'tv'
  details: MovieDetails | TVShowDetails | null
  isLoading?: boolean
  isAdding?: boolean
}

export default function MediaPreviewModal({
  isOpen,
  onClose,
  onAdd,
  mediaType,
  details,
  isLoading = false,
  isAdding = false,
}: MediaPreviewModalProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)
  const [showCollectionSelector, setShowCollectionSelector] = useState(false)
  const { data: collections } = useCollections()

  // Reset state when modal closes
  const handleClose = () => {
    setSelectedCollectionId(null)
    setShowCollectionSelector(false)
    onClose()
  }

  if (!isOpen) return null

  const isTV = mediaType === 'tv'
  const movieDetails = !isTV ? (details as MovieDetails) : null
  const tvDetails = isTV ? (details as TVShowDetails) : null

  const selectedCollection = collections?.find(c => c.id === selectedCollectionId)

  const handleAddClick = () => {
    if (!selectedCollectionId) {
      setShowCollectionSelector(true)
    } else {
      onAdd(selectedCollectionId)
    }
  }

  const handleCollectionSelect = (collectionId: string) => {
    setSelectedCollectionId(collectionId)
    setShowCollectionSelector(false)
    onAdd(collectionId)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
    >
      <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {isLoading ? (
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <div>Loading details...</div>
            </div>
          </CardContent>
        ) : details ? (
          <>
            <CardHeader className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="flex flex-col md:flex-row gap-6 pr-12">
                <div className="flex-shrink-0">
                  {details.poster_path ? (
                    <img
                      src={getPosterUrl(details.poster_path, 'w500')}
                      alt={movieDetails?.title || tvDetails?.name || 'Poster'}
                      className="w-48 h-72 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-48 h-72 bg-muted rounded-lg flex items-center justify-center">
                      {isTV ? (
                        <Tv className="h-16 w-16 text-muted-foreground" />
                      ) : (
                        <Film className="h-16 w-16 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-2">
                    <CardTitle className="text-2xl md:text-3xl">
                      {movieDetails?.title || tvDetails?.name}
                    </CardTitle>
                    {isTV && (
                      <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs font-medium flex items-center gap-1 mt-1">
                        <Tv className="h-3 w-3" />
                        TV
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                    {movieDetails?.release_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(movieDetails.release_date).getFullYear()}
                      </div>
                    )}
                    {tvDetails?.first_air_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(tvDetails.first_air_date).getFullYear()}
                      </div>
                    )}
                    {movieDetails?.runtime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {movieDetails.runtime} min
                      </div>
                    )}
                    {tvDetails?.episode_run_time?.[0] && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        ~{tvDetails.episode_run_time[0]} min/episode
                      </div>
                    )}
                    {details.vote_average && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {details.vote_average.toFixed(1)}/10
                      </div>
                    )}
                  </div>

                  {details.genres && details.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {details.genres.map((genre) => (
                        <span
                          key={genre.id}
                          className="px-2 py-1 bg-muted rounded text-xs"
                        >
                          {genre.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {details.overview && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-4">
                      {details.overview}
                    </p>
                  )}

                  {isTV && tvDetails && (
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      {tvDetails.number_of_seasons && (
                        <div>
                          <span className="text-muted-foreground">Seasons: </span>
                          <span className="font-medium">{tvDetails.number_of_seasons}</span>
                        </div>
                      )}
                      {tvDetails.number_of_episodes && (
                        <div>
                          <span className="text-muted-foreground">Episodes: </span>
                          <span className="font-medium">{tvDetails.number_of_episodes}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {details.videos?.results?.find(
                    (v) => v.type === 'Trailer' && v.site === 'YouTube'
                  ) && (
                    <div className="mb-4">
                      <a
                        href={`https://www.youtube.com/watch?v=${
                          details.videos.results.find(
                            (v) => v.type === 'Trailer' && v.site === 'YouTube'
                          )!.key
                        }`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Play className="h-4 w-4" />
                        Watch Trailer
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {showCollectionSelector ? (
                <CollectionSelector
                  selectedCollectionId={selectedCollectionId}
                  onSelect={handleCollectionSelect}
                  onClose={() => setShowCollectionSelector(false)}
                />
              ) : (
                <>
                  {selectedCollectionId && selectedCollection && (
                    <div className="p-3 bg-muted rounded-md text-sm">
                      <span className="text-muted-foreground">Adding to: </span>
                      <span className="font-medium">
                        {selectedCollection.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6"
                        onClick={() => {
                          setSelectedCollectionId(null)
                          setShowCollectionSelector(true)
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddClick}
                      disabled={isAdding}
                      className="flex-1"
                      size="lg"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {isAdding ? 'Adding...' : selectedCollectionId ? 'Add to Collection' : 'Select Collection'}
                    </Button>
                    <Button
                      onClick={handleClose}
                      variant="outline"
                      size="lg"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </>
        ) : (
          <CardContent className="p-8 text-center">
            <div className="text-destructive">Failed to load details</div>
            <Button onClick={handleClose} className="mt-4">
              Close
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

