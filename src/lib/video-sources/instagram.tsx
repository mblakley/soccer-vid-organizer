import React, { ReactElement } from 'react';
import { VideoSource, VideoMetadata } from './types';

const InstagramSource: VideoSource = {
  id: 'instagram',
  name: 'Instagram',
  urlPattern: 'instagram\\.com\\/(?:p|reel)\\/([^\\/]+)',
  
  extractVideoId(url: string): string | null {
    const match = url.match(new RegExp(this.urlPattern));
    return match ? match[1] : null;
  },
  
  getPlayerComponent(videoId: string, start: number = 0, end?: number): ReactElement {
    // Instagram embeds don't support start/end times
    const src = `https://www.instagram.com/p/${videoId}/embed/`;
    
    // Show time indicators since native controls don't support it
    const showTimeIndicators = start > 0 || (end && end > start);
    
    return (
      <div className="mb-4 overflow-hidden">
        <iframe 
          className="w-full"
          src={src} 
          frameBorder="0" 
          scrolling="no" 
          height="500"
          allowTransparency
        ></iframe>
        {showTimeIndicators && (
          <div className="text-xs text-gray-500 mt-1">
            Start at {formatTime(start)} {end && end > start ? `- End at ${formatTime(end)}` : ''}
          </div>
        )}
      </div>
    );
  },
  
  getThumbnailUrl(videoId: string, metadata?: VideoMetadata): string {
    // Use metadata thumbnail if available
    if (metadata?.thumbnailUrl) {
      return metadata.thumbnailUrl;
    }
    
    // Instagram doesn't provide a standard thumbnail URL format
    return this.placeholderImage;
  },
  
  getVideoUrl(videoId: string): string {
    return `https://www.instagram.com/p/${videoId}/`;
  },
  
  placeholderImage: '/images/instagram-video.svg'
};

// Helper function to format time in MM:SS format
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export default InstagramSource; 