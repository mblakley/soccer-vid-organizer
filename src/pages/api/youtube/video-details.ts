import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = getSupabaseClient(req.headers.authorization)

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get the videoId from query parameters
    const { videoId } = req.query
    
    if (!videoId || typeof videoId !== 'string') {
      return res.status(400).json({ error: 'Video ID is required' })
    }
    
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
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Internal server error' })
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