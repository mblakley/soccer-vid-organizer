import { useState, useEffect, useCallback, useRef } from 'react';
import { Video } from '@/pages/videos/analyze';
import { ClipMarker } from '@/lib/types/clips';
import { VideoPlayerControls } from '@/components/VideoPlayer';
import { createClipMarkerFromData, parseLabelsFromCommentString, createLabelsCommentString } from '@/components/clips/ClipFactory';
import { apiClient } from '@/lib/api/client';
import { ErrorResponse } from '@/lib/types/auth';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

interface ClipsResponse {
  clips: any[];
}

interface CommentsResponse {
  comments: any[];
}

interface ClipResponse {
  clip: any;
}

export interface UseClipsProps {
  userId: string | undefined;
  selectedVideo: Video | null;
  playerRef: React.RefObject<VideoPlayerControls | null>;
  initialRecentLabels?: string[];
  onNotifiy: (notification: { message: string; type: 'success' | 'error' }) => void;
}

export interface UseClipsReturn {
  clipMarkers: ClipMarker[];
  loadingClips: boolean;
  isRecording: boolean;
  recordingStart: number | null;
  recordingElapsed: number;
  clipDuration: number;
  isSavingClip: boolean;
  recentLabels: string[];
  startRecording: () => void;
  stopRecording: () => { success: boolean; newClipDuration: number };
  saveClip: (clipData: { title: string; comment: string; labels: string[] }) => Promise<{ success: boolean, newClip?: ClipMarker }>;
  cancelClipCreation: () => void;
  playClip: (clip: ClipMarker) => void;
}

export const useClips = ({
  userId,
  selectedVideo,
  playerRef,
  initialRecentLabels = [],
  onNotifiy,
}: UseClipsProps): UseClipsReturn => {
  const [clipMarkers, setClipMarkers] = useState<ClipMarker[]>([]);
  const [loadingClips, setLoadingClips] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStart, setRecordingStart] = useState<number | null>(null);
  const [recentLabels, setRecentLabels] = useState<string[]>(initialRecentLabels);
  const [clipDuration, setClipDuration] = useState<number>(0);
  const [isSavingClip, setIsSavingClip] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);

  const formatTimeForTitle = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (!selectedVideo || !userId) {
      setClipMarkers([]);
      return;
    }

    const fetchClipsAndComments = async () => {
      setLoadingClips(true);
      try {
        const response = await apiClient.get<ApiResponse<ClipsResponse>>(`/api/clips/list?videoId=${selectedVideo.video_id}&recent=true&joinVideoUrl=true`);
        
        if (response.error) {
          throw new Error(response.error);
        }

        let fetchedClips: ClipMarker[] = (response.data?.clips || []).map(clip => createClipMarkerFromData(clip));

        if (fetchedClips.length > 0) {
          const clipIds = fetchedClips.map(c => c.id);
          const commentsResponse = await apiClient.get<ApiResponse<CommentsResponse>>(`/api/comments/list?clipIds=${clipIds.join(',')}`);

          if (commentsResponse.error) {
            throw new Error(commentsResponse.error);
          }

          fetchedClips = fetchedClips.map(clip => {
            const regularComments = commentsResponse.data?.comments?.filter(c => 
              c.clip_id === clip.id && (!c.comment_type || c.comment_type !== 'labels')
            ) || [];
            const labelsComment = commentsResponse.data?.comments?.find(c => 
              c.clip_id === clip.id && c.comment_type === 'labels'
            );
            
            const commentText = regularComments.map(c => c.content).join('\n');
            const labels = labelsComment ? parseLabelsFromCommentString(labelsComment.content) : [];
            
            return { ...clip, comment: commentText, labels };
          });
        }
        setClipMarkers(fetchedClips.sort((a, b) => b.startTime - a.startTime));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch clips';
        console.error('Error fetching clips or comments:', error);
        onNotifiy({ message: errorMessage, type: 'error' });
        setClipMarkers([]);
      } finally {
        setLoadingClips(false);
      }
    };

    fetchClipsAndComments();
  }, [selectedVideo, userId, onNotifiy]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRecording && recordingStart !== null && playerRef.current) {
      const videoPlayer = playerRef.current;
      timer = setInterval(() => {
        if (videoPlayer && typeof videoPlayer.getCurrentTime === 'function') {
          setRecordingElapsed(videoPlayer.getCurrentTime() - recordingStart);
        }
      }, 200);
    } else {
      setRecordingElapsed(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording, recordingStart, playerRef]);

  const startRecording = useCallback(() => {
    if (!playerRef.current) {
      onNotifiy({ message: 'Player not ready', type: 'error' });
      return;
    }
    const currentTime = playerRef.current.getCurrentTime();
    setRecordingStart(currentTime);
    setIsRecording(true);
    setClipDuration(0);
    setRecordingElapsed(0);
  }, [playerRef, onNotifiy]);

  const stopRecording = useCallback(() => {
    if (!playerRef.current || recordingStart === null) {
      return { success: false, newClipDuration: 0 };
    }
    const endTime = playerRef.current.getCurrentTime();
    const duration = endTime - recordingStart;

    if (duration < 1) {
      onNotifiy({ message: 'Clip is too short (minimum 1 second)', type: 'error' });
      setIsRecording(false);
      return { success: false, newClipDuration: 0 };
    }

    setClipDuration(duration);
    playerRef.current.pauseVideo();
    setIsRecording(false);
    return { success: true, newClipDuration: duration };
  }, [playerRef, recordingStart, onNotifiy]);

  const saveClip = useCallback(async (clipData: { title: string; comment: string; labels: string[] }) => {
    if (!selectedVideo || recordingStart === null || !playerRef.current || !userId) {
      onNotifiy({ message: 'Cannot save clip: Missing required information.', type: 'error' });
      return { success: false };
    }

    setIsSavingClip(true);
    try {
      const endTime = playerRef.current.getCurrentTime();
      
      const clipPayload = {
        title: clipData.title.trim() || `Clip at ${formatTimeForTitle(recordingStart)}`,
        video_id: selectedVideo.video_id,
        start_time: Math.floor(recordingStart),
        end_time: Math.floor(endTime),
        created_by: userId,
      };

      const response = await apiClient.post<ApiResponse<ClipResponse>>('/api/clips/create', clipPayload);
      
      if (response.error) {
        throw new Error(response.error);
      }

      const clipId = response.data?.clip.id;
      if (!clipId) {
        throw new Error('Failed to create clip: No clip ID returned');
      }

      // Save regular comment if exists
      if (clipData.comment.trim()) {
        const commentResponse = await apiClient.post<ApiResponse<void>>('/api/comments/create', {
          clip_id: clipId,
          user_id: userId,
          content: clipData.comment,
          role_visibility: 'both'
        });

        if (commentResponse.error) {
          console.warn('Failed to save comment:', commentResponse.error);
        }
      }

      // Save labels if any
      if (clipData.labels.length > 0) {
        const labelsString = createLabelsCommentString(clipData.labels);
        const labelsResponse = await apiClient.post<ApiResponse<void>>('/api/comments/create', {
          clip_id: clipId,
          content: labelsString,
          created_by: userId,
          role_visibility: 'both',
          comment_type: 'labels'
        });

        if (labelsResponse.error) {
          console.warn('Failed to save labels comment:', labelsResponse.error);
        }
        
        // Update recent labels
        const updatedRecentLabels = [...clipData.labels, ...recentLabels]
          .filter((label, index, self) => self.indexOf(label) === index)
          .slice(0, 20);
        setRecentLabels(updatedRecentLabels);
      }

      const fullyFormedClip: ClipMarker = {
        ...createClipMarkerFromData(response.data?.clip),
        comment: clipData.comment.trim(),
        labels: [...clipData.labels]
      };
      
      setClipMarkers(prev => [...prev, fullyFormedClip].sort((a, b) => b.startTime - a.startTime));
      setRecordingStart(null);
      setClipDuration(0);
      
      onNotifiy({ message: 'Clip saved successfully!', type: 'success' });
      playerRef.current?.playVideo();
      
      return { success: true, newClip: fullyFormedClip };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save clip';
      console.error('Error saving clip:', error);
      onNotifiy({ message: errorMessage, type: 'error' });
      return { success: false };
    } finally {
      setIsSavingClip(false);
    }
  }, [selectedVideo, recordingStart, userId, playerRef, recentLabels, onNotifiy, formatTimeForTitle]);

  const cancelClipCreation = useCallback(() => {
    setIsRecording(false);
    setRecordingStart(null);
    setClipDuration(0);
    setRecordingElapsed(0);
    playerRef.current?.playVideo();
  }, [playerRef]);

  const playClip = useCallback((clip: ClipMarker) => {
    if (playerRef.current) {
      playerRef.current.seekTo(clip.startTime, true);
      playerRef.current.playVideo();
    }
  }, [playerRef]);

  return {
    clipMarkers,
    loadingClips,
    isRecording,
    recordingStart,
    recordingElapsed,
    clipDuration,
    isSavingClip,
    recentLabels,
    startRecording,
    stopRecording,
    saveClip,
    cancelClipCreation,
    playClip,
  };
}; 