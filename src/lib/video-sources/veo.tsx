import React from 'react';
import { VideoSource, VideoMetadata } from './types';

const VeoSource: VideoSource = {
  id: 'veo',
  name: 'Veo',
  urlPattern: 'veo\\.co\\/matches\\/([-\\w]+)',
  
  extractVideoId(url: string): string | null {
    const match = url.match(new RegExp(this.urlPattern));
    return match ? match[1] : null;
  },
  
  getPlayerComponent(videoId: string, start: number = 0): JSX.Element {
    // Veo supports start parameter as seconds
    const src = `https://app.veo.co/embed/matches/${videoId}/?utm_source=embed&start=${start}`;
    
    return (
      <div className="mb-4 aspect-video">
        <iframe 
          className="w-full h-full"
          src={src} 
          frameBorder="0" 
          allowFullScreen
        ></iframe>
      </div>
    );
  },
  
  getThumbnailUrl(videoId: string, metadata?: VideoMetadata): string {
    // Use metadata thumbnail if available
    if (metadata?.thumbnailUrl) {
      return metadata.thumbnailUrl;
    }
    
    // Veo doesn't provide a standard thumbnail URL format
    return this.placeholderImage;
  },
  
  getVideoUrl(videoId: string): string {
    return `https://app.veo.co/matches/${videoId}/`;
  },
  
  placeholderImage: '/images/veo-video.svg'
};

export default VeoSource; 