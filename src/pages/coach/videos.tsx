'use client'
import { useState, useEffect } from 'react'
import { withAuth } from '@/components/auth'
import { useTheme } from '@/contexts/ThemeContext'
import { VideoSourceType, YouTubeSource } from '@/lib/types/video-sources'
import { toast } from 'react-toastify'
import { apiClient } from '@/lib/api/client'
import { Video } from '@/lib/types/videos'
import { ErrorResponse } from '@/lib/types/api'

// Import video sources
import YouTubeSourceModule from '@/lib/video-sources/youtube'
import FacebookSource from '@/lib/video-sources/facebook'
import InstagramSource from '@/lib/video-sources/instagram'
import TikTokSource from '@/lib/video-sources/tiktok'
import VeoSource from '@/lib/video-sources/veo'
import HudlSource from '@/lib/video-sources/hudl'

// Video source mapping
const VIDEO_SOURCES = {
  [YouTubeSourceModule.id]: YouTubeSourceModule as YouTubeSource,
  [FacebookSource.id]: FacebookSource,
  [InstagramSource.id]: InstagramSource,
  [TikTokSource.id]: TikTokSource,
  [VeoSource.id]: VeoSource,
  [HudlSource.id]: HudlSource,
} as const;

// Video source options for UI
const VIDEO_SOURCE_OPTIONS = Object.values(VIDEO_SOURCES).map(source => ({
  id: source.id,
  name: source.name
}));

function VideoManager({ user }: { user: any }) {
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importMode, setImportMode] = useState<'single' | 'playlist'>('single')
  const [videoTitle, setVideoTitle] = useState('')
  const [videoSource, setVideoSource] = useState<VideoSourceType>('youtube')
  const [videoUrl, setVideoUrl] = useState('')
  const [veoApiToken, setVeoApiToken] = useState('')
  const [importSummary, setImportSummary] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const { isDarkMode } = useTheme()

  // Temporary code to debug role issues
  useEffect(() => {
    const checkRole = async () => {
      try {
        const response = await fetch('/api/auth/session')
        if (!response.ok) {
          throw new Error('Failed to fetch session')
        }
        const { session } = await response.json()
        console.log('Current user:', user)
        console.log('Session:', session)
        if (session?.access_token) {
          try {
            const jwt = JSON.parse(atob(session.access_token.split('.')[1]))
            console.log('JWT claims:', jwt)
          } catch (e) {
            console.error('Error parsing JWT:', e)
          }
        }
      } catch (error) {
        console.error('Error checking role:', error)
      }
    }
    checkRole()
  }, [user])

  useEffect(() => {
    // On mount, check for a stored Veo API token
    const stored = localStorage.getItem('veoApiToken')
    if (stored) {
      try {
        const { token, expiresAt } = JSON.parse(stored)
        if (token && expiresAt && Date.now() < expiresAt) {
          setVeoApiToken(token)
        } else {
          localStorage.removeItem('veoApiToken')
        }
      } catch {
        localStorage.removeItem('veoApiToken')
      }
    }
  }, [])

  useEffect(() => {
    // When veoApiToken changes, store it with a 20-hour expiry
    if (veoApiToken && veoApiToken.trim()) {
      const expiresAt = Date.now() + 20 * 60 * 60 * 1000 // 20 hours
      localStorage.setItem('veoApiToken', JSON.stringify({ token: veoApiToken, expiresAt }))
    }
  }, [veoApiToken])

  const fetchVideos = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get<{ videos: Video[] } | ErrorResponse>('/api/videos/list')
      
      if ('error' in response) {
        console.error('Error fetching videos:', response.error)
        setPageError(response.error)
      } else {
        setVideos(response.videos || [])
      }
    } catch (err: any) {
      console.error('Exception fetching videos:', err)
      setPageError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVideos()
  }, [])

  const handleImportVideo = async () => {
    if (!videoUrl.trim() && importMode === 'single') return
    
    try {
      setImporting(true)
      setImportSummary(null)
      
      const response = await fetch('/api/auth/session')
      if (!response.ok) {
        throw new Error('Not authenticated')
      }
      const { session } = await response.json()
      if (!session) {
        throw new Error('Not authenticated')
      }
      
      if (videoSource === 'youtube') {
        const youtubeSource = VIDEO_SOURCES['youtube'] as YouTubeSource
        
        if (importMode === 'playlist') {
          const playlistId = youtubeSource.extractPlaylistId(videoUrl)
          if (!playlistId) {
            setImportSummary({
              message: 'Invalid YouTube playlist URL. Please check and try again.',
              type: 'error'
            })
            return
          }
          
          const result = await youtubeSource.importPlaylist(playlistId, user.id)
          
          // Show summary of changes
          const summary = []
          if (result.added > 0) summary.push(`Added ${result.added} new videos`)
          if (result.updated > 0) summary.push(`Updated ${result.updated} existing videos`)
          if (result.removed > 0) summary.push(`Marked ${result.removed} videos as removed`)
          
          setImportSummary({
            message: summary.length > 0 
              ? `Playlist sync complete: ${summary.join(', ')}`
              : 'No changes needed - playlist is up to date',
            type: 'success'
          })
        } else {
          // Single video import
          const videoId = youtubeSource.extractVideoId(videoUrl)
          if (!videoId) {
            setImportSummary({
              message: 'Invalid YouTube video URL. Please check and try again.',
              type: 'error'
            })
            return
          }
          
          await youtubeSource.importSingleVideo(videoId, videoUrl, user.id)
          setImportSummary({
            message: 'Video imported successfully!',
            type: 'success'
          })
        }
      } else if (videoSource === 'veo') {
        // Handle Veo video import
        const sourceHandler = VIDEO_SOURCES['veo']
        
        if (importMode === 'playlist') {
          // Import all Veo videos
          if (!veoApiToken.trim()) {
            setImportSummary({
              message: 'Please provide a Veo API token to import all videos.',
              type: 'error'
            })
            return
          }
          try {
            let allRecordings: any[] = []
            let nextPageToken: string | undefined = undefined
            let page = 1
            do {
              const url = new URL('https://api.veo.co/recordings')
              url.searchParams.set('page_size', '20')
              if (nextPageToken) {
                url.searchParams.set('page_token', nextPageToken)
              }
              const response = await fetch(url.toString(), {
                headers: {
                  'Authorization': `Bearer ${veoApiToken}`,
                  'Accept': 'application/json',
                  'X-Request-Id': 'veo-api-explorer/0.18.6/ce07c1479e6aa8'
                }
              })
              if (!response.ok) {
                const errorText = await response.text()
                console.error('Veo API error:', {
                  status: response.status,
                  statusText: response.statusText,
                  body: errorText
                })
                setImportSummary({
                  message: `Failed to fetch Veo recordings (page ${page}): ${response.status} ${response.statusText}\n${errorText}`,
                  type: 'error'
                })
                return
              }
              const data = await response.json()
              const recordings = data.items || []
              allRecordings = allRecordings.concat(recordings)
              nextPageToken = data.next_page_token
              page++
            } while (nextPageToken)
            let successCount = 0
            let updateCount = 0
            let errorCount = 0
            let skippedCount = 0
            for (const item of allRecordings) {
              try {
                const videoId = item.id
                // Use the web link as the video URL
                const videoUrl = item.links?.find((l: any) => l.rel === 'web')?.href || `https://app.veo.co/matches/${videoId}`
                // Try to get the direct stream link from followcam
                const streamUrl = item.followcam?.links?.find((l: any) => l.rel === 'stream' && l.type === 'video/mp4')?.href
                if (!streamUrl) {
                  skippedCount++
                  continue
                }
                // Try to import or update
                try {
                  const result = await (sourceHandler as any).importSingleVideo(videoId, videoUrl, user.id, veoApiToken)
                  if (result && result.status === 'updated') {
                    updateCount++
                  } else if (result && result.status === 'existing') {
                    // Should not happen anymore, but count as update
                    updateCount++
                  } else {
                    successCount++
                  }
                } catch (error: any) {
                  // Handle 409 conflict (duplicate)
                  if (error?.code === '23505' || (error?.message && error.message.includes('duplicate key value'))) {
                    updateCount++
                  } else {
                    errorCount++
                    console.error('Error importing Veo video:', error)
                  }
                }
              } catch (error) {
                errorCount++
                console.error('Error processing Veo recording:', error)
              }
            }
            const summary = []
            if (successCount > 0) summary.push(`Added ${successCount} new videos`)
            if (updateCount > 0) summary.push(`Updated ${updateCount} existing videos`)
            if (errorCount > 0) summary.push(`Failed to import ${errorCount} videos`)
            if (skippedCount > 0) summary.push(`Skipped ${skippedCount} videos without stream URLs`)
            setImportSummary({
              message: summary.length > 0 
                ? `Veo import complete: ${summary.join(', ')}`
                : 'No videos were imported',
              type: summary.length > 0 ? 'success' : 'info'
            })
          } catch (error: any) {
            console.error('Error importing Veo videos:', error)
            setImportSummary({
              message: `Failed to import Veo videos: ${error.message}`,
              type: 'error'
            })
          }
        } else {
          // Single Veo video import
          if (!veoApiToken.trim()) {
            setImportSummary({
              message: 'Please provide a Veo API token to import videos.',
              type: 'error'
            })
            return
          }
          try {
            const videoId = videoUrl.split('/').pop()
            if (!videoId) {
              setImportSummary({
                message: 'Invalid Veo video URL. Please check and try again.',
                type: 'error'
              })
              return
            }
            const result = await (sourceHandler as any).importSingleVideo(videoId, videoUrl, user.id, veoApiToken)
            if (result && result.status === 'updated') {
              setImportSummary({
                message: 'Video updated successfully!',
                type: 'success'
              })
            } else {
              setImportSummary({
                message: 'Video imported successfully!',
                type: 'success'
              })
            }
          } catch (error: any) {
            console.error('Error importing Veo video:', error)
            setImportSummary({
              message: `Failed to import video: ${error.message}`,
              type: 'error'
            })
          }
        }
      }
      
      // Refresh the video list after import
      await fetchVideos()
    } catch (error: any) {
      console.error('Error importing video:', error)
      setImportSummary({
        message: error.message || 'Failed to import video',
        type: 'error'
      })
    } finally {
      setImporting(false)
    }
  }

  const handleDeleteVideo = async (id: string) => {
    setPageError(null); // Clear previous page error
    if (!confirm("Are you sure you want to delete this video and its associated clips, counters, and timers? This action cannot be undone.")) {
      return;
    }
    try {
      const response = await apiClient.post<ErrorResponse>(`/api/videos/${id}`, null)
      
      if ('error' in response) {
        throw new Error(response.error)
      }
      
      toast.success('Video deleted successfully!');
      fetchVideos() // Refresh the list
    } catch (error: any) {
      console.error('Error deleting video:', error)
      setPageError(error.message || 'Failed to delete video. Please try again.');
    }
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'Unknown'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getThumbnailUrl = (video: any) => {
    const sourceHandler = VIDEO_SOURCES[video.source];
    if (!sourceHandler) return '/images/video-placeholder.svg';
    return sourceHandler.getThumbnailUrl(video.video_id, video.metadata);
  }

  const getVideoUrl = (video: any) => {
    const sourceHandler = VIDEO_SOURCES[video.source];
    if (!sourceHandler) return video.url || null;
    return sourceHandler.getVideoUrl(video.video_id);
  }
  
  // Get source display name
  const getSourceName = (source: string) => {
    const sourceHandler = VIDEO_SOURCES[source as VideoSourceType];
    return sourceHandler ? sourceHandler.name : source.charAt(0).toUpperCase() + source.slice(1);
  }

  // Show title input for non-YouTube videos and single Veo videos
  const showTitleInput = (videoSource !== 'youtube' && importMode === 'single') || 
                        (videoSource === 'veo' && importMode === 'single');
  
  // Only YouTube and Veo support playlist import
  const showPlaylistOption = videoSource === 'youtube' || videoSource === 'veo';

  // Update the video list rendering to show status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'removed':
        return <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded dark:bg-red-900 dark:text-red-200">Removed from source</span>
      case 'private':
        return <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-200">Private</span>
      case 'deleted':
        return <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded dark:bg-gray-900 dark:text-gray-200">Deleted</span>
      default:
        return null
    }
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Manage Videos</h1>
      
      {pageError && (
        <div className={`mb-4 p-4 text-sm rounded ${isDarkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'}`} role="alert">
          <span className="font-medium">Error:</span> {pageError}
        </div>
      )}
      
      <div className={`p-4 border rounded ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}>
        <h2 className="text-xl font-semibold mb-3">Import Videos</h2>
        
        {/* Import Summary Notification */}
        {importSummary && (
          <div className={`mb-4 p-3 rounded ${
            importSummary.type === 'success' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : importSummary.type === 'error'
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          }`}>
            {importSummary.message}
          </div>
        )}
        
        <div className="mb-3">
          <label className="block mb-1">Video Source:</label>
          <div className="flex flex-wrap gap-2">
            {VIDEO_SOURCE_OPTIONS.map(source => (
              <button
                key={source.id}
                className={`px-3 py-1 rounded text-sm ${videoSource === source.id 
                  ? 'bg-blue-600 text-white' 
                  : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800'}`}
                onClick={() => {
                  setVideoSource(source.id as VideoSourceType);
                  setVideoUrl('');
                  setVeoApiToken('');
                  if (source.id !== 'youtube' && source.id !== 'veo') {
                    setImportMode('single');
                  }
                }}
              >
                {source.name}
              </button>
            ))}
          </div>
        </div>
        
        {showPlaylistOption && (
          <div className="flex mb-3 space-x-2">
            <button 
              className={`px-3 py-1 rounded ${importMode === 'single' 
                ? 'bg-blue-600 text-white' 
                : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800'}`}
              onClick={() => setImportMode('single')}
            >
              Single Video
            </button>
            <button 
              className={`px-3 py-1 rounded ${importMode === 'playlist' 
                ? 'bg-blue-600 text-white' 
                : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800'}`}
              onClick={() => setImportMode('playlist')}
            >
              {videoSource === 'youtube' ? 'YouTube Playlist' : 'All Veo Videos'}
            </button>
          </div>
        )}
        
        <div className="space-y-3">
          {showTitleInput && (
            <div>
              <label className="block mb-1">Video Title:</label>
              <input
                type="text"
                className={`w-full border rounded px-3 py-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                placeholder="Enter video title"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
              />
            </div>
          )}
          
          {videoSource === 'veo' && (
            <div>
              <label className="block mb-1">Veo API Token:</label>
              <input
                type="text"
                className={`w-full border rounded px-3 py-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                placeholder="Paste your Veo API token here"
                value={veoApiToken}
                onChange={e => setVeoApiToken(e.target.value)}
              />
              <div className="text-xs text-gray-500 mt-1">
                You can get a 24-hour token from the <a href="https://api.veo.co/docs/explorer" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">Veo API Explorer</a>.
              </div>
            </div>
          )}
          
          {importMode === 'single' && (
            <div>
              <label className="block mb-1">Video URL:</label>
              <input
                type="text"
                className={`w-full border rounded px-3 py-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                placeholder={`Paste ${getSourceName(videoSource)} video URL`}
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
          )}
          {videoSource === 'youtube' && importMode === 'playlist' && (
            <div>
              <label className="block mb-1">Playlist URL:</label>
              <input
                type="text"
                className={`w-full border rounded px-3 py-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                placeholder="Paste YouTube playlist URL"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
          )}
          
          <button
            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            onClick={handleImportVideo}
            disabled={
              importing || 
              (importMode === 'single' && !videoUrl.trim()) || 
              (videoSource !== 'youtube' && importMode === 'single' && !videoTitle.trim()) || 
              (videoSource === 'veo' && !veoApiToken.trim())
            }
          >
            {importing 
              ? 'Importing...' 
              : importMode === 'playlist' 
                ? (videoSource === 'youtube' ? 'Import Playlist' : 'Import All Veo Videos')
                : `Import ${getSourceName(videoSource)} Video`
            }
          </button>
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-3">Your Videos</h2>
        
        {loading ? (
          <p>Loading videos...</p>
        ) : videos.length === 0 ? (
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No videos found. Import videos using the form above.</p>
        ) : (
          <div className="space-y-2">
            {videos.map(video => (
              <div 
                key={video.id} 
                className={`p-3 border rounded flex items-center gap-4 ${
                  isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}
              >
                {/* Thumbnail */}
                <div className="w-48 h-27 relative flex-shrink-0">
                  <img 
                    src={getThumbnailUrl(video)}
                    alt={video.title}
                    className="absolute inset-0 w-full h-full object-cover rounded"
                  />
                </div>

                {/* Video Info */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold truncate">{video.title}</h3>
                      <div className="text-sm text-gray-500 space-x-2">
                        <span>{getSourceName(video.source)}</span>
                        <span>•</span>
                        <span>{formatDuration(video.duration)}</span>
                        {video.metadata?.publishedAt && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              Published {new Date(video.metadata.publishedAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-sm mt-1 space-x-3">
                        <span className="text-blue-500">{video.clips?.count || 0} clips</span>
                        <span className="text-green-500">{video.comments?.count || 0} comments</span>
                        {video.metadata?.channelTitle && (
                          <span className="text-gray-500">by {video.metadata.channelTitle}</span>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(video.status)}
                  </div>

                  {/* Actions */}
                  <div className="mt-2 space-x-2 text-sm">
                    {video.status === 'active' && getVideoUrl(video) && (
                      <a 
                        href={getVideoUrl(video)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        Watch Video
                      </a>
                    )}
                    <button 
                      onClick={() => handleDeleteVideo(video.id)}
                      className="text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500 text-xs">
                      Added {new Date(video.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default withAuth(
  VideoManager, 
  {
    teamId: 'any',
    roles: ['coach']
  }, 
  'Video Management'
) 