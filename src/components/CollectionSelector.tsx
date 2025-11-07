import { useState } from 'react'
import { useCollections, useCreateCollection } from '@/hooks/useCollections'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Folder, Plus, Loader2, X } from 'lucide-react'

interface CollectionSelectorProps {
  selectedCollectionId: string | null
  onSelect: (collectionId: string) => void
  onClose?: () => void
  showCreateOption?: boolean
}

export default function CollectionSelector({
  selectedCollectionId,
  onSelect,
  onClose,
  showCreateOption = true,
}: CollectionSelectorProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const { data: collections, isLoading } = useCollections()
  const createCollection = useCreateCollection()

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCollectionName.trim()) return

    try {
      const newCollectionId = await createCollection.mutateAsync(newCollectionName.trim())
      setNewCollectionName('')
      setShowCreateForm(false)
      onSelect(newCollectionId)
      if (onClose) onClose()
    } catch (error: any) {
      console.error('Failed to create collection:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Select Collection</label>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : collections && collections.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {collections.map((collection) => (
              <button
                key={collection.id}
                onClick={() => {
                  onSelect(collection.id)
                  if (onClose) onClose()
                }}
                className={`p-3 rounded-md border text-left transition-all ${
                  selectedCollectionId === collection.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{collection.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {collection.itemCount} {collection.itemCount === 1 ? 'item' : 'items'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No collections found
          </div>
        )}
      </div>

      {showCreateOption && (
        <div>
          {!showCreateForm ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Collection
            </Button>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Create New Collection</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewCollectionName('')
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCollection} className="space-y-2">
                  <Input
                    placeholder="Collection name"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    autoFocus
                    maxLength={50}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={!newCollectionName.trim() || createCollection.isPending}
                      className="flex-1"
                    >
                      {createCollection.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false)
                        setNewCollectionName('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

