import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ErrorResponse } from '@/lib/types/api'
import type { PlaylistVideosApiResponse, YouTubeVideo } from '@/lib/types/youtube'
import { playlistVideosQuerySchema, playlistVideosResponseSchema } from '@/lib/types/youtube'
import { z } from 'zod'

interface PlaylistItemFromYouTubeAPI {
  contentDetails: {
    videoId: string;
  };
  // Add other fields if used from snippet for initial playlist item fetch if needed
}

interface VideoItemFromYouTubeAPI {
    id: string;
    snippet: {
        title: string;
        description: string;
        thumbnails: {
            high?: { url: string };
            default?: { url: string };
            medium?: { url: string }; // Add other potential thumbnail sizes
            standard?: { url: string };
            maxres?: { url: string };
        };
        publishedAt: string;
        channelId: string;
        channelTitle: string;
        tags?: string[];
    };
    contentDetails: {
        duration: string;
    };
}

async function fetchAllPlaylistVideos(playlistId: string, apiKey: string): Promise<YouTubeVideo[]> {
  let nextPageToken = ''
  const videos: YouTubeVideo[] = []
  const maxPages = 10 // Safety limit to prevent infinite loops
  let pageCount = 0
  
  // First, fetch playlist details to get the title
  const playlistDetailsResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`
  )
  
  if (!playlistDetailsResponse.ok) {
    const errorData = await playlistDetailsResponse.json().catch(() => ({ message: 'Failed to parse YouTube API error response' }))
    console.error('YouTube API error (playlists):', playlistDetailsResponse.status, errorData)
    throw new Error(`YouTube API error fetching playlist details: ${playlistDetailsResponse.status} ${errorData.error?.message || errorData.message || 'Unknown error'}`)
  }
  
  const playlistDetails = await playlistDetailsResponse.json()
  const playlistTitle = playlistDetails.items?.[0]?.snippet?.title || 'Unknown Playlist'
  const playlistChannelTitle = playlistDetails.items?.[0]?.snippet?.channelTitle || 'Unknown Channel'
  
  do {
    // Fetch playlist items page
    const playlistResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`
    )
    
    if (!playlistResponse.ok) {
      const errorData = await playlistResponse.json().catch(() => ({ message: 'Failed to parse YouTube API error response' }))
      console.error('YouTube API error (playlistItems):', playlistResponse.status, errorData)
      throw new Error(`YouTube API error fetching playlist items: ${playlistResponse.status} ${errorData.error?.message || errorData.message || 'Unknown error'}`)
    }
    
    const playlistData = await playlistResponse.json()
    
    // Extract video IDs
    const videoIds = playlistData.items
      ?.map((item: PlaylistItemFromYouTubeAPI) => item.contentDetails?.videoId)
      .filter(Boolean) // Filter out any null/undefined videoIds
      .join(',')
    
    console.log(videoIds)
    if (videoIds && videoIds.length > 0) {
      // Get details for all videos in this batch
      const videosResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${apiKey}`
      )
      
      if (!videosResponse.ok) {
        const errorData = await videosResponse.json().catch(() => ({ message: 'Failed to parse YouTube API error response' }))
        console.error('YouTube API error (videos):', videosResponse.status, errorData)
        throw new Error(`YouTube API error fetching video details: ${videosResponse.status} ${errorData.error?.message || errorData.message || 'Unknown error'}`)
      }
      
      const videosData = await videosResponse.json()
      
      // Process video items
      for (const item of videosData.items as VideoItemFromYouTubeAPI[]) {
        console.log(item)
        videos.push({
          videoId: item.id,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnailUrl: item.snippet.thumbnails.high?.url || 
                        item.snippet.thumbnails.medium?.url || 
                        item.snippet.thumbnails.standard?.url || 
                        item.snippet.thumbnails.default?.url ||
                        item.snippet.thumbnails.maxres?.url,
          duration: iso8601DurationToSeconds(item.contentDetails.duration),
          publishedAt: item.snippet.publishedAt,
          channelId: item.snippet.channelId,
          channelTitle: item.snippet.channelTitle,
          tags: item.snippet.tags || [],
          playlistInfo: {
            id: playlistId,
            title: playlistTitle,
            channelTitle: playlistChannelTitle
          }
        })
      }
    }
    
    // Get next page token
    nextPageToken = playlistData.nextPageToken || ''
    pageCount++
  } while (nextPageToken && pageCount < maxPages)
  
  return videos
}

// Function to convert YouTube's ISO 8601 duration to seconds
function iso8601DurationToSeconds(duration: string): number {
  if (!duration) return 0
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  
  if (!match) return 0
  
  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')
  
  return hours * 3600 + minutes * 60 + seconds
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PlaylistVideosApiResponse>
) {
  if (req.method !== 'GET') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' }
    res.setHeader('Allow', ['GET'])
    return res.status(405).json(errorResponse)
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      const err: ErrorResponse = { error: 'Unauthorized: Invalid or missing token' }
      return res.status(401).json(err)
    }

    const { playlistId } = playlistVideosQuerySchema.parse(req.query)
    
    const apiKey = process.env.YOUTUBE_API_KEY
    
    if (!apiKey) {
      console.error('YOUTUBE_API_KEY is not set in environment variables.')
      const err: ErrorResponse = { error: 'Server configuration error: YouTube API key missing.' }
      return res.status(500).json(err)
    }
    
    const videos = await fetchAllPlaylistVideos(playlistId, apiKey)
    const responseData = { videos }
    playlistVideosResponseSchema.parse(responseData) // Validate response

    return res.status(200).json(responseData)

  } catch (error) {
    if (error instanceof z.ZodError) {
      const err: ErrorResponse = { 
        error: 'Invalid request: Check playlistId format.',
        // issues: error.issues 
      }
      return res.status(400).json(err)
    }
    if (error instanceof Error) {
      // Errors from fetchAllPlaylistVideos will be instances of Error with YouTube API messages
      const err: ErrorResponse = { error: error.message } 
      // Determine status code based on error message if possible
      const statusCode = error.message.includes('YouTube API error') ? 502 : 500 // 502 for bad gateway if YouTube fails
      return res.status(statusCode).json(err)
    }
    console.error('Unhandled error in youtube/playlist-videos:', error)
    const err: ErrorResponse = { error: 'An unknown internal server error occurred' }
    return res.status(500).json(err)
  }
} 