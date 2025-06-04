import React, { ReactElement } from 'react';
import { VideoSource, VideoMetadata } from '@/lib/types/video-sources';

const HudlSource: VideoSource = {
  id: 'hudl',
  name: 'Hudl',
  urlPattern: '^(https?://)?(www\\.)?hudl\\.com/video/[^/]+/[^/]+/[^/]+/[^/]+$',
  placeholderImage: '/logos/hudl.svg',

  extractVideoId: (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      // Example: https://www.hudl.com/video/3/123456/5a1b2c3d4e5f6g7h8i9j0k
      const pathParts = urlObj.pathname.split('/');
      if (pathParts.length >= 6) {
        return pathParts[5]; // The video ID is the last part of the path
      }
      return null;
    } catch (e) {
      console.error('[HudlSource] Error extracting video ID:', e);
      return null;
    }
  },

  getVideoUrl: (videoId: string): string => {
    return `https://www.hudl.com/video/3/${videoId}`;
  },

  getThumbnailUrl: (videoId: string, metadata?: any): string => {
    // Hudl doesn't provide public thumbnails, so we'll use a placeholder
    return '/logos/hudl.svg';
  },

  getPlayerComponent: (videoId: string, start?: number, end?: number): ReactElement => {
    return (
      <div className="hudl-player-placeholder">
        <p>Hudl videos require authentication and cannot be embedded directly.</p>
        <p>Please visit the video at: <a href={HudlSource.getVideoUrl(videoId)} target="_blank" rel="noopener noreferrer">Hudl Video</a></p>
      </div>
    );
  }
};

export default HudlSource; 