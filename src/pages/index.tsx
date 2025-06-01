'use client'
import { useEffect, useState, useCallback } from 'react'
import ClipPlayer from '@/components/ClipPlayer'
import { withAuth, User } from '@/components/auth'
import { useTheme } from '@/contexts/ThemeContext'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'
import { Video, Clip, Comment as CommentType, TeamRole } from '@/lib/types'
import { PlayCircle, ListVideo, Film, MessageCircle, Users, AlertTriangle, LogIn } from 'lucide-react'

interface Comment extends CommentType {
  role_visibility: 'both' | string;
  content: string;
}

interface UserWithRole extends User {
  role: string;
}

interface UserRolesApiResponse {
  roles?: TeamRole[];
  hasNoRoles?: boolean;
  message?: string;
}

interface ListClipsApiResponse {
  clips?: Clip[];
  message?: string;
}

interface VideoSourcesApiResponse {
  sources?: { video_id: string; source: string | null; id?: string }[];
  message?: string;
}

interface ListVideosApiResponse {
  videos?: Video[];
  message?: string;
}

interface ListCommentsApiResponse {
  comments?: CommentType[];
  message?: string;
}

interface HomePageProps {
  user: UserWithRole | null;
}

function HomePage({ user }: HomePageProps) {
  const [clips, setClips] = useState<Clip[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [videoSources, setVideoSources] = useState<Record<string, string | null>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [comments, setComments] = useState<CommentType[]>([])
  const [loading, setLoading] = useState(true)
  const [userAppRoles, setUserAppRoles] = useState<TeamRole[]>([])
  const [hasNoRoles, setHasNoRoles] = useState(false)
  const { isDarkMode } = useTheme()
  const [pageError, setPageError] = useState<string | null>(null)
  const [nextClipInfo, setNextClipInfo] = useState<Clip | null>(null)

  const fetchUserRoles = useCallback(async () => {
    if (!user) {
      setHasNoRoles(true)
      setUserAppRoles([])
      return
    }
    try {
      const data = await apiClient.get<UserRolesApiResponse>('/api/users/me/roles')
      if (data) {
        setUserAppRoles(data.roles || [])
        setHasNoRoles(data.hasNoRoles || (data.roles && data.roles.length === 0) || false)
      } else {
        setHasNoRoles(true)
        setUserAppRoles([])
      }
    } catch (err: any) {
      console.error('Error fetching user roles:', err)
      setPageError(err.message || 'Could not load user role information')
      setHasNoRoles(true)
    }
  }, [user])

  const fetchRecentClips = useCallback(async () => {
    try {
      const data = await apiClient.get<ListClipsApiResponse>('/api/clips/list?recent=true&limit=5&joinVideoUrl=true')
      if (data?.clips) {
        setClips(data.clips)
        const uniqueVideoIds = [...new Set(data.clips.map(clip => clip.video_id).filter(id => id))]
        if (uniqueVideoIds.length > 0) {
          fetchVideoSourcesForClips(uniqueVideoIds)
        }
      } else {
        setClips([])
        if (data?.message) setPageError(prev => prev ? `${prev}\n${data.message}` : data.message || null)
      }
    } catch (err: any) {
      console.error('Error fetching recent clips:', err)
      setPageError(prev => prev ? `${prev}\n${err.message}` : err.message || 'Could not load recent clips')
    }
  }, [])

  const fetchVideoSourcesForClips = useCallback(async (videoIds: string[]) => {
    if (videoIds.length === 0) return
    try {
      const data = await apiClient.get<VideoSourcesApiResponse>(`/api/videos/sources?ids=${videoIds.join(',')}`)
      if (data?.sources) {
        const sourcesMap: Record<string, string | null> = {}
        data.sources.forEach(srcInfo => {
          sourcesMap[srcInfo.video_id] = srcInfo.source
        })
        setVideoSources(prev => ({ ...prev, ...sourcesMap }))
      }
    } catch (err: any) {
      console.error('Error fetching video sources:', err)
    }
  }, [])

  const fetchRecentVideos = useCallback(async () => {
    try {
      const data = await apiClient.get<ListVideosApiResponse>('/api/videos/list?recent=true&limit=6')
      if (data?.videos) {
        setVideos(data.videos)
      } else {
        if (data?.message) setPageError(prev => prev ? `${prev}\n${data.message}` : data.message || null)
      }
    } catch (err: any) {
      console.error('Error fetching recent videos:', err)
      setPageError(prev => prev ? `${prev}\n${err.message}` : err.message || 'Could not load recent videos')
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    setPageError(null)
    Promise.all([
      fetchUserRoles(),
      fetchRecentClips(),
      fetchRecentVideos(),
    ]).finally(() => setLoading(false))
  }, [fetchUserRoles, fetchRecentClips, fetchRecentVideos])

  useEffect(() => {
    const fetchCommentsForCurrentClip = async () => {
      if (clips.length > 0 && currentIndex < clips.length) {
        const currentClip = clips[currentIndex]
        if (currentClip?.id) {
          try {
            const data = await apiClient.get<ListCommentsApiResponse>(`/api/comments/list?clipId=${currentClip.id}`)
            setComments(data?.comments || [])
          } catch (err: any) {
            console.error(`Error fetching comments for clip ${currentClip.id}:`, err)
          }
        }
      }
    }
    fetchCommentsForCurrentClip()
  }, [currentIndex, clips])

  const isVideo = (item: Video | Clip): item is Video => {
    return 'source' in item && 'url' in item;
  }

  const getThumbnailUrl = (video: Video | Clip) => {
    if ('metadata' in video && video.metadata?.thumbnailUrl) {
      return video.metadata.thumbnailUrl
    }
    if ('videos' in video && video.videos?.metadata?.thumbnailUrl) {
      return video.videos.metadata.thumbnailUrl
    }
    const source = isVideo(video) ? video.source : video.videos?.source
    const videoId = isVideo(video) ? video.video_id : video.videos?.video_id

    if (source === 'youtube' && videoId) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    }
    if (source === 'youtube') return '/images/youtube-video.svg'
    return '/images/video-placeholder.svg'
  }

  const getVideoClientUrl = (video: Video | Clip) => {
    const url = isVideo(video) ? video.url : video.videos?.url
    if (url) return url

    const source = isVideo(video) ? video.source : video.videos?.source
    const videoId = isVideo(video) ? video.video_id : video.videos?.video_id

    if (source === 'youtube' && videoId) {
      return `https://youtube.com/watch?v=${videoId}`
    }
    return '#'
  }

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return 'Unknown'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleClipEnd = () => {
    const nextIndex = currentIndex + 1
    if (nextIndex < clips.length) {
      setNextClipInfo(clips[nextIndex])
      setTimeout(() => {
        setCurrentIndex(nextIndex)
        setNextClipInfo(null)
      }, 1000)
    } else {
      setNextClipInfo(null)
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
        <p className={`ml-4 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Loading your dashboard...</p>
      </div>
    )
  }

  if (pageError && !user) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${isDarkMode ? 'bg-gray-900 text-red-400' : 'bg-gray-100 text-red-600'}`}>
        <AlertTriangle size={48} className="mb-4" />
        <h2 className="text-xl font-semibold mb-2">Could not load dashboard</h2>
        <p className="text-center">{pageError}</p>
        <button
          onClick={() => window.location.reload()}
          className={`mt-6 px-4 py-2 rounded-md font-medium transition-colors ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
          Try Again
        </button>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 ${isDarkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
        <LogIn size={64} className={`mb-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
        <h1 className="text-3xl font-bold mb-4">Welcome to Soccer Vid Organizer</h1>
        <p className={`mb-8 text-lg text-center max-w-md ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Please log in to access your dashboard, manage videos, clips, and more.
        </p>
        <Link 
          href="/login" 
          className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'}`}
        >
          Log In
        </Link>
      </div>
    )
  }

  return (
    <div className={`p-4 md:p-8 space-y-8 ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
      {pageError && (
        <div className={`p-4 mb-6 border rounded-lg ${isDarkMode ? 'bg-red-900 border-red-700 text-red-100' : 'bg-red-100 border-red-300 text-red-700'}`} role="alert">
          <h3 className="font-bold flex items-center"><AlertTriangle size={18} className="mr-2" />Information</h3>
          <pre className="whitespace-pre-wrap">{pageError}</pre>
        </div>
      )}

      {hasNoRoles && user && (
        <div className={`p-4 mb-6 border rounded-lg ${
          isDarkMode 
            ? 'bg-blue-900 border-blue-800 text-blue-100' 
            : 'bg-blue-50 border-blue-200 text-blue-800'
        } text-center`}>
          <p className="mb-2">You don't have any team roles assigned yet.</p>
          <Link 
            href="/role-request" 
            className={`inline-block px-4 py-2 rounded font-medium ${
              isDarkMode 
                ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Request Team Role
          </Link>
        </div>
      )}

      {!hasNoRoles && (
        <>
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold flex items-center"><PlayCircle size={28} className="mr-2" /> Recent Clips</h2>
              <Link 
                href="/clips" 
                className="text-blue-600 hover:underline"
              >
                View All Clips
              </Link>
            </div>

            {clips.length === 0 && !loading ? (
              <p className={`py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No clips available yet.</p>
            ) : clips.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-3">
                  {clips[currentIndex]?.title || 'Untitled Clip'}
                  {clips[currentIndex]?.id && (
                    <span className="ml-3 text-xs text-gray-500">ID: {clips[currentIndex].id}</span>
                  )}
                </h3>
                <ClipPlayer 
                  key={clips[currentIndex]?.id}
                  videoId={clips[currentIndex]?.video_id} 
                  start={clips[currentIndex]?.start_time} 
                  end={clips[currentIndex]?.end_time} 
                  source={videoSources[clips[currentIndex]?.video_id || ''] || clips[currentIndex]?.videos?.source || undefined}
                  url={clips[currentIndex]?.videos?.url}
                  onEnd={handleClipEnd}
                  nextClipInfo={nextClipInfo ? {
                    title: nextClipInfo.title || '',
                    start_time: nextClipInfo.start_time || 0,
                    end_time: nextClipInfo.end_time || 0
                  } : undefined}
                />
                
                <ul className="list-disc list-inside space-y-1 mt-3">
                  {(comments as Comment[]).filter(c => c.role_visibility === 'both' || c.role_visibility === user?.role).map(c => (
                    <li key={c.id}>{c.content}</li>
                  ))}
                </ul>
                
                <div className="space-x-2 mt-3">
                  <button 
                    className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} px-4 py-2 rounded transition-colors`} 
                    onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                  >
                    Prev
                  </button>
                  <button 
                    className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} px-4 py-2 rounded transition-colors`} 
                    onClick={() => setCurrentIndex(i => Math.min(clips.length - 1, i + 1))}
                    disabled={currentIndex === clips.length - 1}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>

          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold flex items-center"><ListVideo size={28} className="mr-2" /> Recent Videos</h2>
              <Link 
                href="/videos" 
                className="text-blue-600 hover:underline"
              >
                View All Videos
              </Link>
            </div>

            {videos.length === 0 && !loading ? (
              <p className={`py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No videos available yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map(video => {
                  const externalLink = getVideoClientUrl(video)
                  const isSpecialVeo = video.source === 'veo' && video.url && video.url.startsWith('https://app.veo.co')

                  return (
                    <Link key={video.id} href={externalLink} legacyBehavior passHref>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block rounded-lg overflow-hidden shadow-lg transition-all hover:shadow-xl ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50'}`}
                      >
                        <div className="relative pb-[56.25%]">
                          <img src={getThumbnailUrl(video)} alt={video.title} className="absolute inset-0 w-full h-full object-cover" />
                          {video.duration != null && (
                            <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-1 py-0.5 rounded">
                              {formatDuration(video.duration)}
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="font-semibold">{video.title}</h3>
                          <div className="text-xs text-gray-500 mt-1">
                            Source: {video.source ? video.source.charAt(0).toUpperCase() + video.source.slice(1) : 'Unknown'}
                          </div>
                          <div className="mt-2 text-sm flex flex-wrap gap-x-4 gap-y-1 items-center">
                            {externalLink && (
                              <a href={externalLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                Watch Externally
                              </a>
                            )}
                            <a href={`/analyze/${video.source}/${video.video_id}`} className="text-green-600 hover:underline">
                              Analyze In-App
                            </a>
                          </div>
                        </div>
                      </a>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default withAuth(
  HomePage, 
  {
    teamId: 'any',
    roles: [],
    requireRole: false
  }, 
  'Dashboard'
)
