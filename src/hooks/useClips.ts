import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Video } from '@/pages/videos/analyze';
import { ClipMarker } from '@/types/clips';
import { VideoPlayerControls } from '@/components/VideoPlayer';
import { createClipMarkerFromData, parseLabelsFromCommentString, createLabelsCommentString } from '@/components/clips/ClipFactory';

export interface UseClipsProps {
  supabase: SupabaseClient;
  userId: string | undefined;
  selectedVideo: Video | null;
  playerRef: React.RefObject<VideoPlayerControls | null>;
  initialRecentLabels?: string[];
  onNotifiy: (notification: { message: string; type: 'success' | 'error' }) => void;
  // formatTime is used by the consumer, not directly by this hook for display purposes
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
  stopRecording: () => { success: boolean; newClipDuration: number }; // Returns success and duration for UI update
  saveClip: (clipData: { title: string; comment: string; labels: string[] }) => Promise<{ success: boolean, newClip?: ClipMarker }>;
  cancelClipCreation: () => void;
  playClip: (clip: ClipMarker) => void;
  // addLabelToRecent: (label: string) => void; // If needed
}

export const useClips = ({
  supabase,
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

  const formatTimeForTitle = useCallback((seconds: number) => { // Internal helper for default titles
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Fetch clips and their comments
  useEffect(() => {
    if (!selectedVideo || !userId) {
      setClipMarkers([]);
      return;
    }

    const fetchClipsAndComments = async () => {
      setLoadingClips(true);
      try {
        const { data: clipsData, error: clipsError } = await supabase
          .from('clips')
          .select('*')
          .eq('video_id', selectedVideo.video_id)
          .order('created_at', { ascending: false });

        if (clipsError) throw clipsError;

        let fetchedClips: ClipMarker[] = (clipsData || []).map(clip => createClipMarkerFromData(clip));

        if (fetchedClips.length > 0) {
          const clipIds = fetchedClips.map(c => c.id);
          const { data: commentsData, error: commentsError } = await supabase
            .from('comments')
            .select('*')
            .in('clip_id', clipIds);

          if (commentsError) throw commentsError;

          fetchedClips = fetchedClips.map(clip => {
            const regularComments = commentsData?.filter(c => 
              c.clip_id === clip.id && (!c.comment_type || c.comment_type !== 'labels')
            ) || [];
            const labelsComment = commentsData?.find(c => 
              c.clip_id === clip.id && c.comment_type === 'labels'
            );
            
            const commentText = regularComments.map(c => c.content).join('\n');
            const labels = labelsComment ? parseLabelsFromCommentString(labelsComment.content) : [];
            
            return { ...clip, comment: commentText, labels };
          });
        }
        setClipMarkers(fetchedClips.sort((a, b) => b.startTime - a.startTime));
      } catch (error: any) {
        console.error('Error fetching clips or comments:', error);
        onNotifiy({ message: 'Error fetching clips: ' + error.message, type: 'error' });
        setClipMarkers([]);
      } finally {
        setLoadingClips(false);
      }
    };

    fetchClipsAndComments();
  }, [selectedVideo, userId, supabase, onNotifiy]);

  // Recording elapsed time effect
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
    setClipDuration(0); // Reset duration
    setRecordingElapsed(0); // Reset elapsed
  }, [playerRef, onNotifiy]);

  const stopRecording = useCallback(() => {
    if (!playerRef.current || recordingStart === null) {
        return { success: false, newClipDuration: 0 };
    }
    const endTime = playerRef.current.getCurrentTime();
    const duration = endTime - recordingStart;

    if (duration < 1) {
      onNotifiy({ message: 'Clip is too short (minimum 1 second)', type: 'error' });
      setIsRecording(false); // Still stop recording mode
      // setRecordingStart(null); // Keep recordingStart to allow re-attempt from create clip form, or clear it if preferred
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
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error(sessionError?.message || 'No active session');
      }
      const session = sessionData.session;

      const clipPayload = {
        title: clipData.title.trim() || `Clip at ${formatTimeForTitle(recordingStart)}`,
        video_id: selectedVideo.video_id,
        start_time: Math.floor(recordingStart),
        end_time: Math.floor(endTime),
        created_by: userId,
        // source: selectedVideo.source, // Removed as 'source' column doesn't exist on 'clips' table as per error
      };

      const { data: newClipData, error: clipError } = await supabase
        .from('clips')
        .insert(clipPayload)
        .select()
        .single();

      if (clipError || !newClipData) {
        throw new Error(clipError?.message || 'Failed to create clip in database');
      }

      const clipId = newClipData.id;

      if (clipData.comment.trim()) {
        const { error: commentError } = await supabase.from('comments').insert({
          clip_id: clipId, user_id: userId, content: clipData.comment, role_visibility: 'both'
        });
        if (commentError) console.warn('Failed to save comment:', commentError.message);
      }

      if (clipData.labels.length > 0) {
        const labelsString = createLabelsCommentString(clipData.labels);
        const { error: labelsCommentError } = await supabase.from('comments').insert({
          clip_id: clipId, content: labelsString, created_by: userId, role_visibility: 'both', comment_type: 'labels'
        });
        if (labelsCommentError) console.warn('Failed to save labels comment:', labelsCommentError.message);
        
        const updatedRecentLabels = [...clipData.labels, ...recentLabels]
          .filter((label, index, self) => self.indexOf(label) === index)
          .slice(0, 20);
        setRecentLabels(updatedRecentLabels);
      }

      const fullyFormedClip: ClipMarker = {
        ...createClipMarkerFromData(newClipData),
        comment: clipData.comment.trim(),
        labels: [...clipData.labels]
      };
      
      setClipMarkers(prev => [...prev, fullyFormedClip].sort((a, b) => b.startTime - a.startTime));
      
      setRecordingStart(null);
      setClipDuration(0);
      onNotifiy({ message: 'Clip saved successfully!', type: 'success' });
      playerRef.current?.playVideo();
      return { success: true, newClip: fullyFormedClip };
    } catch (err: any) {
      console.error('Error saving clip:', err);
      onNotifiy({ message: err.message || 'Error saving clip', type: 'error' });
      return { success: false };
    } finally {
      setIsSavingClip(false);
    }
  }, [selectedVideo, recordingStart, userId, supabase, playerRef, recentLabels, onNotifiy, formatTimeForTitle]);

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