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
      } else {
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
      }

      // After inserting/updating the video, import Veo clips using the global /clips endpoint
      try {
        let nextPageToken: string | undefined = undefined;
        do {
          const url = new URL('https://api.veo.co/clips');
          url.searchParams.set('recording', videoId);
          url.searchParams.set('page_size', '20');
          if (nextPageToken) url.searchParams.set('page_token', nextPageToken);

          const clipsRes = await fetch(url.toString(), {
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Accept': 'application/json'
            }
          });

          if (clipsRes.ok) {
            const clipsData = await clipsRes.json();
            if (Array.isArray(clipsData.items)) {
              const recordingStart = recordingData.timeline?.start ? new Date(recordingData.timeline.start).getTime() / 1000 : 0;
              for (const clip of clipsData.items) {
                // Calculate start and end times relative to recording start
                const clipStart = clip.timeline?.start ? new Date(clip.timeline.start).getTime() / 1000 : 0;
                const clipEnd = clip.timeline?.end ? new Date(clip.timeline.end).getTime() / 1000 : clipStart + 10;
                const start_time = Math.max(0, Math.floor(clipStart - recordingStart));
                const end_time = Math.max(start_time, Math.floor(clipEnd - recordingStart));

                // Debug log for start_time and end_time
                console.log('[DEBUG] start_time:', start_time, typeof start_time, 'end_time:', end_time, typeof end_time);
                if (
                  typeof start_time !== 'number' || isNaN(start_time) ||
                  typeof end_time !== 'number' || isNaN(end_time)
                ) {
                  console.error('[ERROR] Invalid start_time or end_time:', start_time, end_time);
                  continue; // Skip this clip
                }

                const title = clip.title || clip.type || 'Veo Clip';
                const comment = clip.description || '';
                
                // Log the raw Veo API clip data
                console.log('[VEO IMPORT] Raw Veo API clip data:', clip);
                const dbClipData = {
                  title,
                  video_id: videoId,
                  start_time,
                  end_time,
                  created_by: userId
                };
                // Log the DB data we're trying to insert/update
                console.log('[VEO IMPORT] DB clip data to insert/update:', dbClipData);

                // Debug log before select
                console.log('[DEBUG] SELECT for video_id:', videoId, 'start_time:', start_time, 'end_time:', end_time);
                // Check if this clip already exists by matching video_id, start_time, and end_time
                const { data: existingClip, error: selectError } = await supabase
                  .from('clips')
                  .select('id')
                  .eq('video_id', videoId)
                  .eq('start_time', start_time)
                  .eq('end_time', end_time)
                  .single();

                if (selectError && selectError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                  console.error('[VEO IMPORT] Supabase select error for clip:', selectError);
                }

                if (existingClip) {
                  // Update the existing clip
                  const { error: updateError } = await supabase.from('clips').update({
                    title,
                    start_time,
                    end_time
                  }).eq('id', existingClip.id);
                  if (updateError) {
                    console.error('[VEO IMPORT] Supabase update error for clip:', updateError);
                    console.log('[VEO IMPORT] FAILURE updating clip:', dbClipData);
                  } else {
                    console.log('[VEO IMPORT] SUCCESS updating existing clip:', dbClipData);
                  }
                  // Optionally, update the comment in the comments table if needed
                } else {
                  // Insert new clip
                  const { data: insertedClip, error: insertError } = await supabase.from('clips').insert(dbClipData).select('id').single();
                  if (insertError) {
                    console.error('[VEO IMPORT] Supabase insert error for clip:', insertError);
                    console.log('[VEO IMPORT] FAILURE inserting clip:', dbClipData);
                  } else {
                    console.log('[VEO IMPORT] SUCCESS inserting new clip:', dbClipData);
                  }
                  if (comment && insertedClip?.id) {
                    // Insert the comment into the comments table
                    const { error: commentError } = await supabase.from('comments').insert({
                      clip_id: insertedClip.id,
                      user_id: userId,
                      content: comment,
                      role_visibility: 'both'
                    });
                    if (commentError) {
                      console.error('[VEO IMPORT] Supabase insert error for comment:', commentError);
                    } else {
                      console.log('[VEO IMPORT] SUCCESS inserting comment for clip:', insertedClip.id);
                    }
                  }
                }
              }
            }
            nextPageToken = clipsData.next_page_token;
          } else {
            break;
          }
        } while (nextPageToken);
      } catch (err) {
        console.error('Error importing Veo clips:', err);
      }
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