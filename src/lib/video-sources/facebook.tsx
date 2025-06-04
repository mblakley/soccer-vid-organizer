import React from 'react';
import { VideoSource, VideoMetadata, VideoSourceProgress, VideoSourceImporter, VideoImportResult, VideoSourceError } from '@/lib/types/video-sources';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { Video, videoSchema, VideoCreateRequest } from '@/lib/types/videos';
import { apiClient } from '@/lib/api/client';
import { ErrorResponse } from '@/lib/types/api';

class FacebookVideoSourceError extends Error implements VideoSourceError {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'FacebookVideoSourceError';
  }
}

const FacebookSource: VideoSource = {
  id: 'facebook',
  name: 'Facebook',
  urlPattern: '^(https?://)?(www\\.)?facebook\\.com/watch/\\?v=\\d+|https?://(www\\.)?facebook\\.com/[^/]+/videos/\\d+/',
  placeholderImage: '/logos/facebook.svg',

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

  getThumbnailUrl: (videoId: string, metadata?: any): string => {
    // Facebook oEmbed might provide thumbnail, but requires App Token or Client Token
    // For now, returning placeholder
    return '/logos/facebook.svg';
  },

  getPlayerComponent: (videoId: string, start?: number, end?: number): React.ReactElement => {
    return (
      <iframe
        src={`https://www.facebook.com/plugins/video.php?href=https://www.facebook.com/watch/?v=${videoId}&show_text=false&width=560&height=315&appId`}
        width="560"
        height="315"
        style={{ border: 'none', overflow: 'hidden' }}
        scrolling="no"
        frameBorder="0"
        allowFullScreen
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      />
    );
  },

  importSingleVideo: async (
    videoId: string,
    originalUrl: string,
    userId: string,
    apiToken?: string
  ): Promise<void> => {
    try {
      // Fetch basic video metadata (title, description, duration, etc.)
      // This is complex for Facebook without official API access for general URLs.
      // For now, we'll create a basic entry and user can edit details later.
      
      // Placeholder title - ideally, try to scrape or use oEmbed if possible
      let videoTitle = `Facebook Video ${videoId}`;
      let videoDescription = originalUrl;

      const videoData: VideoCreateRequest = {
        video_id: videoId,
        title: videoTitle,
        url: originalUrl,
        source: 'facebook',
        status: 'active',
        last_synced: new Date().toISOString(),
        created_by: userId
      };

      const response = await apiClient.post<Video | ErrorResponse>('/api/videos/create', videoData);
      
      if ('error' in response) {
        console.error('[FacebookSource] API error creating video:', response.error);
        // Check if it's a conflict (duplicate)
        if (response.error.toLowerCase().includes('conflict') || 
            response.error.toLowerCase().includes('duplicate')) {
          return; // Video already exists
        }
        throw new FacebookVideoSourceError(
          response.error,
          'api_error'
        );
      }

    } catch (e: any) {
      console.error('[FacebookSource] Error importing video:', e);
      if (e instanceof FacebookVideoSourceError) throw e;
      throw new FacebookVideoSourceError(
        e.message || 'Unknown error during Facebook video import',
        'unknown'
      );
    }
  }
};

export default FacebookSource; 