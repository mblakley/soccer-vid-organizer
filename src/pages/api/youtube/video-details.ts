import { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check for authorized user
  const supabase = createServerSupabaseClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  // Get the videoId from query parameters
  const { videoId } = req.query
  
  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({ error: 'Video ID is required' })
  }
  
  try {
    // YouTube API key from environment variables
    const apiKey = process.env.YOUTUBE_API_KEY
    
    if (!apiKey) {
      return res.status(500).json({ error: 'YouTube API key not configured' })
    }
    
    // Fetch video details from YouTube API
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${apiKey}`
    )
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.items || data.items.length === 0) {
      return res.status(404).json({ error: 'Video not found' })
    }
    
    const videoItem = data.items[0]
    const snippet = videoItem.snippet
    const contentDetails = videoItem.contentDetails
    
    // Convert ISO 8601 duration to seconds
    const duration = iso8601DurationToSeconds(contentDetails.duration)
    
    res.status(200).json({
      title: snippet.title,
      description: snippet.description,
      thumbnailUrl: snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
      duration: duration,
      publishedAt: snippet.publishedAt,
      channelId: snippet.channelId,
      channelTitle: snippet.channelTitle,
      tags: snippet.tags || []
    })
  } catch (error) {
    console.error('Error fetching video details:', error)
    res.status(500).json({ error: 'Failed to fetch video details' })
  }
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