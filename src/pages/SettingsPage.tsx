import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import { useAuthStore } from '@/store/authStore'
import { useUpdateProfile, useUploadProfilePicture, useChangePassword } from '@/hooks/useProfile'
import { useTheme } from '@/components/ThemeProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { User, Download, Trash2, Camera, Save, X, Eye, EyeOff, AlertCircle, Moon, Sun, Palette, Loader2, Info } from 'lucide-react'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { theme, themeMode, setTheme, setThemeMode } = useTheme()
  const [displayName, setDisplayName] = useState(user?.displayName || '')

  // Sync displayName when user changes
  useEffect(() => {
    setDisplayName(user?.displayName || '')
  }, [user?.displayName])
  const [isEditingName, setIsEditingName] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const updateProfile = useUpdateProfile()
  const uploadPicture = useUploadProfilePicture()
  const changePassword = useChangePassword()

  const handleSaveDisplayName = async () => {
    setError('')
    setSuccess('')
    
    if (!displayName.trim()) {
      setError('Display name cannot be empty')
      return
    }

    try {
      await updateProfile.mutateAsync({ displayName: displayName.trim() })
      setIsEditingName(false)
      setSuccess('Display name updated successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update display name')
    }
  }

  const handleCancelEdit = () => {
    setDisplayName(user?.displayName || '')
    setIsEditingName(false)
    setError('')
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    setError('')
    setSuccess('')
    
    try {
      await uploadPicture.mutateAsync(file)
      setSuccess('Profile picture updated successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to upload profile picture')
    }
  }

  const handleChangePassword = async () => {
    setError('')
    setSuccess('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields')
      return
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password')
      return
    }

    try {
      await changePassword.mutateAsync({ currentPassword, newPassword })
      setSuccess('Password changed successfully')
      setShowPasswordForm(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to change password')
    }
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        {(error || success) && (
          <div className={`mb-6 p-4 rounded-md flex items-center gap-2 ${
            error ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'
          }`}>
            {error && <AlertCircle className="h-4 w-4" />}
            {error || success}
          </div>
        )}

        {/* Profile */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>Manage your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Picture */}
            <div className="flex items-center gap-6">
              <div className="relative">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-12 w-12 text-primary" />
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadPicture.isPending}
                  className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                  title="Change profile picture"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Profile Picture</p>
                <p className="text-xs text-muted-foreground">
                  Click the camera icon to upload a new picture
                </p>
                {uploadPicture.isPending && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading...
                  </p>
                )}
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="text-sm font-medium mb-2 block">Display Name</label>
              {isEditingName ? (
                <div className="flex gap-2">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter display name"
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    onClick={handleSaveDisplayName}
                    disabled={updateProfile.isPending}
                    size="icon"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    size="icon"
                    disabled={updateProfile.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input value={user?.displayName || ''} disabled className="flex-1" />
                  <Button
                    onClick={() => setIsEditingName(true)}
                    variant="outline"
                    size="sm"
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input value={user?.email || ''} disabled />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel of the app</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Light/Dark Mode */}
            <div>
              <label className="text-sm font-medium mb-2 block">Theme</label>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => setTheme('light')}
                  className="flex-1"
                >
                  <Sun className="h-4 w-4 mr-2" />
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => setTheme('dark')}
                  className="flex-1"
                >
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                </Button>
              </div>
            </div>

            {/* Theme Mode */}
            <div>
              <label className="text-sm font-medium mb-2 block">Theme Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={themeMode === 'default' ? 'default' : 'outline'}
                  onClick={() => setThemeMode('default')}
                  className="flex-1"
                >
                  Default
                </Button>
                <Button
                  variant={themeMode === 'batman' ? 'default' : 'outline'}
                  onClick={() => setThemeMode('batman')}
                  className="flex-1"
                >
                  Batman
                </Button>
                <Button
                  variant={themeMode === 'the-flash' ? 'default' : 'outline'}
                  onClick={() => setThemeMode('the-flash')}
                  className="flex-1"
                >
                  The Flash
                </Button>
                <Button
                  variant={themeMode === 'invincible' ? 'default' : 'outline'}
                  onClick={() => setThemeMode('invincible')}
                  className="flex-1"
                >
                  Invincible
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your password</CardDescription>
          </CardHeader>
          <CardContent>
            {!showPasswordForm ? (
              <Button onClick={() => setShowPasswordForm(true)} variant="outline">
                Change Password
              </Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Current Password</label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">New Password</label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Confirm New Password</label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleChangePassword}
                    disabled={changePassword.isPending}
                  >
                    {changePassword.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      'Change Password'
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPasswordForm(false)
                      setCurrentPassword('')
                      setNewPassword('')
                      setConfirmPassword('')
                      setError('')
                    }}
                    variant="outline"
                    disabled={changePassword.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Data Export
            </CardTitle>
            <CardDescription>Export your collection data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/library?tab=collections')} 
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Go to Collections to Export
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Use the Export button in the Collections tab to export your collections as JSON
            </p>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => {}} variant="destructive" disabled>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Account deletion coming soon
            </p>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              App Information
            </CardTitle>
            <CardDescription>Version and app details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Version</span>
              <span className="text-sm text-muted-foreground">1.0</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

