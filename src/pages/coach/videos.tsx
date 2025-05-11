'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import withAuth from '@/components/withAuth'
import { useTheme } from '@/contexts/ThemeContext'
import { VideoSourceType, YouTubeSource } from '@/lib/video-sources/types'

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
  const [importSummary, setImportSummary] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null)
  const { isDarkMode } = useTheme()

  // Temporary code to debug role issues
  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current user:', user);
      console.log('Session:', session);
      try {
        const jwt = session?.access_token ? JSON.parse(atob(session.access_token.split('.')[1])) : null;
        console.log('JWT claims:', jwt);
      } catch (e) {
        console.error('Error parsing JWT:', e);
      }
    };
    checkRole();
  }, [user]);

  const fetchVideos = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/videos/list')
      if (!response.ok) {
        throw new Error('Failed to fetch videos')
      }
      const videos = await response.json()
      setVideos(videos)
    } catch (err) {
      console.error('Exception fetching videos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVideos()
  }, [])

  const handleImportVideo = async () => {
    if (!videoUrl.trim()) return;
    
    try {
      setImporting(true);
      setImportSummary(null);
      
      if (videoSource === 'youtube') {
        const youtubeSource = VIDEO_SOURCES['youtube'] as YouTubeSource;
        
        if (importMode === 'playlist') {
          const playlistId = youtubeSource.extractPlaylistId(videoUrl);
          if (!playlistId) {
            setImportSummary({
              message: 'Invalid YouTube playlist URL. Please check and try again.',
              type: 'error'
            });
            return;
          }
          
          const result = await youtubeSource.importPlaylist(playlistId, user.id);
          
          // Show summary of changes
          const summary = [];
          if (result.added > 0) summary.push(`Added ${result.added} new videos`);
          if (result.updated > 0) summary.push(`Updated ${result.updated} existing videos`);
          if (result.removed > 0) summary.push(`Marked ${result.removed} videos as removed`);
          
          setImportSummary({
            message: summary.length > 0 
              ? `Playlist sync complete: ${summary.join(', ')}`
              : 'No changes needed - playlist is up to date',
            type: 'success'
          });
        } else {
          // Single video import
          const videoId = youtubeSource.extractVideoId(videoUrl);
          if (!videoId) {
            setImportSummary({
              message: 'Invalid YouTube video URL. Please check and try again.',
              type: 'error'
            });
            return;
          }
          
          await youtubeSource.importSingleVideo(videoId, videoUrl, user.id);
          setImportSummary({
            message: 'Video imported successfully!',
            type: 'success'
          });
        }
      } else {
        // Handle other video sources
        const sourceHandler = VIDEO_SOURCES[videoSource as VideoSourceType];
        if (!sourceHandler) {
          setImportSummary({
            message: `Unsupported video source: ${videoSource}`,
            type: 'error'
          });
          return;
        }

        const videoId = sourceHandler.extractVideoId(videoUrl);
        if (!videoId) {
          setImportSummary({
            message: `Invalid ${getSourceName(videoSource)} URL. Please check and try again.`,
            type: 'error'
          });
          return;
        }

        // For non-YouTube videos, we need a title
        if (!videoTitle.trim()) {
          setImportSummary({
            message: 'Please enter a title for the video',
            type: 'error'
          });
          return;
        }

        try {
          // Generic video import
          const { data, error } = await supabase.from('videos').insert({
            title: videoTitle,
            url: videoUrl,
            video_id: videoId,
            source: videoSource,
            status: 'active',
            last_synced: new Date().toISOString(),
            created_by: user.id
          });

          if (error) throw error;

          setImportSummary({
            message: 'Video imported successfully!',
            type: 'success'
          });

          console.log('Video import response:', { data, error }); // Add logging
        } catch (error) {
          console.error('Database error:', error); // Detailed error logging
          throw error; // Re-throw to be caught by outer catch block
        }
      }
      
      // Refresh the video list
      await fetchVideos();
      // Clear the form
      setVideoUrl('');
      setVideoTitle('');
    } catch (error) {
      console.error('Error importing video:', error);
      setImportSummary({
        message: error instanceof Error ? error.message : 'Failed to import video',
        type: 'error'
      });
    } finally {
      setImporting(false);
    }
  }

  const handleDeleteVideo = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video? Any clips associated with this video will not be deleted.')) {
      return
    }
    
    try {
      await supabase.from('videos').delete().eq('id', id)
      fetchVideos()
    } catch (error) {
      console.error('Error deleting video:', error)
      alert('Failed to delete video. Please try again.')
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

  // Show title input for non-YouTube videos
  const showTitleInput = videoSource !== 'youtube' || importMode === 'single';
  
  // Only YouTube supports playlist import
  const showPlaylistOption = videoSource === 'youtube';

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
                  // Reset form when changing source
                  setVideoUrl('');
                  if (source.id !== 'youtube') {
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
              YouTube Playlist
            </button>
          </div>
        )}
        
        <div className="space-y-3">
          {showTitleInput && videoSource !== 'youtube' && (
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
          
          <div>
            <label className="block mb-1">Video URL:</label>
            <input
              type="text"
              className={`w-full border rounded px-3 py-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              placeholder={
                importMode === 'playlist' 
                  ? "Paste YouTube playlist URL" 
                  : `Paste ${getSourceName(videoSource)} video URL`
              }
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
          </div>
          
          <button
            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            onClick={handleImportVideo}
            disabled={importing || !videoUrl.trim() || (videoSource !== 'youtube' && !videoTitle.trim())}
          >
            {importing 
              ? 'Importing...' 
              : importMode === 'playlist' 
                ? 'Import Playlist' 
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

export default withAuth(VideoManager, ['coach', 'admin'], 'Video Management') 