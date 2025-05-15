import React from 'react';
import { VideoSource, VideoMetadata } from './types';
import { supabase } from '@/lib/supabaseClient';

const FacebookSource: VideoSource = {
  id: 'facebook',
  name: 'Facebook',
  urlPattern: 'facebook\.com/share/v/([\w\d]+)',
  
  extractVideoId(url: string): string | null {
    const match = url.match(/facebook\.com\/share\/v\/([\w\d]+)/);
    return match ? match[1] : null;
  },
  
  getPlayerComponent(videoId: string, start: number = 0): React.ReactElement {
    // Facebook doesn't support end time, only start time via t= parameter
    const videoUrl = `https://www.facebook.com/share/v/${videoId}/`;
    const src = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoUrl)}&t=${start}`;
    
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
    return `https://www.facebook.com/share/v/${videoId}/`;
  },
  
  placeholderImage: '/images/facebook-video.svg',

  async importSingleVideo(videoId: string, originalUrl: string, userId: string) {
    await supabase.from('videos').insert({
      title: `Facebook Video ${videoId}`,
      video_id: videoId,
      source: 'facebook',
      url: originalUrl,
      status: 'active',
      last_synced: new Date().toISOString(),
      created_by: userId,
    });
  }
};

export default FacebookSource; 