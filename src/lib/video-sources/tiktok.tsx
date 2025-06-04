import React, { ReactElement, useEffect } from 'react';
import { VideoSource, VideoMetadata } from '@/lib/types/video-sources';

const TikTokSource: VideoSource = {
  id: 'tiktok',
  name: 'TikTok',
  urlPattern: '^(https?://)?(www\\.)?(tiktok\\.com|vm\\.tiktok\\.com)/[^/]+/[^/]+/?',
  placeholderImage: '/logos/tiktok.svg',

  extractVideoId: (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      // Example: https://www.tiktok.com/@username/video/1234567890123456789
      const pathParts = urlObj.pathname.split('/');
      if (pathParts.length >= 3 && pathParts[2] === 'video') {
        return pathParts[3]; // The video ID is the fourth part
      }
      return null;
    } catch (e) {
      console.error('[TikTokSource] Error extracting video ID:', e);
      return null;
    }
  },

  getVideoUrl: (videoId: string): string => {
    return `https://www.tiktok.com/@tiktok/video/${videoId}`;
  },

  getThumbnailUrl: (videoId: string, metadata?: any): string => {
    // TikTok doesn't provide public thumbnails, so we'll use a placeholder
    return '/logos/tiktok.svg';
  },

  getPlayerComponent: (videoId: string, start?: number, end?: number): ReactElement => {
    return (
      <div className="tiktok-player-placeholder">
        <p>TikTok videos cannot be embedded directly.</p>
        <p>Please visit the video at: <a href={TikTokSource.getVideoUrl(videoId)} target="_blank" rel="noopener noreferrer">TikTok Video</a></p>
      </div>
    );
  }
};

export default TikTokSource; 