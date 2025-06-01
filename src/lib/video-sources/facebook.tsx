import React from 'react';
import { VideoSource, VideoMetadata, VideoSourceProgress, VideoSourceImporter, VideoImportResult, VideoSourceError } from './types';
import { supabase } from '@/lib/supabaseClient';
import { Video, videoSchema } from '@/lib/types/videos';
import { apiClient } from '@/lib/api/client';

const FacebookSource: VideoSource = {
  id: 'facebook',
  name: 'Facebook',
  description: 'Import videos from Facebook Watch',
  logoUrl: '/logos/facebook.svg',
  isReady: true,
  requiresAuth: false,

  extractVideoId: (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      // Example: https://www.facebook.com/watch/?v=VIDEO_ID
      // Example: https://www.facebook.com/USER_NAME/videos/VIDEO_ID/
      if (urlObj.pathname.includes('/watch/') && urlObj.searchParams.has('v')) {
        return urlObj.searchParams.get('v');
      } else {
        const pathParts = urlObj.pathname.split('/');
        if (pathParts.includes('videos') && pathParts.length > pathParts.indexOf('videos') + 1) {
          return pathParts[pathParts.indexOf('videos') + 1];
        }
      }
      return null;
    } catch (e) {
      console.error('[FacebookSource] Error extracting video ID:', e);
      return null;
    }
  },

  getVideoUrl: (videoId: string): string => {
    return `https://www.facebook.com/watch/?v=${videoId}`;
  },

  getThumbnailUrl: async (videoId: string): Promise<string | null> => {
    // Facebook oEmbed might provide thumbnail, but requires App Token or Client Token
    // For now, returning placeholder or null
    // console.warn('[FacebookSource] Thumbnail fetching not implemented yet for Facebook.')
    return null; // Or a placeholder image
  },

  importSingleVideo: async (
    videoId: string,
    originalUrl: string,
    userId: string,
    // progressCallback?: (progress: VideoSourceProgress) => void
  ): Promise<VideoImportResult> => {
    try {
      // Fetch basic video metadata (title, description, duration, etc.)
      // This is complex for Facebook without official API access for general URLs.
      // For now, we'll create a basic entry and user can edit details later.
      // progressCallback?.({ status: 'fetching_metadata', progress: 25, message: 'Fetching video details...' })
      
      // Placeholder title - ideally, try to scrape or use oEmbed if possible
      let videoTitle = `Facebook Video ${videoId}`;
      let videoDescription = originalUrl;

      // const oEmbedUrl = `https://graph.facebook.com/v19.0/oembed_video?url=${encodeURIComponent(originalUrl)}&access_token=YOUR_APP_ACCESS_TOKEN`
      // The above requires an App Access Token or Client Token, not feasible for client-side only or general use without setup

      const videoDataForApi = {
        video_id: videoId,
        title: videoTitle, // Will need a way to get actual title
        url: originalUrl,
        source: 'facebook' as const,
        status: 'active' as const,
        // duration: fetchedDuration, // Need to fetch this
        // metadata: { /* any fetched metadata */ },
        // description: fetchedDescription,
        last_synced: new Date().toISOString(),
        // created_by: userId, // user_id is set by the API based on auth
      };

      // progressCallback?.({ status: 'saving_to_db', progress: 75, message: 'Saving video to library...' })
      
      const { data, error } = await apiClient.post('/api/videos/create', videoDataForApi as any); // Use as any to bypass strict type check if API expects more fields

      if (error) {
        console.error('[FacebookSource] API error creating video:', error);
        // Check if it's a conflict (duplicate)
        if (error.message && error.message.toLowerCase().includes('conflict') || error.message.toLowerCase().includes('duplicate')) {
          return { status: 'existing', videoId };
        }
        throw new VideoSourceError(error.message || 'Failed to save video via API', 'api_error');
      }
      
      if (!data || !data.video) {
        throw new VideoSourceError('No video data returned from API after creation', 'api_error');
      }
      
      // Validate with Zod schema (optional here as API should ensure it, but good for client confidence)
      const validation = videoSchema.safeParse(data.video);
      if (!validation.success) {
        console.warn('[FacebookSource] API returned video data that did not match schema:', validation.error.issues);
        // Decide if this is a critical error or if we can proceed with potentially partial data
      }

      // progressCallback?.({ status: 'completed', progress: 100, message: 'Video imported successfully!' })
      return { status: 'added', videoId, video: validation.success ? validation.data : data.video as Video };

    } catch (e: any) {
      console.error('[FacebookSource] Error importing video:', e);
      // progressCallback?.({ status: 'error', progress: 0, message: e.message || 'Import failed' })
      if (e instanceof VideoSourceError) throw e;
      throw new VideoSourceError(e.message || 'Unknown error during Facebook video import', e.type || 'unknown');
    }
  },
  // Playlist import is not typically supported for general Facebook video URLs in the same way as YouTube.
  // If there's a specific type of Facebook playlist, this could be implemented.
  // importPlaylist: async (playlistId, userId, progressCallback) => { ... }
};

export default FacebookSource; 