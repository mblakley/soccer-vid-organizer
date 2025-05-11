import React from 'react';
import { VideoSource, VideoMetadata } from './types';

const FacebookSource: VideoSource = {
  id: 'facebook',
  name: 'Facebook',
  urlPattern: '(?:facebook\\.com\\/watch\\/?\\?v=(\\d+)|facebook\\.com\\/\\w+\\/videos\\/(\\d+)|fb\\.watch\\/([^\\/]+))',
  
  extractVideoId(url: string): string | null {
    const match = url.match(new RegExp(this.urlPattern));
    if (!match) return null;
    // Return the first non-undefined group (there are multiple capture patterns)
    return match[1] || match[2] || match[3] || null;
  },
  
  getPlayerComponent(videoId: string, start: number = 0): JSX.Element {
    // Facebook doesn't support end time, only start time via t= parameter
    const src = `https://www.facebook.com/plugins/video.php?href=https://www.facebook.com/watch/?v=${videoId}&t=${start}`;
    
    return (
      <div className="mb-4 aspect-video">
        <iframe 
          className="w-full h-full"
          src={src} 
          frameBorder="0" 
          allowFullScreen 
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          scrolling="no"
        ></iframe>
      </div>
    );
  },
  
  getThumbnailUrl(videoId: string, metadata?: VideoMetadata): string {
    // Use metadata thumbnail if available
    if (metadata?.thumbnailUrl) {
      return metadata.thumbnailUrl;
    }
    
    // Facebook doesn't provide a standard thumbnail URL format
    // Fall back to the placeholder
    return this.placeholderImage;
  },
  
  getVideoUrl(videoId: string): string {
    return `https://www.facebook.com/watch/?v=${videoId}`;
  },
  
  placeholderImage: '/images/facebook-video.svg'
};

export default FacebookSource; 