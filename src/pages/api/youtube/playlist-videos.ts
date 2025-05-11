import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get auth token from header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authorization token' });
    }

    // Get the playlistId from query parameters
    const { playlistId } = req.query;
    
    if (!playlistId || typeof playlistId !== 'string') {
      return res.status(400).json({ error: 'Playlist ID is required' });
    }
    
    // YouTube API key from environment variables
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'YouTube API key not configured' });
    }
    
    // Fetch all videos from the playlist (handles pagination)
    const playlistVideos = await fetchAllPlaylistVideos(playlistId, apiKey);
    
    res.status(200).json(playlistVideos);
  } catch (error) {
    console.error('Error fetching playlist videos:', error);
    res.status(500).json({ error: 'Failed to fetch playlist videos' });
  }
}

interface PlaylistItem {
  contentDetails: {
    videoId: string;
  };
}

async function fetchAllPlaylistVideos(playlistId: string, apiKey: string) {
  let nextPageToken = ''
  const videos = []
  const maxPages = 10 // Safety limit to prevent infinite loops
  let pageCount = 0
  
  // First, fetch playlist details to get the title
  const playlistDetailsResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`
  )
  
  if (!playlistDetailsResponse.ok) {
    throw new Error(`YouTube API error: ${playlistDetailsResponse.status}`)
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
      throw new Error(`YouTube API error: ${playlistResponse.status}`)
    }
    
    const playlistData = await playlistResponse.json()
    
    // Extract video IDs
    const videoIds = playlistData.items
      .map((item: PlaylistItem) => item.contentDetails.videoId)
      .join(',')
    
    console.log(videoIds)
    if (videoIds) {
      // Get details for all videos in this batch
      const videosResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${apiKey}`
      )
      
      if (!videosResponse.ok) {
        throw new Error(`YouTube API error: ${videosResponse.status}`)
      }
      
      const videosData = await videosResponse.json()
      
      // Process video items
      for (const item of videosData.items) {
        console.log(item)
        videos.push({
          videoId: item.id,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
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
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  
  if (!match) return 0
  
  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')
  
  return hours * 3600 + minutes * 60 + seconds
} 