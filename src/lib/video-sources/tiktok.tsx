import React, { useEffect } from 'react';
import { VideoSource, VideoMetadata } from './types';

const TikTokSource: VideoSource = {
  id: 'tiktok',
  name: 'TikTok',
  urlPattern: 'tiktok\\.com\\/@[\\w\\.]+\\/video\\/(\\d+)',
  
  extractVideoId(url: string): string | null {
    const match = url.match(new RegExp(this.urlPattern));
    return match ? match[1] : null;
  },
  
  getPlayerComponent(videoId: string, start: number = 0, end?: number): JSX.Element {
    // TikTok doesn't support start/end times in their embed
    // We need to use their embed script
    
    return (
      <TikTokEmbed videoId={videoId} start={start} end={end} />
    );
  },
  
  getThumbnailUrl(videoId: string, metadata?: VideoMetadata): string {
    // Use metadata thumbnail if available
    if (metadata?.thumbnailUrl) {
      return metadata.thumbnailUrl;
    }
    
    // TikTok doesn't provide a standard thumbnail URL format
    return this.placeholderImage;
  },
  
  getVideoUrl(videoId: string): string {
    // This is just a placeholder as we don't know the username
    // The actual URL needs the username
    return `https://www.tiktok.com/embed/v2/${videoId}`;
  },
  
  placeholderImage: '/images/tiktok-video.svg'
};

// TikTok requires a special embed component that loads their script
function TikTokEmbed({ videoId, start, end }: { videoId: string; start: number; end?: number }) {
  // Load TikTok embed script
  useEffect(() => {
    // Only load the script once
    if (!document.querySelector('script[src="https://www.tiktok.com/embed.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.tiktok.com/embed.js';
      script.async = true;
      document.body.appendChild(script);
      
      return () => {
        // Cleanup if component unmounts
        document.body.removeChild(script);
      };
    }
    
    // If script already exists, trigger a refresh
    if (window.tiktokEmbed) {
      window.tiktokEmbed.reload();
    }
  }, [videoId]);
  
  // Show time indicators since TikTok embed doesn't support them
  const showTimeIndicators = start > 0 || (end && end > start);
  
  return (
    <div className="mb-4">
      <blockquote 
        className="tiktok-embed" 
        cite={`https://www.tiktok.com/@/video/${videoId}`} 
        data-video-id={videoId}
      >
        <section></section>
      </blockquote>
      
      {showTimeIndicators && (
        <div className="text-xs text-gray-500 mt-1">
          Start at {formatTime(start)} {end && end > start ? `- End at ${formatTime(end)}` : ''}
        </div>
      )}
    </div>
  );
}

// Helper function to format time in MM:SS format
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Extend window interface to include TikTok embed
declare global {
  interface Window {
    tiktokEmbed?: {
      reload: () => void;
    };
  }
}

export default TikTokSource; 