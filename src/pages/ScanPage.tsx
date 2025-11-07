import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import { extractTextFromImage } from '@/lib/visionApi'
import { useAddMovie } from '@/hooks/useMovies'
import { searchMulti, getMovieDetails, getTVShowDetails } from '@/lib/movieApi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import MediaPreviewModal from '@/components/MediaPreviewModal'
import { Camera, X, Loader2, Upload, Image as ImageIcon, Sparkles } from 'lucide-react'
import type { MovieDetails, TVShowDetails } from '@/types'

export default function ScanPage() {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [results, setResults] = useState<Array<{ id: number; title: string; mediaType?: 'movie' | 'tv' }>>([])
  const [selectedResult, setSelectedResult] = useState<{ id: number; title: string; mediaType?: 'movie' | 'tv' } | null>(null)
  const [previewDetails, setPreviewDetails] = useState<MovieDetails | TVShowDetails | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showCamera, setShowCamera] = useState(false)
  const [autoDetect, setAutoDetect] = useState(true) // Auto-detect enabled by default
  const [isAutoDetecting, setIsAutoDetecting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const navigate = useNavigate()
  const addMovie = useAddMovie()

  const startCamera = async () => {
    setError('')
    setShowCamera(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          // Portrait orientation for DVD cases (taller than wide)
          width: { ideal: 720 },
          height: { ideal: 1280 }
        }
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        videoRef.current.setAttribute('autoplay', 'true')
        videoRef.current.setAttribute('muted', 'true')
        await videoRef.current.play()
      }
    } catch (err: any) {
      console.error('Camera error:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found. Please ensure your device has a camera.')
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is already in use by another application.')
      } else {
        setError(err.message || 'Failed to access camera. Please try again.')
      }
      setShowCamera(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setShowCamera(false)
  }

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0)
      const imageDataUrl = canvas.toDataURL('image/jpeg')
      setCapturedImage(imageDataUrl)
      stopCamera()
      processImage(imageDataUrl)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const imageDataUrl = event.target?.result as string
      setCapturedImage(imageDataUrl)
      processImage(imageDataUrl)
    }
    reader.readAsDataURL(file)
  }

  const processImage = async (imageDataUrl: string) => {
    setProcessing(true)
    setError('')
    setProgress(0)
    setResults([])
    setSelectedResult(null)

    try {
      // Extract text using Google Cloud Vision API
      const visionData = await extractTextFromImage(imageDataUrl, (progressValue) => {
        setProgress(progressValue)
      })

      // Parse the vision API response
      let visionResponse: any
      try {
        visionResponse = JSON.parse(visionData)
      } catch {
        // Fallback if response is just text
        visionResponse = { fullText: visionData }
      }

      const allText = visionResponse.fullText || visionData
      const textAnnotationsWithPosition = visionResponse.textAnnotationsWithPosition || []
      
      // Format labels to filter out (common at top/bottom of DVD cases)
      const formatLabels = [
        '4k', 'ultra hd', 'uhd', 'blu-ray', 'blu ray', 'dvd', 'special edition',
        'collector\'s edition', 'director\'s cut', 'extended cut', 'unrated',
        'digital copy', 'digital hd', 'hd', 'hdr', 'dolby vision', 'dolby atmos',
        'dts', 'surround sound', 'widescreen', 'full screen', 'pan & scan'
      ]

      // Rating labels
      const ratingLabels = ['rated', 'pg-', 'pg13', 'r-rated', 'nc-17', 'g-rated', 'tv-']
      
      // Common words that indicate metadata (not titles)
      const metadataWords = ['director', 'produced', 'starring', 'runtime', 'minutes', 'year', 'copyright', '©', 'tm']
      
      // Score each text annotation to find the most likely title
      const scoredAnnotations = textAnnotationsWithPosition.map((ann: any) => {
        const text = ann.text.trim()
        const lower = text.toLowerCase()
        
        // Skip if it's clearly not a title
        if (text.length < 3) return null
        if (/^\d+$/.test(text)) return null // Just numbers
        if (/^[^a-zA-Z]*$/.test(text)) return null // No letters
        
        // Check if it's a format label
        const isFormatLabel = formatLabels.some(label => lower.includes(label))
        const isRatingLabel = ratingLabels.some(label => lower.includes(label))
        const isMetadata = metadataWords.some(word => lower.includes(word))
        
        if (isFormatLabel || isRatingLabel || isMetadata) return null
        
        // Calculate score based on multiple factors
        let score = 0
        
        // 1. Length score (titles are usually 8-50 characters)
        if (text.length >= 8 && text.length <= 50) {
          score += 30
        } else if (text.length >= 5 && text.length <= 60) {
          score += 15
        }
        
        // 2. Position score (titles are usually in upper-middle portion)
        // Find min and max Y positions to normalize
        const allYPositions = textAnnotationsWithPosition.map((a: any) => a.minY)
        const minY = Math.min(...allYPositions)
        const maxY = Math.max(...allYPositions)
        const yRange = maxY - minY || 1
        
        // Normalize Y position (0 = top, 1 = bottom)
        const normalizedY = (ann.minY - minY) / yRange
        if (normalizedY < 0.3) { // Upper portion (top 30%)
          score += 25
        } else if (normalizedY < 0.5) { // Upper-middle portion (30-50%)
          score += 20
        } else if (normalizedY < 0.7) { // Middle portion (50-70%)
          score += 10
        }
        
        // 3. Size score (titles are usually larger)
        if (textAnnotationsWithPosition.length > 1) {
          const avgFontSize = textAnnotationsWithPosition
            .map((a: any) => a.fontSize)
            .reduce((sum: number, size: number) => sum + size, 0) / textAnnotationsWithPosition.length
          if (ann.fontSize > avgFontSize * 1.3) {
            score += 25 // Significantly larger than average
          } else if (ann.fontSize > avgFontSize * 1.1) {
            score += 15 // Larger than average
          } else if (ann.fontSize > avgFontSize) {
            score += 5
          }
        }
        
        // 4. Formatting score (titles usually start with capital, have mixed case)
        if (/^[A-Z]/.test(text) && text !== text.toUpperCase()) {
          score += 20 // Starts with capital, has lowercase
        } else if (/^[A-Z]/.test(text)) {
          score += 5 // Starts with capital but all caps
        }
        
        // 5. Word count score (titles are usually 1-5 words)
        const wordCount = text.split(/\s+/).length
        if (wordCount >= 1 && wordCount <= 5) {
          score += 15
        } else if (wordCount <= 8) {
          score += 5
        }
        
        // 6. Penalty for all caps short text (format labels)
        if (text.length < 15 && text === text.toUpperCase() && /^[A-Z\s]+$/.test(text)) {
          score -= 30
        }
        
        // 7. Penalty for mostly numbers
        if ((text.match(/[0-9]/g) || []).length > text.length / 2) {
          score -= 20
        }
        
        // 8. Bonus for common title patterns
        if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(text)) {
          score += 10 // Title case pattern
        }
        
        return {
          text,
          score,
          fontSize: ann.fontSize,
          position: ann.minY
        }
      }).filter((item: any) => item !== null && item.score > 0)
      
      // Sort by score (highest first)
      scoredAnnotations.sort((a: any, b: any) => b.score - a.score)
      
      
      // Get the best candidate
      let searchQuery = ''
      
      if (scoredAnnotations.length > 0) {
        // Use the highest scoring annotation
        const bestMatch = scoredAnnotations[0]
        searchQuery = bestMatch.text
        
        // If the best match score is low, try combining top candidates
        if (bestMatch.score < 50 && scoredAnnotations.length > 1) {
          const topCandidates = scoredAnnotations
            .slice(0, 3)
            .filter((item: any) => item.score > 20)
            .map((item: any) => item.text)
          
          if (topCandidates.length > 1) {
            // Combine top candidates, prioritizing longer ones
            const combined = topCandidates
              .sort((a: string, b: string) => b.length - a.length)
              .slice(0, 2)
              .join(' ')
              .substring(0, 60)
            
            if (combined.length > bestMatch.text.length) {
              searchQuery = combined
            }
          }
        }
      }
      
      // Fallback: Use traditional line-based approach if scoring didn't work
      if (!searchQuery || searchQuery.length < 3) {
        const lines = allText
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 2)
          .filter((line: string) => !/^\d+$/.test(line))
          .filter((line: string) => !/^[^a-zA-Z]*$/.test(line))
          .filter((line: string) => {
            const lower = line.toLowerCase()
            return !(
              formatLabels.some(label => lower.includes(label)) ||
              ratingLabels.some(label => lower.includes(label)) ||
              metadataWords.some(word => lower.includes(word)) ||
              lower.match(/^\d{4}$/) ||
              lower.match(/^\d+h \d+m$/) ||
              line.length < 4 ||
              (line.length < 10 && line === line.toUpperCase())
            )
          })
        
        const sortedByLength = [...lines].sort((a, b) => b.length - a.length)
        for (const line of sortedByLength) {
          if (line.length >= 8 && line.length <= 60 && /^[A-Z]/.test(line) && line !== line.toUpperCase()) {
            searchQuery = line
            break
          }
        }
      }

      if (!searchQuery || searchQuery.length < 3) {
        setError('Could not extract text from image. Please try a clearer photo with better lighting or search manually.')
        setProcessing(false)
        setCapturedImage(imageDataUrl) // Keep the image visible
        return
      }
      

      // Clean up the search query
      searchQuery = searchQuery
        .replace(/[^\w\s'-]/g, ' ') // Remove special chars except apostrophes and hyphens
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 60) // Limit length

      // Search TMDB with extracted text
      const { results } = await searchMulti(searchQuery, 1)
      
      
      if (results.length === 0) {
        setError(`No results found for "${searchQuery}". Try searching manually or take a clearer photo.`)
        setProcessing(false)
        setCapturedImage(imageDataUrl) // Keep the image visible
        return
      }

      // Map results to our format
      const mappedResults = results.slice(0, 5).map(item => ({
        id: item.id,
        title: item.title || '',
        mediaType: item.media_type
      }))

      setResults(mappedResults)
      setProcessing(false)
      
      // Auto-detect: Automatically select the first result if it seems like a good match
      if (autoDetect && mappedResults.length > 0) {
        // Check if the search query matches the first result title closely
        const firstResultTitle = mappedResults[0].title.toLowerCase()
        const queryLower = searchQuery.toLowerCase()
        
        // Extract significant words from query (3+ characters)
        const queryWords = queryLower.split(' ').filter((word: string) => word.length >= 3)
        const titleWords = firstResultTitle.split(' ').filter((word: string) => word.length >= 3)
        
        // Calculate match score
        const matchingWords = queryWords.filter((word: string) => 
          titleWords.some((titleWord: string) => 
            titleWord.includes(word) || word.includes(titleWord)
          )
        )
        
        const matchScore = matchingWords.length / Math.max(queryWords.length, 1)
        
        // If the query is contained in the title or vice versa, or if match score is high
        const isGoodMatch = 
          firstResultTitle.includes(queryLower) || 
          queryLower.includes(firstResultTitle) ||
          matchScore >= 0.5 // At least 50% of words match
        
        if (isGoodMatch) {
          setIsAutoDetecting(true)
          // Auto-select the first result after a short delay
          setTimeout(() => {
            handlePreviewResult(mappedResults[0])
            setIsAutoDetecting(false)
          }, 1000) // Show results for 1 second before auto-selecting
        }
      }
    } catch (err: any) {
      console.error('OCR error:', err)
      const errorMessage = err.message || 'Failed to process image. Please try again.'
      setError(errorMessage)
      setProcessing(false)
      // Keep the captured image visible so user can see what was scanned
      if (!capturedImage) {
        setCapturedImage(imageDataUrl)
      }
    }
  }

  const handlePreviewResult = async (result: { id: number; title: string; mediaType?: 'movie' | 'tv' }) => {
    setSelectedResult(result)
    setIsLoadingPreview(true)
    setPreviewDetails(null)

    try {
      const mediaType = result.mediaType || 'movie'
      const details = mediaType === 'tv'
        ? await getTVShowDetails(result.id)
        : await getMovieDetails(result.id)
      setPreviewDetails(details)
    } catch (error) {
      console.error('Error loading preview:', error)
      setError('Failed to load details. Please try again.')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleAddFromPreview = (collectionId: string) => {
    if (!selectedResult || !previewDetails) return

    const mediaType = selectedResult.mediaType || 'movie'

    try {
      if (mediaType === 'tv') {
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
              critics: details.vote_average
                ? {
                    imdb: details.vote_average * 10,
                  }
                : {},
              trailer: details.videos?.results?.find(
                (v) => v.type === 'Trailer' && v.site === 'YouTube'
              )
                ? {
                    provider: 'youtube' as const,
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
              setSelectedResult(null)
              setPreviewDetails(null)
              setCapturedImage(null)
              setResults([])
              navigate(`/library`)
            },
          }
        )
      } else {
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
              critics: details.vote_average
                ? {
                    imdb: details.vote_average * 10,
                  }
                : {},
              trailer: details.videos?.results?.find(
                (v) => v.type === 'Trailer' && v.site === 'YouTube'
              )
                ? {
                    provider: 'youtube' as const,
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
              setSelectedResult(null)
              setPreviewDetails(null)
              setCapturedImage(null)
              setResults([])
              navigate(`/library`)
            },
          }
        )
      }
    } catch (error) {
      console.error('Error adding item:', error)
      setError('Failed to add item')
    }
  }

  const reset = () => {
    setCapturedImage(null)
    setResults([])
    setSelectedResult(null)
    setPreviewDetails(null)
    setError('')
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Scan DVD Cover</h1>

          {!capturedImage && !showCamera && !processing && (
            <Card>
              <CardHeader>
                <CardTitle>Identify Movie from Cover</CardTitle>
                <CardDescription>
                  Take a photo or upload an image of the DVD case front cover
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button onClick={startCamera} className="w-full" size="lg">
                    <Camera className="h-5 w-5 mr-2" />
                    Take Photo
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    Upload Image
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {showCamera && (
            <Card>
              <CardHeader>
                <CardTitle>Camera</CardTitle>
                <CardDescription>Position the DVD cover in the frame (portrait orientation)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden mx-auto" style={{ width: '100%', maxWidth: '400px', aspectRatio: '5/7' }}>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                  />
                  <div className="absolute inset-0 border-4 border-primary/50 rounded-lg pointer-events-none" />
                  <div className="absolute top-4 left-4 right-4 text-center pointer-events-none">
                    <div className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                      Align DVD cover here
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={captureImage} className="flex-1" size="lg">
                    <Camera className="h-5 w-5 mr-2" />
                    Capture
                  </Button>
                  <Button onClick={stopCamera} variant="outline" className="flex-1" size="lg">
                    <X className="h-5 w-5 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {processing && (
            <Card>
              <CardHeader>
                <CardTitle>Processing Image...</CardTitle>
                <CardDescription>Extracting text from cover</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {capturedImage && (
                  <div className="bg-black rounded-lg overflow-hidden mx-auto" style={{ width: '100%', maxWidth: '400px', aspectRatio: '5/7' }}>
                    <img
                      src={capturedImage}
                      alt="Captured"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Recognizing text...</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              </CardContent>
            </Card>
          )}

          {capturedImage && !processing && results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Select Movie</span>
                  <label className="flex items-center gap-2 text-sm font-normal cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoDetect}
                      onChange={(e) => setAutoDetect(e.target.checked)}
                      className="rounded"
                    />
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-4 w-4" />
                      Auto-detect
                    </span>
                  </label>
                </CardTitle>
                <CardDescription>
                  {isAutoDetecting 
                    ? 'Auto-detecting best match...' 
                    : 'Choose the correct movie from the results'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-black rounded-lg overflow-hidden mx-auto mb-4" style={{ width: '100%', maxWidth: '400px', aspectRatio: '5/7' }}>
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full h-full object-contain"
                  />
                </div>
                {isAutoDetecting && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 rounded-md">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Auto-detecting best match...</span>
                  </div>
                )}
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <Button
                      key={result.id}
                      onClick={() => handlePreviewResult(result)}
                      variant={index === 0 && autoDetect ? "default" : "outline"}
                      className="w-full justify-start"
                      disabled={isLoadingPreview || isAutoDetecting}
                    >
                      {isLoadingPreview && selectedResult?.id === result.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          {index === 0 && autoDetect && (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          {index === 0 && !autoDetect && (
                            <ImageIcon className="h-4 w-4 mr-2" />
                          )}
                          {index > 0 && (
                            <ImageIcon className="h-4 w-4 mr-2" />
                          )}
                          {result.title}
                        </>
                      )}
                    </Button>
                  ))}
                </div>
                <Button onClick={reset} variant="outline" className="w-full" disabled={isAutoDetecting}>
                  Try Another Image
                </Button>
              </CardContent>
            </Card>
          )}

          {capturedImage && !processing && results.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{error ? 'Error Processing Image' : 'No Results'}</CardTitle>
                <CardDescription>
                  {error ? 'There was an issue processing the image' : 'Could not find matching movies'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-black rounded-lg overflow-hidden mx-auto" style={{ width: '100%', maxWidth: '400px', aspectRatio: '5/7' }}>
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full h-full object-contain"
                  />
                </div>
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                    {error}
                  </div>
                )}
                <Button onClick={reset} variant="outline" className="w-full">
                  Try Another Image
                </Button>
              </CardContent>
            </Card>
          )}

          <canvas ref={canvasRef} className="hidden" />

          <MediaPreviewModal
            isOpen={!!previewDetails}
            onClose={() => {
              setPreviewDetails(null)
            }}
            onAdd={handleAddFromPreview}
            mediaType={selectedResult?.mediaType || 'movie'}
            details={previewDetails}
            isLoading={isLoadingPreview}
            isAdding={addMovie.isPending}
          />
        </div>
      </div>
    </Layout>
  )
}
