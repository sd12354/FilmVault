import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { useCollections, useCreateCollection, useDeleteCollection, useDuplicateCollection, useInviteMember } from '@/hooks/useCollections'
import { useMovies } from '@/hooks/useMovies'
import { useFriends } from '@/hooks/useFriends'
import { getDocs, query, collection as firestoreCollection, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Plus, Grid, List, Search, Film, X, AlertCircle, Trash2, Copy, MoreVertical, Tv, Folder, Share2, UserPlus, Loader2, Download, Upload } from 'lucide-react'
import LoadingScreen from '@/components/LoadingScreen'
import SkeletonLoader from '@/components/SkeletonLoader'
import { getPosterUrl } from '@/lib/movieApi'
import { useAuthStore } from '@/store/authStore'
import { exportCollection, downloadExport, parseImportFile, parseGoogleSheetsImport, validateImportItems } from '@/lib/exportImport'
import { useAddMovie } from '@/hooks/useMovies'
import type { MovieItem } from '@/types'

export default function LibraryPage() {
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<'collections' | 'library'>(
    tabParam === 'collections' ? 'collections' : 'library'
  )
  
  // Update tab when URL param changes
  useEffect(() => {
    if (tabParam === 'collections') {
      setActiveTab('collections')
    }
  }, [tabParam])
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [collectionsViewMode, setCollectionsViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [collectionSearchQuery, setCollectionSearchQuery] = useState('')
  const [collectionName, setCollectionName] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [error, setError] = useState('')
  const [collectionMenuOpen, setCollectionMenuOpen] = useState<string | null>(null)
  const [showInviteFriends, setShowInviteFriends] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const [showGoogleSheetsImport, setShowGoogleSheetsImport] = useState(false)
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('')
  const [googleSheetsCollectionName, setGoogleSheetsCollectionName] = useState('')
  const importFileInputRef = useRef<HTMLInputElement>(null)
  const { data: collections, isLoading: collectionsLoading, error: collectionsError } = useCollections()
  const { data: movies, isLoading: moviesLoading } = useMovies(selectedCollectionId || '')
  const { data: friends } = useFriends()
  const createCollection = useCreateCollection()
  const deleteCollection = useDeleteCollection()
  const duplicateCollection = useDuplicateCollection()
  const inviteMember = useInviteMember()
  const addMovie = useAddMovie()
  const { user } = useAuthStore()

  // Auto-select first collection or create default
  useEffect(() => {
    if (collections && collections.length > 0 && !selectedCollectionId) {
      setSelectedCollectionId(collections[0].id)
    } else if (collections && collections.length === 0 && !createCollection.isPending && !selectedCollectionId) {
      // Create default collection
      createCollection.mutate('My DVDs', {
        onSuccess: (id) => {
          setSelectedCollectionId(id)
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collections, selectedCollectionId])

  // Close menu when clicking outside
  useEffect(() => {
    if (!collectionMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // Don't close if clicking on the menu or menu button
      if (target.closest('[data-collection-menu]')) {
        return
      }
      setCollectionMenuOpen(null)
    }

    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // Don't close if right-clicking on the menu or menu button
      if (target.closest('[data-collection-menu]')) {
        return
      }
      setCollectionMenuOpen(null)
    }

    // Use a small delay to avoid immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('contextmenu', handleContextMenu)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [collectionMenuOpen])

  const handleCreateCollection = () => {
    setShowCreateDialog(true)
  }

  const handleSubmitCollection = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!collectionName.trim()) {
      setError('Please enter a collection name')
      return
    }

    createCollection.mutate(collectionName.trim(), {
      onSuccess: (id) => {
        setSelectedCollectionId(id)
        setCollectionName('')
        setShowCreateDialog(false)
      },
      onError: (error: any) => {
        setError(error.message || 'Failed to create collection. Please try again.')
      },
    })
  }

  const handleDeleteCollection = (collectionId: string, collectionName: string) => {
    if (!confirm(`Are you sure you want to delete "${collectionName}"? This will permanently delete the collection and all its movies. This action cannot be undone.`)) {
      return
    }

    deleteCollection.mutate(collectionId, {
      onSuccess: () => {
        // If deleted collection was selected, clear selection
        if (selectedCollectionId === collectionId) {
          setSelectedCollectionId(null)
        }
        setCollectionMenuOpen(null)
      },
      onError: (error: any) => {
        setError(error.message || 'Failed to delete collection. Please try again.')
        setCollectionMenuOpen(null)
      },
    })
  }

  const handleDuplicateCollection = (collectionId: string, collectionName: string) => {
    const newName = prompt(`Enter a name for the duplicate collection:`, `${collectionName} (Copy)`)
    if (!newName || !newName.trim()) {
      return
    }

    duplicateCollection.mutate(
      { collectionId, newName: newName.trim() },
      {
        onSuccess: (newId) => {
          setSelectedCollectionId(newId)
          setCollectionMenuOpen(null)
        },
        onError: (error: any) => {
          setError(error.message || 'Failed to duplicate collection. Please try again.')
          setCollectionMenuOpen(null)
        },
      }
    )
  }

  const handleExportCollection = async (collectionId: string) => {
    setIsExporting(collectionId)
    setError('')
    
    try {
      const collection = collections?.find(c => c.id === collectionId)
      if (!collection) {
        throw new Error('Collection not found')
      }

      // Fetch movies for this collection
      if (!db) throw new Error('Firestore not initialized')
      const snapshot = await getDocs(
        query(
          firestoreCollection(db, 'collections', collectionId, 'items'),
          orderBy('addedAt', 'desc')
        )
      )
      
      const collectionMovies = snapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          ...data,
          type: data.type || 'movie',
          addedAt: data.addedAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as MovieItem
      })

      const exportData = await exportCollection(collection, collectionMovies)
      const filename = `${collection.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`
      downloadExport(exportData, filename)
      
      setCollectionMenuOpen(null)
    } catch (err: any) {
      setError(err.message || 'Failed to export collection')
    } finally {
      setIsExporting(null)
    }
  }

  const handleImportData = async (importData: any) => {
    // Validate items
    const validation = validateImportItems(importData.collection.items)
    if (!validation.valid) {
      setImportError(`Validation errors:\n${validation.errors.join('\n')}`)
      setIsImporting(false)
      return
    }

    // Create new collection
    const collectionName = importData.collection.name || `Imported Collection ${new Date().toLocaleDateString()}`
    createCollection.mutate(collectionName, {
      onSuccess: async (newCollectionId) => {
        // Add all items to the new collection
        let successCount = 0
        let errorCount = 0

        for (const item of importData.collection.items) {
          try {
            await addMovie.mutateAsync({
              collectionId: newCollectionId,
              movieData: {
                ...item,
                addedBy: '',
                updatedBy: '',
              },
            })
            successCount++
          } catch (err) {
            console.error('Error importing item:', err)
            errorCount++
          }
        }

        setSelectedCollectionId(newCollectionId)
        setImportSuccess(`Successfully imported ${successCount} item${successCount !== 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`)
        setTimeout(() => {
          setImportSuccess('')
          setImportError('')
        }, 5000)
        
        // Reset file input
        if (importFileInputRef.current) {
          importFileInputRef.current.value = ''
        }
        
        // Reset Google Sheets form
        setShowGoogleSheetsImport(false)
        setGoogleSheetsUrl('')
        setGoogleSheetsCollectionName('')
      },
      onError: (error: any) => {
        setImportError(error.message || 'Failed to create collection for import')
      },
    })
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportError('')
    setImportSuccess('')
    setError('')

    try {
      // Parse the import file
      const importData = await parseImportFile(file)
      await handleImportData(importData)
    } catch (err: any) {
      setImportError(err.message || 'Failed to import collection')
    } finally {
      setIsImporting(false)
    }
  }

  const handleImportGoogleSheets = async () => {
    if (!googleSheetsUrl.trim()) {
      setImportError('Please enter a Google Sheets URL')
      return
    }

    setIsImporting(true)
    setImportError('')
    setImportSuccess('')
    setError('')

    try {
      // Parse the Google Sheets import
      const importData = await parseGoogleSheetsImport(
        googleSheetsUrl.trim(),
        googleSheetsCollectionName.trim() || undefined
      )
      await handleImportData(importData)
    } catch (err: any) {
      setImportError(err.message || 'Failed to import from Google Sheets')
    } finally {
      setIsImporting(false)
    }
  }

  const handleCopyInviteLink = (collectionId: string) => {
    const inviteLink = `${window.location.origin}/share/${collectionId}`
    navigator.clipboard.writeText(inviteLink).then(() => {
      alert('Invite link copied to clipboard!')
      setCollectionMenuOpen(null)
    }).catch(() => {
      setError('Failed to copy link. Please try again.')
    })
  }

  const handleInviteFriend = async (collectionId: string, friendUid: string) => {
    inviteMember.mutate(
      { collectionId, friendUid, role: 'viewer' },
      {
        onSuccess: () => {
          setShowInviteFriends(null)
          setCollectionMenuOpen(null)
          alert('Friend invited successfully!')
        },
        onError: (error: any) => {
          setError(error.message || 'Failed to invite friend. Please try again.')
        },
      }
    )
  }

  const filteredMovies = movies?.filter((movie) =>
    movie.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredCollections = collections?.filter((collection) =>
    collection.name.toLowerCase().includes(collectionSearchQuery.toLowerCase())
  )

  const selectedCollection = collections?.find((c) => c.id === selectedCollectionId)

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'collections' | 'library')}>
          <TabsList className="mb-6">
            <TabsTrigger value="collections">
              <Folder className="h-4 w-4 mr-2" />
              Collections
            </TabsTrigger>
            <TabsTrigger value="library">
              <Film className="h-4 w-4 mr-2" />
              Library
            </TabsTrigger>
          </TabsList>

          <TabsContent value="collections">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Collections</h1>
                  <p className="text-muted-foreground">
                    {filteredCollections?.length || 0} {filteredCollections?.length === 1 ? 'collection' : 'collections'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={collectionsViewMode === 'grid' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setCollectionsViewMode('grid')}
                  >
                    <Grid className="h-5 w-5" />
                  </Button>
                  <Button
                    variant={collectionsViewMode === 'list' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setCollectionsViewMode('list')}
                  >
                    <List className="h-5 w-5" />
                  </Button>
                  <Button
                    onClick={handleCreateCollection}
                    disabled={createCollection.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Collection
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => importFileInputRef.current?.click()}
                      variant="outline"
                      disabled={isImporting}
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Import File
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setShowGoogleSheetsImport(!showGoogleSheetsImport)}
                      variant="outline"
                      disabled={isImporting}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Import Google Sheets
                    </Button>
                  </div>
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept=".json,.csv"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </div>
              </div>

              {showGoogleSheetsImport && (
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-lg">Import from Google Sheets</CardTitle>
                    <CardDescription>
                      Paste your Google Sheets URL. Make sure the sheet is publicly accessible or shared with "Anyone with the link".
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Google Sheets URL</label>
                      <Input
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value={googleSheetsUrl}
                        onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                        disabled={isImporting}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Collection Name (optional)</label>
                      <Input
                        placeholder="Leave empty to use sheet name"
                        value={googleSheetsCollectionName}
                        onChange={(e) => setGoogleSheetsCollectionName(e.target.value)}
                        disabled={isImporting}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleImportGoogleSheets}
                        disabled={isImporting || !googleSheetsUrl.trim()}
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Import
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowGoogleSheetsImport(false)
                          setGoogleSheetsUrl('')
                          setGoogleSheetsCollectionName('')
                        }}
                        disabled={isImporting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {(importError || importSuccess) && (
                <div className={`mb-4 p-3 rounded-md ${
                  importError ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'
                }`}>
                  {importError || importSuccess}
                </div>
              )}

              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search collections..."
                    value={collectionSearchQuery}
                    onChange={(e) => setCollectionSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {collectionsLoading ? (
                <LoadingScreen message="Loading collections..." fullScreen={false} />
              ) : collectionsError ? (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {(collectionsError as Error)?.message || 'Failed to load collections'}
                </div>
              ) : filteredCollections && filteredCollections.length > 0 ? (
                <div
                  className={
                    collectionsViewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                      : 'space-y-4'
                  }
                >
                  {filteredCollections.map((collection, index) => {
                    const isOwner = collection.ownerUid === user?.uid
                    const isMenuOpen = collectionMenuOpen === collection.id

                    return (
                      <Card 
                        key={collection.id} 
                        className="hover:shadow-lg transition-smooth hover:scale-[1.02] animate-fade-in-up relative"
                        style={{ animationDelay: `${index * 0.05}s`, zIndex: isMenuOpen ? 10 : 1 }}
                      >
                        <CardContent className="p-0">
                          {collectionsViewMode === 'grid' ? (
                            <>
                              <Link
                                to={`/library`}
                                onClick={() => {
                                  setSelectedCollectionId(collection.id)
                                  setActiveTab('library')
                                }}
                                className="block"
                              >
                                <div className="aspect-[3/2] relative overflow-hidden rounded-t-lg bg-muted flex items-center justify-center">
                                  <Folder className="h-16 w-16 text-muted-foreground" />
                                </div>
                                <div className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold text-lg line-clamp-2 mb-1">
                                        {collection.name}
                                      </h3>
                                      <p className="text-sm text-muted-foreground">
                                        {collection.itemCount} {collection.itemCount === 1 ? 'item' : 'items'}
                                      </p>
                                    </div>
                                    {isOwner && (
                                      <div className="relative ml-2 z-50" data-collection-menu>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            setCollectionMenuOpen(isMenuOpen ? null : collection.id)
                                          }}
                                          onContextMenu={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            setCollectionMenuOpen(isMenuOpen ? null : collection.id)
                                          }}
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                        {isMenuOpen && (
                                          <div
                                            className="absolute right-0 top-full mt-1 bg-background border rounded-md shadow-lg z-[9999] min-w-[200px]"
                                            style={{ zIndex: 9999 }}
                                            data-collection-menu
                                            onContextMenu={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                            }}
                                          >
                                            <button
                                              onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                handleCopyInviteLink(collection.id)
                                              }}
                                              onContextMenu={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                handleCopyInviteLink(collection.id)
                                              }}
                                              className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"
                                            >
                                              <Share2 className="h-4 w-4" />
                                              Copy Invite Link
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                setShowInviteFriends(showInviteFriends === collection.id ? null : collection.id)
                                              }}
                                              onContextMenu={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                setShowInviteFriends(showInviteFriends === collection.id ? null : collection.id)
                                              }}
                                              className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"
                                              disabled={!friends || friends.length === 0}
                                            >
                                              <UserPlus className="h-4 w-4" />
                                              Invite Friend
                                            </button>
                                            <div className="border-t my-1" />
                                            <button
                                              onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                handleExportCollection(collection.id)
                                              }}
                                              onContextMenu={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                handleExportCollection(collection.id)
                                              }}
                                              className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"
                                              disabled={isExporting === collection.id}
                                            >
                                              {isExporting === collection.id ? (
                                                <>
                                                  <Loader2 className="h-4 w-4 animate-spin" />
                                                  Exporting...
                                                </>
                                              ) : (
                                                <>
                                                  <Download className="h-4 w-4" />
                                                  Export Collection
                                                </>
                                              )}
                                            </button>
                                            <div className="border-t my-1" />
                                            <button
                                              onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                handleDuplicateCollection(collection.id, collection.name)
                                              }}
                                              onContextMenu={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                              }}
                                              className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"
                                              disabled={duplicateCollection.isPending}
                                            >
                                              <Copy className="h-4 w-4" />
                                              {duplicateCollection.isPending ? (
                                                <>
                                                  <Loader2 className="h-4 w-4 animate-spin" />
                                                  Duplicating...
                                                </>
                                              ) : (
                                                'Duplicate'
                                              )}
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                handleDeleteCollection(collection.id, collection.name)
                                              }}
                                              onContextMenu={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                              }}
                                              className="w-full text-left px-4 py-2 text-sm hover:bg-accent text-destructive flex items-center gap-2"
                                              disabled={deleteCollection.isPending}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                              {deleteCollection.isPending ? (
                                                <>
                                                  <Loader2 className="h-4 w-4 animate-spin" />
                                                  Deleting...
                                                </>
                                              ) : (
                                                'Delete'
                                              )}
                                            </button>
                                            {showInviteFriends === collection.id && friends && friends.length > 0 && (
                                              <div className="border-t p-2 max-h-48 overflow-y-auto">
                                                <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Select a friend:</div>
                                                {friends.map((friend) => (
                                                  <button
                                                    key={friend.uid}
                                                    onClick={(e) => {
                                                      e.preventDefault()
                                                      e.stopPropagation()
                                                      handleInviteFriend(collection.id, friend.uid)
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-accent rounded flex items-center gap-2"
                                                  >
                                                    {friend.photoURL ? (
                                                      <img
                                                        src={friend.photoURL}
                                                        alt={friend.displayName || 'Friend'}
                                                        className="h-6 w-6 rounded-full"
                                                      />
                                                    ) : (
                                                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                        <UserPlus className="h-3 w-3 text-primary" />
                                                      </div>
                                                    )}
                                                    <span className="flex-1 truncate">{friend.displayName || friend.email}</span>
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            </>
                          ) : (
                            <div className="flex gap-4 p-4">
                              <div className="w-20 h-20 flex-shrink-0 bg-muted rounded flex items-center justify-center">
                                <Folder className="h-10 w-10 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <Link
                                      to={`/library`}
                                      onClick={() => {
                                        setSelectedCollectionId(collection.id)
                                        setActiveTab('library')
                                      }}
                                      className="block"
                                    >
                                      <h3 className="font-semibold text-lg mb-1 hover:text-primary">
                                        {collection.name}
                                      </h3>
                                    </Link>
                                    <p className="text-sm text-muted-foreground">
                                      {collection.itemCount} {collection.itemCount === 1 ? 'item' : 'items'}
                                    </p>
                                  </div>
                                  {isOwner && (
                                    <div className="relative ml-2 z-50" data-collection-menu>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          setCollectionMenuOpen(isMenuOpen ? null : collection.id)
                                        }}
                                        onContextMenu={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          setCollectionMenuOpen(isMenuOpen ? null : collection.id)
                                        }}
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                      {isMenuOpen && (
                                        <div
                                          className="absolute right-0 top-full mt-1 bg-background border rounded-md shadow-lg z-[9999] min-w-[160px]"
                                          style={{ zIndex: 9999 }}
                                          data-collection-menu
                                          onContextMenu={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                          }}
                                        >
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                              handleDuplicateCollection(collection.id, collection.name)
                                            }}
                                            onContextMenu={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"
                                            disabled={duplicateCollection.isPending}
                                          >
                                            <Copy className="h-4 w-4" />
                                            {duplicateCollection.isPending ? (
                                              <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Duplicating...
                                              </>
                                            ) : (
                                              'Duplicate'
                                            )}
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                              handleDeleteCollection(collection.id, collection.name)
                                            }}
                                            onContextMenu={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-accent text-destructive flex items-center gap-2"
                                            disabled={deleteCollection.isPending}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                            {deleteCollection.isPending ? (
                                              <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Deleting...
                                              </>
                                            ) : (
                                              'Delete'
                                            )}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Folder className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {collectionSearchQuery ? 'No collections found' : 'No collections yet'}
                  </p>
                  {!collectionSearchQuery && (
                    <Button onClick={handleCreateCollection} disabled={createCollection.isPending}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Collection
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="library">
            <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar - Collections */}
          <aside className="w-full md:w-64">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Collections</h2>
              <Button
                size="sm"
                onClick={handleCreateCollection}
                disabled={createCollection.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {collectionsLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <div>Loading...</div>
              </div>
            ) : collectionsError ? (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {(collectionsError as Error)?.message || 'Failed to load collections'}
              </div>
            ) : (
              <div className="space-y-2">
                {collections?.map((collection) => {
                  const isOwner = collection.ownerUid === user?.uid
                  const isMenuOpen = collectionMenuOpen === collection.id
                  
                  return (
                    <div
                      key={collection.id}
                      className={`group relative rounded-md transition-colors ${
                        selectedCollectionId === collection.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card hover:bg-accent'
                      }`}
                      style={{ zIndex: isMenuOpen ? 10 : 1 }}
                    >
                      <button
                        onClick={() => setSelectedCollectionId(collection.id)}
                        className="w-full text-left p-3 pr-10"
                      >
                        <div className="font-medium">{collection.name}</div>
                        <div className="text-sm opacity-75">
                          {collection.itemCount} items
                        </div>
                      </button>
                      {isOwner && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-50" data-collection-menu>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setCollectionMenuOpen(isMenuOpen ? null : collection.id)
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setCollectionMenuOpen(isMenuOpen ? null : collection.id)
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          {isMenuOpen && (
                            <div 
                              className="absolute right-0 top-full mt-1 bg-background border rounded-md shadow-lg z-[9999] min-w-[200px]" 
                              style={{ zIndex: 9999 }}
                              data-collection-menu
                              onContextMenu={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                              }}
                            >
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleCopyInviteLink(collection.id)
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleCopyInviteLink(collection.id)
                                }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"
                              >
                                <Share2 className="h-4 w-4" />
                                Copy Invite Link
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setShowInviteFriends(showInviteFriends === collection.id ? null : collection.id)
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setShowInviteFriends(showInviteFriends === collection.id ? null : collection.id)
                                }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"
                                disabled={!friends || friends.length === 0}
                              >
                                <UserPlus className="h-4 w-4" />
                                Invite Friend
                              </button>
                              <div className="border-t my-1" />
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleExportCollection(collection.id)
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleExportCollection(collection.id)
                                }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"
                                disabled={isExporting === collection.id}
                              >
                                {isExporting === collection.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Exporting...
                                  </>
                                ) : (
                                  <>
                                    <Download className="h-4 w-4" />
                                    Export Collection
                                  </>
                                )}
                              </button>
                              <div className="border-t my-1" />
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleDuplicateCollection(collection.id, collection.name)
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"
                                disabled={duplicateCollection.isPending}
                              >
                                <Copy className="h-4 w-4" />
                                {duplicateCollection.isPending ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Duplicating...
                                  </>
                                ) : (
                                  'Duplicate'
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleDeleteCollection(collection.id, collection.name)
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-accent text-destructive flex items-center gap-2"
                                disabled={deleteCollection.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                                {deleteCollection.isPending ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  'Delete'
                                )}
                              </button>
                              {showInviteFriends === collection.id && friends && friends.length > 0 && (
                                <div className="border-t p-2 max-h-48 overflow-y-auto">
                                  <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Select a friend:</div>
                                  {friends.map((friend) => (
                                    <button
                                      key={friend.uid}
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        handleInviteFriend(collection.id, friend.uid)
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm hover:bg-accent rounded flex items-center gap-2"
                                    >
                                      {friend.photoURL ? (
                                        <img
                                          src={friend.photoURL}
                                          alt={friend.displayName || 'Friend'}
                                          className="h-6 w-6 rounded-full"
                                        />
                                      ) : (
                                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                                          <UserPlus className="h-3 w-3 text-primary" />
                                        </div>
                                      )}
                                      <span className="flex-1 truncate">{friend.displayName || friend.email}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {selectedCollection ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-3xl font-bold">{selectedCollection.name}</h1>
                    <p className="text-muted-foreground">
                      {selectedCollection.itemCount} {selectedCollection.itemCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid className="h-5 w-5" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search movies & TV shows..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {moviesLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <SkeletonLoader key={i} variant="card" className="h-96" />
                    ))}
                  </div>
                ) : filteredMovies && filteredMovies.length > 0 ? (
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                        : 'space-y-4'
                    }
                  >
                    {filteredMovies.map((movie, index) => {
                      const isTV = movie.type === 'tv'
                      return (
                        <Link
                          key={movie.id}
                          to={`/movie/${movie.id}?collection=${selectedCollectionId}`}
                          className="animate-fade-in-up"
                          style={{ animationDelay: `${index * 0.03}s` }}
                        >
                          <Card className="hover:shadow-xl transition-smooth hover:scale-[1.03] cursor-pointer h-full group">
                            <CardContent className="p-0">
                              {viewMode === 'grid' ? (
                                <>
                                  <div className="aspect-[2/3] relative overflow-hidden rounded-t-lg">
                                    {movie.poster ? (
                                      <img
                                        src={getPosterUrl(movie.poster)}
                                        alt={movie.title}
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
                                      <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                                        <Tv className="h-3 w-3" />
                                        TV
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-3">
                                    <h3 className="font-semibold text-sm line-clamp-2">
                                      {movie.title}
                                    </h3>
                                    {movie.year && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {movie.year}
                                      </p>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="flex gap-4 p-4">
                                  <div className="w-16 h-24 flex-shrink-0 relative">
                                    {movie.poster ? (
                                      <img
                                        src={getPosterUrl(movie.poster, 'w154')}
                                        alt={movie.title}
                                        className="w-full h-full object-cover rounded"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-muted flex items-center justify-center rounded">
                                        {isTV ? (
                                          <Tv className="h-8 w-8 text-muted-foreground" />
                                        ) : (
                                          <Film className="h-8 w-8 text-muted-foreground" />
                                        )}
                                      </div>
                                    )}
                                    {isTV && (
                                      <div className="absolute top-1 right-1 bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs font-medium">
                                        TV
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-semibold text-lg">{movie.title}</h3>
                                      {isTV && (
                                        <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs font-medium">
                                          TV
                                        </span>
                                      )}
                                    </div>
                                    {movie.year && (
                                      <p className="text-sm text-muted-foreground">
                                        {movie.year}
                                      </p>
                                    )}
                                    {movie.genres && movie.genres.length > 0 && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {movie.genres.join(', ')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Film className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {searchQuery ? 'No items found' : 'No items yet'}
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Link to="/search">
                        <Button>Search Movies & TV Shows</Button>
                      </Link>
                      <Link to="/scan">
                        <Button variant="outline">Scan Barcode</Button>
                      </Link>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Select or create a collection to get started</p>
              </div>
            )}
          </main>
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Collection Dialog */}
        {showCreateDialog && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCreateDialog(false)
                setCollectionName('')
                setError('')
              }
            }}
          >
            <Card className="max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Create Collection</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowCreateDialog(false)
                      setCollectionName('')
                      setError('')
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>Give your collection a name</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitCollection} className="space-y-4">
                  {error && (
                    <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  )}
                  <Input
                    placeholder="Collection name"
                    value={collectionName}
                    onChange={(e) => {
                      setCollectionName(e.target.value)
                      setError('')
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowCreateDialog(false)
                        setCollectionName('')
                        setError('')
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={createCollection.isPending || !collectionName.trim()}
                    >
                      {createCollection.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  )
}

