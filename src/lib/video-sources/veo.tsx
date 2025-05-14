import React from 'react';
import { VideoSource, VideoMetadata } from './types';
import { supabase } from '@/lib/supabaseClient';

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
  
  placeholderImage: '/images/veo-video.svg',

  async importSingleVideo(videoId: string, originalUrl: string, userId: string, apiToken?: string) {
    // Get auth token from Supabase
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Check if video already exists
    const { data: existingVideo } = await supabase
      .from('videos')
      .select('id')
      .eq('video_id', videoId)
      .eq('source', 'veo')
      .single();
    
    // Use the passed apiToken parameter
    if (!apiToken) {
      throw new Error('Veo API token not provided');
    }

    try {
      // Fetch recording details from Veo API /recordings/{videoId}
      const response = await fetch(`https://api.veo.co/recordings/${videoId}`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recording details from Veo API');
      }

      const recordingData = await response.json();
      console.log('Veo recordingData:', recordingData);
      const streamUrl = recordingData.followcam?.links?.find(l => l.rel === 'stream' && l.type === 'video/mp4')?.href;
      console.log('Direct streamUrl:', streamUrl);

      if (!streamUrl) {
        throw new Error('No direct .mp4 stream link found for this Veo recording.');
      }

      if (existingVideo) {
        // Update the url and metadata for the existing video
        await supabase.from('videos').update({
          url: streamUrl,
          metadata: {
            recordingId: videoId,
            thumbnailUrl: recordingData.thumbnails?.[0]?.href || this.placeholderImage,
            embedUrl: `https://app.veo.co/embed/matches/${videoId}/`,
            timeline: recordingData.timeline,
            clubs: recordingData.clubs,
            matches: recordingData.matches,
            status: recordingData.status
          },
          last_synced: new Date().toISOString()
        }).eq('id', existingVideo.id);
        return { status: 'updated', videoId };
      }

      // Save video to database with recording details
      const { error: dbError } = await supabase.from('videos').insert({
        title: recordingData.title || `Veo Recording ${videoId}`,
        url: streamUrl,
        video_id: videoId,
        source: 'veo',
        metadata: {
          recordingId: videoId,
          thumbnailUrl: recordingData.thumbnails?.[0]?.href || this.placeholderImage,
          embedUrl: `https://app.veo.co/embed/matches/${videoId}/`,
          timeline: recordingData.timeline,
          clubs: recordingData.clubs,
          matches: recordingData.matches,
          status: recordingData.status
        },
        status: 'active',
        last_synced: new Date().toISOString(),
        created_by: userId
      });

      if (dbError) throw dbError;
    } catch (error) {
      console.error('Error importing Veo video:', error);
      // Fallback to basic import if API call fails
      const { error: dbError } = await supabase.from('videos').insert({
        title: `Veo Match ${videoId}`,
        url: originalUrl,
        video_id: videoId,
        source: 'veo',
        metadata: {
          matchId: videoId,
          thumbnailUrl: this.placeholderImage,
          embedUrl: `https://app.veo.co/embed/matches/${videoId}/`
        },
        status: 'active',
        last_synced: new Date().toISOString(),
        created_by: userId
      });

      if (dbError) throw dbError;
    }
  }
};

export default VeoSource; 