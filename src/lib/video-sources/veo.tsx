import React, { ReactElement } from 'react';
import { VideoSource, VideoMetadata } from '@/lib/types/video-sources';
import { apiClient } from '@/lib/api/client';
import type { VideoCreateRequest, ListVideosApiResponse } from '@/lib/types/videos';
import type { ClipResponse, ClipsResponse } from '@/lib/types/clips';
import type { CreateClipApiResponse } from '@/lib/types/clips';
import type { CommentApiResponse } from '@/lib/types/comments';

const VeoSource: VideoSource = {
  id: 'veo',
  name: 'Veo',
  urlPattern: 'veo\\.co\\/matches\\/([-\\w]+)',
  
  extractVideoId(url: string): string | null {
    const match = url.match(new RegExp(this.urlPattern));
    return match ? match[1] : null;
  },
  
  getPlayerComponent(videoId: string, start: number = 0, end?: number): ReactElement {
    // Try to get the direct video URL from the metadata (if available)
    // In this context, we don't have metadata, so just show a message to use the main app UI
    return (
      <div className="mb-4 p-4 bg-gray-200 text-center rounded">
        <p>Direct video playback is only supported via the main app UI.</p>
        <p className="text-xs mt-2">Video ID: {videoId}</p>
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
    // Check if video already exists
    const response = await apiClient.get<ListVideosApiResponse>(`/api/videos?video_id=${videoId}&source=veo`);
    const existingVideo = 'videos' in response ? response.videos[0] : null;
    
    // Use the passed apiToken parameter
    if (!apiToken) {
      throw new Error('Veo API token not provided');
    }

    try {
      // Fetch recording details from Veo API /recordings/{videoId}
      const recordingResponse = await fetch(`https://api.veo.co/recordings/${videoId}`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        }
      });

      if (!recordingResponse.ok) {
        throw new Error('Failed to fetch recording details from Veo API');
      }

      const recordingData = await recordingResponse.json();
      console.log('Veo recordingData:', recordingData);
      const streamUrl = recordingData.followcam?.links?.find((l: any) => l.rel === 'stream' && l.type === 'video/mp4')?.href;
      console.log('Direct streamUrl:', streamUrl);
      // Calculate duration from timeline start and end
      const timelineStart = recordingData.timeline?.start ? new Date(recordingData.timeline.start).getTime() : null;
      const timelineEnd = recordingData.timeline?.end ? new Date(recordingData.timeline.end).getTime() : null;
      const duration = (timelineStart && timelineEnd) ? Math.round((timelineEnd - timelineStart) / 1000) : null;

      if (!streamUrl) {
        throw new Error('No direct .mp4 stream link found for this Veo recording.');
      }

      if (existingVideo) {
        // Update the url and metadata for the existing video
        const updateData = {
          url: streamUrl,
          duration,
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
        };
        console.log('[VEO IMPORT] Updating video with:', updateData);
        await apiClient.post('/api/videos/update', { id: existingVideo.id, ...updateData });
      } else {
        // Save video to database with recording details
        const insertData = {
          title: recordingData.title || `Veo Recording ${videoId}`,
          url: streamUrl,
          duration,
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
        };
        console.log('[VEO IMPORT] Inserting video with:', insertData);
        await apiClient.post('/api/videos', insertData);
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
                const { data: existingClip, error: selectError } = await apiClient.get<ClipsResponse>(`/api/clips?video_id=${videoId}&start_time=${start_time}&end_time=${end_time}`);

                if (selectError) {
                  console.error('[VEO IMPORT] Supabase select error for clip:', selectError);
                }

                if (existingClip) {
                  // Update the existing clip
                  const { error: updateError } = await apiClient.post<ClipResponse>('/api/clips/update', {
                    id: existingClip?.clips[0]?.id,
                    title,
                    start_time,
                    end_time
                  });
                  if (updateError) {
                    console.error('[VEO IMPORT] Supabase update error for clip:', updateError);
                    console.log('[VEO IMPORT] FAILURE updating clip:', dbClipData);
                  } else {
                    console.log('[VEO IMPORT] SUCCESS updating existing clip:', dbClipData);
                  }
                  // Optionally, update the comment in the comments table if needed
                } else {
                  // Insert new clip
                  const response = await apiClient.post<CreateClipApiResponse>('/api/clips', dbClipData);
                  if ('error' in response) {
                    console.error('[VEO IMPORT] Supabase insert error for clip:', response.error);
                    console.log('[VEO IMPORT] FAILURE inserting clip:', dbClipData);
                  } else if ('clip' in response) {
                    console.log('[VEO IMPORT] SUCCESS inserting new clip:', dbClipData);
                    if (comment && response.clip.id) {
                      // Insert the comment into the comments table
                      const commentResponse = await apiClient.post<CommentApiResponse>('/api/comments', {
                        clip_id: response.clip.id,
                        content: comment,
                        created_by: userId
                      });
                      
                      if ('error' in commentResponse) {
                        console.error('[VEO IMPORT] Error inserting comment:', commentResponse.error);
                      } else {
                        console.log('[VEO IMPORT] SUCCESS inserting comment for clip:', response.clip.id);
                      }
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
      const response = await apiClient.post<ListVideosApiResponse>('/api/videos', {
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
      } as VideoCreateRequest);

      if ('error' in response) throw new Error(response.error);
    }
  }
};

export default VeoSource; 