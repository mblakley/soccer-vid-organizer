import React, { useState, useEffect, useRef } from 'react';

interface ClipPlayerProps {
  videoId: string;
  start: number;
  end: number;
  source?: string;
  onEnd?: () => void;
  nextClipInfo?: { title: string; start_time: number; end_time: number };
  navigationError?: string;
}

// Add YouTube Player state enum
const YT_PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5
} as const;

// Load YouTube IFrame API
const loadYouTubeAPI = () => {
  return new Promise<void>((resolve) => {
    if (window.YT) {
      resolve();
      return;
    }

    window.onYouTubeIframeAPIReady = () => {
      resolve();
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  });
};

export default function ClipPlayer({ videoId, start, end, source = 'youtube', url, onEnd, nextClipInfo, navigationError }: ClipPlayerProps & { url?: string }) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const playerRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const durationRef = useRef<number>(end - start);
  const isPlayingRef = useRef<boolean>(false);

  // Helper function to start the timer
  const startTimer = () => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Start the countdown timer
    timerRef.current = setInterval(() => {
      if (startTimeRef.current && isPlayingRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const remaining = Math.max(0, durationRef.current - elapsed);
        console.log('Timer tick - Elapsed:', elapsed, 'Duration:', durationRef.current, 'Remaining:', remaining);
        setSecondsLeft(remaining);
        
        if (remaining <= 0) {
          console.log('Time up, transitioning');
          setIsTransitioning(true);
          onEnd?.();
          // Don't clear the timer - let it keep running
        }
      }
    }, 1000);
  };

  // Reset state when video changes
  useEffect(() => {
    console.log('Video changed, resetting state');
    setIsTransitioning(false);
    setSecondsLeft(null);
    startTimeRef.current = null;
    durationRef.current = end - start;
    isPlayingRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [videoId, start, end]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Load YouTube API when component mounts
  useEffect(() => {
    loadYouTubeAPI();
  }, []);

  // For YouTube videos
  if (source === 'youtube') {
    const src = `https://www.youtube.com/embed/${videoId}?start=${start}&end=${end}&autoplay=1&enablejsapi=1&rel=0&modestbranding=1&controls=1&showinfo=0&iv_load_policy=3&fs=1&playsinline=1`
    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`text-lg font-bold ${isTransitioning ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
            {isTransitioning ? '⏭️ Transitioning to next clip...' : '▶️ Playing clip...'}
          </div>
          {secondsLeft !== null && secondsLeft > 0 && (
            <div className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Next clip in {secondsLeft}s
            </div>
          )}
        </div>
        <div className="aspect-video">
          <iframe 
            id={`youtube-player-${videoId}`}
            className="w-full h-full"
            src={src} 
            frameBorder="0" 
            allowFullScreen 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            onLoad={(e) => {
              console.log('iframe loaded');
              const iframe = e.target as HTMLIFrameElement;
              
              // Initialize YouTube Player API
              if (window.YT && window.YT.Player) {
                console.log('YT API available, initializing player');
                playerRef.current = new window.YT.Player(iframe.id, {
                  videoId: videoId,
                  height: '100%',
                  width: '100%',
                  playerVars: {
                    start: start,
                    end: end,
                    autoplay: 1,
                    enablejsapi: 1,
                    rel: 0,
                    modestbranding: 1,
                    controls: 1,
                    showinfo: 0,
                    iv_load_policy: 3,
                    fs: 1,
                    playsinline: 1
                  },
                  events: {
                    onReady: () => {
                      console.log('Player ready');
                      setSecondsLeft(durationRef.current);
                      // Check if video is already playing
                      if (playerRef.current.getPlayerState() === YT_PLAYER_STATE.PLAYING) {
                        console.log('Video already playing on ready');
                        isPlayingRef.current = true;
                        startTimeRef.current = Date.now();
                        startTimer();
                      }
                    },
                    onStateChange: (event: any) => {
                      console.log('Player state changed:', event.data);
                      
                      if (event.data === YT_PLAYER_STATE.PLAYING) {
                        console.log('Video started playing, starting countdown');
                        isPlayingRef.current = true;
                        startTimeRef.current = Date.now();
                        startTimer();
                      } else if (event.data === YT_PLAYER_STATE.PAUSED) {
                        console.log('Video paused');
                        isPlayingRef.current = false;
                        if (timerRef.current) {
                          clearInterval(timerRef.current);
                          timerRef.current = null;
                        }
                      } else if (event.data === YT_PLAYER_STATE.ENDED) {
                        console.log('Video ended');
                        isPlayingRef.current = false;
                        if (timerRef.current) {
                          clearInterval(timerRef.current);
                          timerRef.current = null;
                        }
                        setSecondsLeft(0);
                      }
                    }
                  }
                });
              } else {
                console.log('YT API not available');
              }
            }}
          ></iframe>
        </div>
      </div>
    )
  }
  
  // For Vimeo videos
  if (source === 'vimeo') {
    // Vimeo uses #t=[seconds] for start time
    const src = `https://player.vimeo.com/video/${videoId}#t=${start}s`
    return (
      <div className="mb-4 aspect-video">
        <iframe 
          className="w-full h-full"
          src={src} 
          frameBorder="0" 
          allowFullScreen 
          allow="autoplay; fullscreen; picture-in-picture"
        ></iframe>
      </div>
    )
  }
  
  // For Facebook videos
  if (source === 'facebook') {
    // Facebook doesn't support start/end params in the same way
    // We can pass the start time as t= parameter
    const src = `https://www.facebook.com/plugins/video.php?href=https://www.facebook.com/watch/?v=${videoId}&t=${start}`
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
    )
  }
  
  // For Instagram videos
  if (source === 'instagram') {
    // Instagram embeds don't support start/end times
    // Need to use their oEmbed format
    const src = `https://www.instagram.com/p/${videoId}/embed/`
    return (
      <div className="mb-4 overflow-hidden">
        <iframe 
          className="w-full"
          src={src} 
          frameBorder="0" 
          scrolling="no" 
          height="500"
          allowTransparency
        ></iframe>
        <div className="text-xs text-gray-500 mt-1">
          Start at {formatTime(start)} {end > 0 && `- End at ${formatTime(end)}`}
        </div>
      </div>
    )
  }
  
  // For TikTok videos
  if (source === 'tiktok') {
    // TikTok doesn't support start/end times in their embed
    return (
      <div className="mb-4">
        <blockquote 
          className="tiktok-embed" 
          cite={`https://www.tiktok.com/@user/video/${videoId}`} 
          data-video-id={videoId}
        >
          <section></section>
        </blockquote>
        <script async src="https://www.tiktok.com/embed.js"></script>
        <div className="text-xs text-gray-500 mt-1">
          Start at {formatTime(start)} {end > 0 && `- End at ${formatTime(end)}`}
        </div>
      </div>
    )
  }
  
  // Shared state for direct video sources
  const directUrl = (url as any) || (props as any).url;
  const videoRef = useRef<HTMLVideoElement>(null);

  // Seek to start time on load or when clip changes
  useEffect(() => {
    const video = videoRef.current;
    setIsTransitioning(false);
    setSecondsLeft(null);
    if (video && typeof start === 'number') {
      video.currentTime = start;
      video.play();
    }
  }, [videoId, start, directUrl]);

  // Countdown timer
  useEffect(() => {
    if (!videoRef.current || typeof end !== 'number') return;
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video) {
        const left = Math.max(0, Math.floor(end - video.currentTime));
        setSecondsLeft(left);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [end, videoId, directUrl]);

  // Listen for timeupdate to auto-advance at end
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && typeof end === 'number' && video.currentTime >= end) {
      video.pause();
      setIsTransitioning(true);
      setSecondsLeft(0);
      setTimeout(() => {
        setIsTransitioning(false);
        if (onEnd) onEnd();
      }, 1000); // Show transition message for 1s
    }
  };

  // For Veo videos
  if (source === 'veo' && directUrl) {
    return (
      <div className="mb-4 aspect-video">
        {navigationError && (
          <div className="text-red-700 bg-red-100 px-3 py-2 rounded mb-2">
            {navigationError}
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          <div className={`text-lg font-bold ${isTransitioning ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
            {isTransitioning
              ? (
                <>
                  ⏭️ Navigating to next clip...
                  {nextClipInfo && (
                    <span className="ml-2 text-sm text-blue-900 bg-blue-100 px-2 py-1 rounded">
                      Next: {nextClipInfo.title} ({nextClipInfo.start_time}–{nextClipInfo.end_time})
                    </span>
                  )}
                </>
              )
              : '▶️ Playing clip...'}
          </div>
          {secondsLeft !== null && secondsLeft > 0 && (
            <div className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Next clip in {secondsLeft}s
            </div>
          )}
        </div>
        <video
          ref={videoRef}
          controls
          autoPlay
          src={directUrl}
          className="w-full h-full"
          onTimeUpdate={handleTimeUpdate}
        />
      </div>
    );
  }
  
  // For other sources with a direct URL (e.g., custom uploads)
  if (directUrl) {
    return (
      <div className="mb-4 aspect-video">
        {navigationError && (
          <div className="text-red-700 bg-red-100 px-3 py-2 rounded mb-2">
            {navigationError}
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          <div className={`text-lg font-bold ${isTransitioning ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
            {isTransitioning
              ? (
                <>
                  ⏭️ Navigating to next clip...
                  {nextClipInfo && (
                    <span className="ml-2 text-sm text-blue-900 bg-blue-100 px-2 py-1 rounded">
                      Next: {nextClipInfo.title} ({nextClipInfo.start_time}–{nextClipInfo.end_time})
                    </span>
                  )}
                </>
              )
              : '▶️ Playing clip...'}
          </div>
          {secondsLeft !== null && secondsLeft > 0 && (
            <div className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Next clip in {secondsLeft}s
            </div>
          )}
        </div>
        <video
          ref={videoRef}
          controls
          autoPlay
          src={directUrl}
          className="w-full h-full"
          onTimeUpdate={handleTimeUpdate}
        />
      </div>
    );
  }
  
  // Default fallback for unsupported sources
  return (
    <div className="mb-4 p-4 bg-gray-200 text-center rounded">
      <p>Unable to play video from source: {source}</p>
      <p>Video ID: {videoId}</p>
      <p className="text-xs mt-2">
        Start at {formatTime(start)} {end > 0 && `- End at ${formatTime(end)}`}
      </p>
    </div>
  )
}

// Helper function to format time in MM:SS format
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}