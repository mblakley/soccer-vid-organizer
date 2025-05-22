import React, { ReactElement } from 'react';
import { VideoSource, VideoMetadata } from './types';

const HudlSource: VideoSource = {
  id: 'hudl',
  name: 'Hudl',
  urlPattern: 'hudl\\.com\\/video\\/(\\d+)',
  
  extractVideoId(url: string): string | null {
    const match = url.match(new RegExp(this.urlPattern));
    return match ? match[1] : null;
  },
  
  getPlayerComponent(videoId: string, start: number = 0, end?: number): ReactElement {
    // Hudl embed doesn't directly support start/end in the iframe URL
    const src = `https://www.hudl.com/embed/video/${videoId}`;
    
    // Show time indicators since Hudl embed doesn't support them in the URL
    const showTimeIndicators = start > 0 || (end && end > start);
    
    return (
      <div className="mb-4 aspect-video">
        <iframe 
          className="w-full h-full"
          src={src} 
          frameBorder="0" 
          allowFullScreen
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
    
    // Hudl doesn't provide a standard thumbnail URL format
    return this.placeholderImage;
  },
  
  getVideoUrl(videoId: string): string {
    return `https://www.hudl.com/video/${videoId}`;
  },
  
  placeholderImage: '/images/hudl-video.svg'
};

// Helper function to format time in MM:SS format
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export default HudlSource; 