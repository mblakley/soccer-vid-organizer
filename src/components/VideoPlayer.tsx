'use client'
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

// Add Veo player interface from analyze-video.tsx - This will be removed as Veo will use HTML5 video directly
// interface VeoPlayer {
//   getCurrentTime: () => number;
//   seekTo: (seconds: number) => void;
//   playVideo: () => void;
//   pauseVideo: () => void;
//   getPlayerState: () => number;
// }

// Video interface from analyze-video.tsx
interface Video {
  id: string;
  video_id: string;
  title: string;
  source: string;
  duration?: number;
  url?: string;
}

export interface VideoPlayerControls {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getPlayerState: () => number | string; // YouTube uses number, Veo string
}

interface VideoPlayerProps {
  video: Video | null;
  onPlayerReady?: () => void;
  onTimeUpdate?: (time: number) => void;
  onStateChange?: (state: 'playing' | 'paused' | 'ended' | 'buffering' | 'cued') => void;
  onPlay?: () => void;
  onPause?: () => void;
  onError?: (error: any) => void;
  width?: string;
  height?: string;
  className?: string;
}

const VideoPlayer = forwardRef<VideoPlayerControls, VideoPlayerProps>(
  ({ video, onPlayerReady, onTimeUpdate, onStateChange, onPlay, onPause, onError, width = '100%', height = '100%', className = '' }, ref) => {
    const playerContainerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<any>(null) // Stores the actual player instance (YT, Veo, FB)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const videoIdRef = useRef<string | null>(null) // Keep track of the current video ID to prevent unnecessary reinitializations
    const [currentPlayerState, setCurrentPlayerState] = useState<'playing' | 'paused'>('paused');
    // Add a flag to track if the player is ready
    const [isPlayerReady, setIsPlayerReady] = useState(false);

    useImperativeHandle(ref, () => ({
      playVideo: () => {
        console.log("playVideo called, player ready:", isPlayerReady, "player ref:", !!playerRef.current);
        if (!playerRef.current || !isPlayerReady) return;
        
        try {
          if (video?.source === 'youtube' && playerRef.current.playVideo) {
            // Check current player state before playing
            const playerState = playerRef.current.getPlayerState();
            console.log("YouTube player state before play:", playerState);
            
            // If the video is already playing or buffering, don't try to play again
            if (playerState !== 1 && playerState !== 3) { // 1=playing, 3=buffering
              playerRef.current.playVideo();
              
              // Immediately trigger play event if not triggered by YouTube
              setTimeout(() => {
                const newState = playerRef.current.getPlayerState();
                if (newState === 1) { // Playing
                  setCurrentPlayerState('playing');
                  onStateChange?.('playing');
                  onPlay?.();
                }
              }, 100);
            }
          } else if ((video?.source === 'veo' || video?.source === 'facebook') && playerRef.current.playVideo) {
            playerRef.current.playVideo();
          }
        } catch (err) {
          console.error("Error playing video:", err);
        }
      },
      pauseVideo: () => {
        if (!playerRef.current || !isPlayerReady) return;
        
        try {
          if (video?.source === 'youtube' && playerRef.current.pauseVideo) {
            playerRef.current.pauseVideo();
          } else if ((video?.source === 'veo' || video?.source === 'facebook') && playerRef.current.pauseVideo) {
            playerRef.current.pauseVideo();
          }
        } catch (err) {
          console.error("Error pausing video:", err);
        }
      },
      seekTo: (seconds: number, allowSeekAhead?: boolean) => {
        if (!playerRef.current || !isPlayerReady) return;
        
        try {
          if (video?.source === 'youtube' && playerRef.current.seekTo) {
            playerRef.current.seekTo(seconds, allowSeekAhead);
          } else if ((video?.source === 'veo' || video?.source === 'facebook') && playerRef.current.seekTo) {
            playerRef.current.seekTo(seconds);
          }
        } catch (err) {
          console.error("Error seeking video:", err);
        }
      },
      getCurrentTime: (): number => {
        if (!playerRef.current || !isPlayerReady) return 0;
        
        try {
          if (video?.source === 'youtube' && typeof playerRef.current.getCurrentTime === 'function') {
            return playerRef.current.getCurrentTime();
          } else if ((video?.source === 'veo' || video?.source === 'facebook') && typeof playerRef.current.getCurrentTime === 'function') {
            return playerRef.current.getCurrentTime();
          }
        } catch (err) {
          console.error("Error getting current time:", err);
        }
        return 0;
      },
      getPlayerState: (): number | string => {
        if (!playerRef.current || !isPlayerReady) return video?.source === 'youtube' ? -1 : 'unknown';
        
        try {
          if (video?.source === 'youtube' && typeof playerRef.current.getPlayerState === 'function') {
            return playerRef.current.getPlayerState();
          } else if ((video?.source === 'veo' || video?.source === 'facebook') && typeof playerRef.current.getPlayerState === 'function') {
            // Veo/FB uses our internal string state, convert to a comparable value if needed or return string
            return playerRef.current.getPlayerState(); // This was returning our string state
          }
        } catch (err) {
          console.error("Error getting player state:", err);
        }
        return video?.source === 'youtube' ? -1 : 'unknown'; // YT default state, string for others
      },
    }), [video?.source, isPlayerReady]);

    useEffect(() => {
      // Cleanup on component unmount or when video changes
      return () => {
        console.log("Cleaning up video player");
        setIsPlayerReady(false);
        videoIdRef.current = null;
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        // Only attempt to destroy if playerRef.current exists
        if (playerRef.current) {
          try {
            if (video?.source === 'youtube' && typeof playerRef.current.destroy === 'function') {
              playerRef.current.destroy();
            } else if (video?.source === 'veo' && playerContainerRef.current) {
              // Clean up Veo HTML5 video element
              const videoEl = playerContainerRef.current.querySelector('video');
              if (videoEl) {
                videoEl.pause();
                videoEl.removeAttribute('src');
                videoEl.load();
              }
            }
          } catch (err) {
            console.error("Error destroying player:", err);
          }
          
          playerRef.current = null;
        }
        
        if (playerContainerRef.current) {
          playerContainerRef.current.innerHTML = ''; // Clear previous player
        }
      };
    }, [video?.id]); // Added video.id to ensure cleanup when video truly changes

    useEffect(() => {
      console.log("Video effect triggered", video?.id);
      
      // Skip reinitialization if we're already initialized for this video
      if (isPlayerReady && playerRef.current && video?.id === videoIdRef.current) {
        console.log("Player already initialized for this video, skipping");
        return;
      }
      
      setIsPlayerReady(false);
      
      if (!video) {
        if (playerContainerRef.current) playerContainerRef.current.innerHTML = ''; // Clear player if no video
        return;
      }

      // Store current video ID to track changes
      videoIdRef.current = video.id;

      // Check if video source is supported
      if (
        video.source !== 'youtube' &&
        video.source !== 'veo' &&
        video.source !== 'facebook'
      ) {
        onError?.({ message: 'Unsupported video source' });
        if (playerContainerRef.current) playerContainerRef.current.innerHTML = '';
        return;
      }

      let messageHandler: ((event: MessageEvent) => void) | null = null;
      let iframeElement: HTMLIFrameElement | null = null;

      const initializePlayer = () => {
        console.log("Initializing player for", video.source);
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null; // Clear ref too
        }
        
        if (playerContainerRef.current) {
          playerContainerRef.current.innerHTML = ''; // Ensure container is clear
        }

        if (video.source === 'youtube') {
          if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
            if (playerContainerRef.current) {
              console.log("Creating YouTube player for video ID:", video.video_id);
              
              const playerDiv = document.createElement('div');
              playerDiv.id = `youtube-player-${Math.random().toString(36).substring(7)}`; // Unique ID for multiple players
              playerContainerRef.current.appendChild(playerDiv);

              try {
                playerRef.current = new window.YT.Player(playerDiv.id, {
                  videoId: video.video_id,
                  height: '100%',
                  width: '100%',
                  playerVars: {
                    autoplay: 0,
                    controls: 1,
                    modestbranding: 1,
                    rel: 0,
                    playsinline: 1, // Important for mobile
                    iv_load_policy: 3, // Disable annotations
                    disablekb: 0, // Enable keyboard controls
                    fs: 1, // Allow fullscreen
                    origin: window.location.origin, // Set correct origin
                  },
                  events: {
                    onReady: () => {
                      console.log("YouTube player ready");
                      setIsPlayerReady(true);
                      onPlayerReady?.();
                      
                      intervalRef.current = setInterval(() => {
                        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                          try {
                            const time = playerRef.current.getCurrentTime();
                            onTimeUpdate?.(time);
                          } catch (err) {
                            console.error("Error in time update interval:", err);
                          }
                        }
                      }, 200);
                    },
                    onStateChange: (event: any) => {
                      // Define a local enum for YouTube Player States to avoid type conflicts
                      const YTPlayerState = {
                        UNSTARTED: -1,
                        ENDED: 0,
                        PLAYING: 1,
                        PAUSED: 2,
                        BUFFERING: 3,
                        CUED: 5,
                      };

                      // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
                      let newPlayerState: 'playing' | 'paused' | 'ended' | 'buffering' | 'cued' = 'paused';
                      switch (event.data) {
                        case YTPlayerState.PLAYING:
                          newPlayerState = 'playing';
                          onPlay?.();
                          break;
                        case YTPlayerState.PAUSED:
                          newPlayerState = 'paused';
                          onPause?.();
                          break;
                        case YTPlayerState.ENDED:
                          newPlayerState = 'ended';
                          onPause?.(); // Treat ended as a form of pause for external components
                          break;
                        case YTPlayerState.BUFFERING:
                          newPlayerState = 'buffering';
                          break;
                        case YTPlayerState.CUED:
                          newPlayerState = 'cued';
                          break;
                      }
                      setCurrentPlayerState(newPlayerState === 'playing' ? 'playing' : 'paused');
                      onStateChange?.(newPlayerState);
                    },
                    onError: (err: any) => {
                      console.error("YouTube player error:", err);
                      onError?.(err);
                    }
                  }
                });
              } catch (err) {
                console.error("Error creating YouTube player:", err);
                onError?.({ message: 'Failed to initialize YouTube player' });
              }
            }
          } else {
             if (typeof window !== 'undefined' && !window.YT) {
                console.log("Loading YouTube API");
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                const firstScriptTag = document.getElementsByTagName('script')[0];
                if (firstScriptTag && firstScriptTag.parentNode) {
                    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                }
                window.onYouTubeIframeAPIReady = initializePlayer;
            } else if (typeof window !== 'undefined' && window.YT) {
                // API loaded, but YT.Player might not be there yet, retry.
                console.log("YouTube API loaded but Player not available, retrying");
                setTimeout(initializePlayer, 100);
            }
          }
        } else if (video.source === 'veo') {
          const container = playerContainerRef.current;
          if (!container) return;

          if (video.url) {
            console.log("Creating Veo HTML5 player for URL:", video.url);
            const htmlVideoElement = document.createElement('video');
            htmlVideoElement.src = video.url;
            htmlVideoElement.controls = true;
            // Use provided width/height for the video element styling
            htmlVideoElement.style.width = width;
            htmlVideoElement.style.height = height;
            htmlVideoElement.className = className; // Apply provided className
            container.appendChild(htmlVideoElement);

            htmlVideoElement.onloadedmetadata = () => {
              console.log("Veo video metadata loaded");
              setIsPlayerReady(true);
              onPlayerReady?.();
              onTimeUpdate?.(htmlVideoElement.currentTime); 
            };
            htmlVideoElement.ontimeupdate = () => {
              onTimeUpdate?.(htmlVideoElement.currentTime);
            };
            htmlVideoElement.onplay = () => {
              setCurrentPlayerState('playing');
              onStateChange?.('playing');
              onPlay?.();
            };
            htmlVideoElement.onpause = () => {
              setCurrentPlayerState('paused');
              onStateChange?.('paused');
              onPause?.();
            };
            htmlVideoElement.onended = () => {
              setCurrentPlayerState('paused');
              onStateChange?.('ended');
              onPause?.(); // Treat ended as a pause
            };
            htmlVideoElement.onerror = (e) => {
              console.error("Veo HTML Video Error:", e);
              onError?.({ message: 'Error playing Veo video file.' });
            };

            playerRef.current = {
              getCurrentTime: () => htmlVideoElement.currentTime,
              seekTo: (seconds: number) => { htmlVideoElement.currentTime = seconds; },
              playVideo: () => {
                try {
                  const playPromise = htmlVideoElement.play();
                  if (playPromise !== undefined) {
                    playPromise.catch(error => {
                      console.error("Error playing Veo video:", error);
                      // Autoplay was prevented, handle it silently
                    });
                  }
                } catch (err) {
                  console.error("Error calling play() on Veo video:", err);
                }
              },
              pauseVideo: () => htmlVideoElement.pause(),
              // getPlayerState for HTML video: 1 (playing), 2 (paused), could also use htmlVideoElement.paused
              getPlayerState: () => htmlVideoElement.paused ? 'paused' : 'playing', 
            };

          } else {
            onError?.({ message: 'Veo video selected, but no direct URL provided.' });
            if (container) container.innerHTML = '<div class="text-gray-400 text-lg flex items-center justify-center h-full">Veo video URL not found.</div>';
          }
        } else if (video.source === 'facebook') {
            const container = playerContainerRef.current;
            if (!container || !video.url) {
                onError?.({message: "Facebook video URL is missing."});
                return;
            }

            console.log("Creating Facebook player for URL:", video.url);
            iframeElement = document.createElement('iframe');
            // Ensure FB URL is correct for embedding.
            iframeElement.src = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(video.url)}&show_text=false&autoplay=false&allowfullscreen=true&width=${container.offsetWidth}&height=${container.offsetHeight}`;
            iframeElement.className = 'w-full h-full';
            iframeElement.frameBorder = '0';
            iframeElement.allowFullscreen = true;
            iframeElement.allow = "autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share";
            container.appendChild(iframeElement);
            
            let fbCurrentTime = 0; // FB specific time tracking

            // Facebook player ready event handling
            setTimeout(() => {
              console.log("Facebook player ready (assumed after timeout)");
              setIsPlayerReady(true);
              onPlayerReady?.();
            }, 2000); // Assume FB player is ready after 2 seconds, adjust as needed

            messageHandler = (event: MessageEvent) => {
                // It's crucial to check event.origin for security
                if (event.origin !== 'https://www.facebook.com') return; 
                
                // A common pattern is that the message is stringified JSON
                try {
                    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

                    // FB's API messages might be different. This is speculative based on common patterns.
                    if (data.event === 'playerReady' || data.type === 'ready') { // Hypothetical event name
                        console.log("Facebook player ready via message");
                        setIsPlayerReady(true);
                        onPlayerReady?.();
                    } else if (data.event === 'currentTime' || data.type === 'timeupdate') { // Hypothetical
                        fbCurrentTime = data.seconds || data.currentTime;
                        onTimeUpdate?.(fbCurrentTime);
                    } else if (data.event === 'videoPlay' || data.status === 'playing') { // Hypothetical
                        setCurrentPlayerState('playing');
                        onStateChange?.('playing');
                        onPlay?.();
                    } else if (data.event === 'videoPause' || data.status === 'paused') { // Hypothetical
                        setCurrentPlayerState('paused');
                        onStateChange?.('paused');
                        onPause?.();
                    } else if (data.event === 'videoEnd' || data.status === 'ended') { // Hypothetical
                        setCurrentPlayerState('paused'); // Treat ended as paused
                        onStateChange?.('ended');
                        onPause?.();
                    }
                } catch (e) {
                    // Silently handle parsing errors
                }
            };
            window.addEventListener('message', messageHandler);

            playerRef.current = {
                getCurrentTime: () => fbCurrentTime,
                seekTo: (seconds: number) => {
                    if (!iframeElement || !iframeElement.contentWindow) return;
                    try {
                        iframeElement.contentWindow.postMessage({ command: 'seek', time: seconds }, '*'); // '*' is insecure, target origin if known
                    } catch (err) {
                        console.error("Error seeking Facebook video:", err);
                    }
                },
                playVideo: () => {
                    if (!iframeElement || !iframeElement.contentWindow) return;
                    try {
                        iframeElement.contentWindow.postMessage({ command: 'play' }, '*');
                        setCurrentPlayerState('playing'); onStateChange?.('playing'); onPlay?.();
                    } catch (err) {
                        console.error("Error playing Facebook video:", err);
                    }
                },
                pauseVideo: () => {
                    if (!iframeElement || !iframeElement.contentWindow) return;
                    try {
                        iframeElement.contentWindow.postMessage({ command: 'pause' }, '*');
                        setCurrentPlayerState('paused'); onStateChange?.('paused'); onPause?.();
                    } catch (err) {
                        console.error("Error pausing Facebook video:", err);
                    }
                },
                getPlayerState: () => currentPlayerState,
            };
            
            // Fallback interval for FB if postMessage 'timeupdate' isn't received
            intervalRef.current = setInterval(() => {
                // FB doesn't have a direct JS API to get time from an iframe postMessage without SDK.
                // This interval is a placeholder; actual time updates rely on messages.
                // If messages aren't working, this won't provide accurate time.
                 if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                    onTimeUpdate?.(playerRef.current.getCurrentTime());
                 }
            }, 250);
        }
      };

      initializePlayer();

      // Cleanup function for this effect
      return () => {
        console.log("Video effect cleanup");
        
        // Don't reset playerReady if we're just updating dependencies but video hasn't changed
        if (videoIdRef.current !== video.id) {
          setIsPlayerReady(false);
        }
        
        // Remove Veo specific message handler if it was ever set (it won't be with new logic)
        if (messageHandler && (video?.source === 'facebook')) { // Keep for Facebook
          window.removeEventListener('message', messageHandler);
        }
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        // Don't destroy player here as it's handled by the other effect
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [video?.id, onPlayerReady, onTimeUpdate, onStateChange, onPlay, onPause, onError]);
    // Changed dependencies to only include video.id instead of the entire video object to prevent unnecessary reinitializations

    // Keyboard arrow key seeking for video player
    useEffect(() => {
      const lastSeekTimeRef = { current: 0 };
      
      const handleKeyDown = (e: KeyboardEvent) => {
        // Use the internal playerRef and isPlayerReady state
        if (!playerRef.current || !isPlayerReady || typeof playerRef.current.getCurrentTime !== 'function') return;
        
        const now = Date.now();
        if (now - lastSeekTimeRef.current < 200) return; // 200ms debounce
        
        let didSeek = false;
        const currentVideoTime = playerRef.current.getCurrentTime();
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (playerRef.current.seekTo) {
            playerRef.current.seekTo(Math.max(0, currentVideoTime - 5), true);
            didSeek = true;
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (playerRef.current.seekTo) {
            playerRef.current.seekTo(currentVideoTime + 5, true);
            didSeek = true;
          }
        }
        
        if (didSeek) lastSeekTimeRef.current = now;
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlayerReady]); // Dependency: re-bind if player readiness changes

    return (
      <div ref={playerContainerRef} style={{ width, height }} className={`video-player-container ${className}`}>
        {!video && <div className="text-gray-400 text-lg flex items-center justify-center h-full">No video selected or video loading...</div>}
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
export default VideoPlayer;

// Helper: Ensure YouTube API is loaded only once
if (typeof window !== 'undefined' && !(window as any).YT_API_LOADED) {
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  const firstScriptTag = document.getElementsByTagName('script')[0];
  if (firstScriptTag && firstScriptTag.parentNode) {
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    (window as any).YT_API_LOADED = true; // Global flag
  }
} 