import React from 'react';
import { VideoMetadata, YouTubeSource } from './types';
import { supabase } from '@/lib/supabaseClient';

export interface YouTubePlaylistVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  channelTitle: string;
  publishedAt: string;
  tags: string[];
  playlistInfo: {
    playlistId: string;
    position: number;
  };
}

interface PlaylistVideoResponse {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  publishedAt: string;
  channelTitle: string;
  tags: string[];
  playlistInfo: {
    id: string;
    title: string;
    channelTitle: string;
  };
}

interface DbVideo {
  id: string;
  video_id: string;
  title: string;
  status: 'active' | 'removed' | 'private' | 'deleted';
  playlist_metadata?: {
    playlistId: string;
    position: number;
  };
  last_synced?: string;
}

const YouTubeSourceImpl: YouTubeSource = {
  id: 'youtube',
  name: 'YouTube',
  urlPattern: '^.*(youtu.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|\\&v=)([^#\\&\\?]*).*',
  
  extractVideoId(url: string): string | null {
    const match = url.match(new RegExp(this.urlPattern));
    return (match && match[2] && match[2].length === 11) ? match[2] : null;
  },

  extractPlaylistId(url: string): string | null {
    const regExp = /[&?]list=([^&]+)/i;
    const match = url.match(regExp);
    return match ? match[1] : null;
  },
  
  getPlayerComponent(videoId: string, start: number = 0, end?: number): React.ReactElement {
    // YouTube embed with start and optionally end time
    const params = [`start=${start}`];
    if (end && end > start) {
      params.push(`end=${end}`);
    }
    params.push('autoplay=1');
    
    const src = `https://www.youtube.com/embed/${videoId}?${params.join('&')}`;
    
    return (
      <div className="mb-4 aspect-video">
        <iframe 
          className="w-full h-full"
          src={src} 
          frameBorder="0" 
          allowFullScreen 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        ></iframe>
      </div>
    );
  },
  
  getThumbnailUrl(videoId: string, metadata?: VideoMetadata): string {
    // First try the metadata thumbnailUrl if it exists
    if (metadata?.thumbnailUrl) {
      return metadata.thumbnailUrl;
    }
    
    // YouTube provides thumbnail images in various sizes
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  },
  
  getVideoUrl(videoId: string): string {
    return `https://youtube.com/watch?v=${videoId}`;
  },

  async importSingleVideo(videoId: string, originalUrl: string, userId: string) {
    // Get auth token from Supabase
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Check if video already exists
    const { data: existingVideo } = await supabase
      .from('videos')
      .select('id')
      .eq('video_id', videoId)
      .eq('source', 'youtube')
      .single();
    
    if (existingVideo) {
      throw new Error('This video is already in your library.');
    }

    // Get YouTube API key
    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YouTube API key not configured');
    }

    // Fetch video details directly from YouTube API
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch video details from YouTube');
    }

    const data = await response.json();
    const videoDetails = data.items[0];

    if (!videoDetails) {
      throw new Error('Video not found on YouTube');
    }

    // Save to database
    const { error } = await supabase.from('videos').insert({
      title: videoDetails.snippet.title,
      url: originalUrl,
      video_id: videoId,
      source: 'youtube',
      duration: iso8601DurationToSeconds(videoDetails.contentDetails.duration),
      metadata: {
        description: videoDetails.snippet.description,
        thumbnailUrl: videoDetails.snippet.thumbnails.high?.url || videoDetails.snippet.thumbnails.default?.url,
        channelTitle: videoDetails.snippet.channelTitle,
        publishedAt: videoDetails.snippet.publishedAt,
        tags: videoDetails.snippet.tags || []
      },
      status: 'active',
      last_synced: new Date().toISOString(),
      created_by: userId
    });

    if (error) throw error;
  },

  async importPlaylist(playlistId: string, userId: string): Promise<{
    added: number;
    updated: number;
    removed: number;
  }> {
    console.log(`Starting import of playlist ${playlistId}`);
    
    // Get auth token from Supabase
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Get YouTube API key
    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YouTube API key not configured');
    }

    // Fetch playlist videos directly from YouTube API
    let nextPageToken = '';
    const videos = [];
    const maxPages = 10; // Safety limit to prevent infinite loops
    let pageCount = 0;

    // First, fetch playlist details
    console.log(`Fetching details for playlist ${playlistId}`);
    const playlistDetailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`
    );

    if (!playlistDetailsResponse.ok) {
      throw new Error('Failed to fetch playlist details from YouTube');
    }

    const playlistDetails = await playlistDetailsResponse.json();
    const playlistTitle = playlistDetails.items?.[0]?.snippet?.title || 'Unknown Playlist';
    const playlistChannelTitle = playlistDetails.items?.[0]?.snippet?.channelTitle || 'Unknown Channel';
    
    console.log(`Found playlist: "${playlistTitle}" by ${playlistChannelTitle}`);

    do {
      console.log(`Fetching page ${pageCount + 1} of playlist items`);
      // Fetch playlist items page
      const playlistResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`
      );

      if (!playlistResponse.ok) {
        throw new Error('Failed to fetch playlist items from YouTube');
      }

      const playlistData = await playlistResponse.json();
      console.log(`Received ${playlistData.items?.length || 0} playlist items`);

      // Extract video IDs
      const videoIds = playlistData.items
        .map((item: any) => item.contentDetails.videoId)
        .join(',');

      if (videoIds) {
        console.log(`Fetching details for ${videoIds.split(',').length} videos`);
        // Get details for all videos in this batch
        const videosResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${apiKey}`
        );

        if (!videosResponse.ok) {
          throw new Error('Failed to fetch video details from YouTube');
        }

        const videosData = await videosResponse.json();
        console.log(`Received details for ${videosData.items?.length || 0} videos`);

        // Process video items
        for (const item of videosData.items) {
          videos.push({
            videoId: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
            duration: iso8601DurationToSeconds(item.contentDetails.duration),
            publishedAt: item.snippet.publishedAt,
            channelTitle: item.snippet.channelTitle,
            tags: item.snippet.tags || [],
            playlistInfo: {
              id: playlistId,
              title: playlistTitle,
              channelTitle: playlistChannelTitle
            }
          });
        }
      }

      // Get next page token
      nextPageToken = playlistData.nextPageToken || '';
      pageCount++;
      console.log(`Page ${pageCount} complete. Next page token: ${nextPageToken || 'None'}`);
    } while (nextPageToken && pageCount < maxPages);

    console.log(`Total videos fetched from YouTube: ${videos.length}`);

    // Now handle database operations with the fetched videos
    const currentVideoIds = new Set(videos.map(v => v.videoId));
    console.log(`Unique video IDs from YouTube: ${currentVideoIds.size}`);

    // Get all videos from this playlist in our DB
    console.log(`Fetching existing videos for playlist ${playlistId} from database`);
    const { data: existingVideos, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('source', 'youtube')
      .eq('playlist_metadata->>playlistId', playlistId);

    if (fetchError) throw fetchError;

    console.log(`Found ${existingVideos?.length || 0} existing videos in database`);

    // Create a map of video_id to video object
    const existingVideoMap = new Map();
    (existingVideos || []).forEach((v: DbVideo) => {
      existingVideoMap.set(v.video_id, v);
      console.log(`Mapped existing video: ${v.video_id} -> ${v.id}`);
    });
    console.log(`Existing video map size: ${existingVideoMap.size}`);

    // Debug: Log all video IDs from YouTube to check against existing map
    console.log("All video IDs from YouTube:");
    videos.forEach(v => {
      console.log(`- ${v.videoId} ${existingVideoMap.has(v.videoId) ? '(EXISTS IN DB)' : '(NEW)'}`);
    });

    // 1. Handle videos that are no longer in the playlist
    const removedVideos = (existingVideos || []).filter(
      (v: DbVideo) => 
        v.status === 'active' && 
        !currentVideoIds.has(v.video_id)
    );
    console.log(`Videos to mark as removed: ${removedVideos.length}`);

    if (removedVideos.length > 0) {
      console.log(`Marking videos as removed: ${removedVideos.map(v => v.video_id).join(', ')}`);
      await supabase
        .from('videos')
        .update({ 
          status: 'removed',
          last_synced: new Date().toISOString()
        })
        .in('id', removedVideos.map(v => v.id));
    }

    // 2. Update existing videos with new metadata
    const updates = videos
      .filter(v => existingVideoMap.has(v.videoId))
      .map(v => ({
        id: existingVideoMap.get(v.videoId)!.id,
        title: v.title,
        duration: v.duration,
        metadata: {
          description: v.description,
          thumbnailUrl: v.thumbnailUrl,
          channelTitle: v.channelTitle,
          publishedAt: v.publishedAt,
          tags: v.tags
        },
        playlist_metadata: {
          playlistId: playlistId,
          ...v.playlistInfo
        },
        status: 'active',
        last_synced: new Date().toISOString()
      }));
    console.log(`Videos to update: ${updates.length}`);

    if (updates.length > 0) {
      console.log(`Updating videos: ${updates.map(u => u.id).join(', ')}`);
      const { error } = await supabase
        .from('videos')
        .upsert(updates);
      
      if (error) {
        console.error('Error updating videos:', error);
      } else {
        console.log('Videos updated successfully');
      }
    }

    // 3. Insert new videos
    const newVideoIds = new Set();
    const newVideos = videos
      .filter(v => {
        const isNew = !existingVideoMap.has(v.videoId);
        if (isNew) newVideoIds.add(v.videoId);
        return isNew;
      })
      .map(v => ({
        title: v.title,
        url: `https://youtube.com/watch?v=${v.videoId}`,
        video_id: v.videoId,
        source: 'youtube',
        duration: v.duration,
        metadata: {
          description: v.description,
          thumbnailUrl: v.thumbnailUrl,
          channelTitle: v.channelTitle,
          publishedAt: v.publishedAt,
          tags: v.tags
        },
        playlist_metadata: {
          playlistId: playlistId,
          ...v.playlistInfo
        },
        status: 'active',
        last_synced: new Date().toISOString(),
        created_by: userId
      }));
    console.log(`New videos to insert: ${newVideos.length}`);

    if (newVideos.length > 0) {
      console.log(`Inserting videos: ${Array.from(newVideoIds).join(', ')}`);
      const { error } = await supabase
        .from('videos')
        .insert(newVideos);
        
      if (error) {
        console.error('Error inserting videos:', error);
      } else {
        console.log('Videos inserted successfully');
      }
    }

    console.log(`Import complete. Added: ${newVideos.length}, Updated: ${updates.length}, Removed: ${removedVideos.length}`);
    return {
      added: newVideos.length,
      updated: updates.length,
      removed: removedVideos.length
    };
  },
  
  placeholderImage: '/images/youtube-video.svg'
};

// Helper function to convert YouTube's ISO 8601 duration to seconds
function iso8601DurationToSeconds(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
}

export default YouTubeSourceImpl;