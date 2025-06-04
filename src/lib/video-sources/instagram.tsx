import React, { ReactElement } from 'react';
import { VideoSource, VideoMetadata } from '@/lib/types/video-sources';

const InstagramSource: VideoSource = {
  id: 'instagram',
  name: 'Instagram',
  urlPattern: '^(https?://)?(www\\.)?instagram\\.com/(p|reel)/[^/]+/?',
  placeholderImage: '/logos/instagram.svg',

  extractVideoId: (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      // Example: https://www.instagram.com/p/ABC123xyz/
      // Example: https://www.instagram.com/reel/ABC123xyz/
      const pathParts = urlObj.pathname.split('/');
      if (pathParts.length >= 2) {
        return pathParts[2]; // The post/reel ID is the third part
      }
      return null;
    } catch (e) {
      console.error('[InstagramSource] Error extracting video ID:', e);
      return null;
    }
  },

  getVideoUrl: (videoId: string): string => {
    return `https://www.instagram.com/p/${videoId}/`;
  },

  getThumbnailUrl: (videoId: string, metadata?: any): string => {
    // Instagram doesn't provide public thumbnails, so we'll use a placeholder
    return '/logos/instagram.svg';
  },

  getPlayerComponent: (videoId: string, start?: number, end?: number): ReactElement => {
    return (
      <div className="instagram-player-placeholder">
        <p>Instagram videos cannot be embedded directly.</p>
        <p>Please visit the video at: <a href={InstagramSource.getVideoUrl(videoId)} target="_blank" rel="noopener noreferrer">Instagram Post</a></p>
      </div>
    );
  }
};

export default InstagramSource; 