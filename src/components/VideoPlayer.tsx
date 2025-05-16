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
  start_time?: number;  // Add start_time
  end_time?: number;    // Add end_time
}

export interface VideoPlayerControls {
  playVideo: () => void;
  pauseVideo: () => void;
  forcePause: () => void;
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
  onEnd?: () => void;  // Add onEnd callback
  width?: string;
  height?: string;
  className?: string;
}

const VideoPlayer = forwardRef<VideoPlayerControls, VideoPlayerProps>(
  ({ video, onPlayerReady, onTimeUpdate, onStateChange, onPlay, onPause, onError, onEnd, width = '100%', height = '100%', className = '' }, ref) => {
    const playerContainerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<any>(null) // Stores the actual player instance (YT, Veo, FB)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const endCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const videoIdRef = useRef<string | null>(null) // Keep track of the current video ID to prevent unnecessary reinitializations
    const [currentPlayerState, setCurrentPlayerState] = useState<'playing' | 'paused'>('paused');
    // Add a flag to track if the player is ready
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const isMonitoringEndTime = useRef(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const durationRef = useRef<number>(0);

    // Clear end time monitoring interval
    const stopEndTimeMonitoring = () => {
      if (endCheckIntervalRef.current) {
        clearInterval(endCheckIntervalRef.current);
        endCheckIntervalRef.current = null;
      }
      isMonitoringEndTime.current = false;
    };
    
    // Start monitoring for end time
    const startEndTimeMonitoring = () => {
      // Don't start if we don't have a valid end time
      if (!video?.end_time) return;
      
      // Clear any existing monitoring first
      stopEndTimeMonitoring();
      
      // Log that we're starting end time monitoring
      console.log(`Starting end time monitoring. Will stop at ${video.end_time.toFixed(2)}s`);
      
      // Set a flag to indicate we're actively monitoring
      isMonitoringEndTime.current = true;
      
      // Create an interval that checks the video time every 20ms
      endCheckIntervalRef.current = setInterval(() => {
        // Skip if player isn't ready or no reference
        if (!playerRef.current || !isPlayerReady) return;
        
        try {
          // Get the current video time directly from the player
          let currentTime = 0;
          
          try {
            currentTime = playerRef.current.getCurrentTime();
          } catch (e) {
            console.error("Error getting time:", e);
            return;
          }
          
          // Get player state for more accurate detection
          let playerState = -1;
          try {
            if (video.source === 'youtube') {
              playerState = playerRef.current.getPlayerState();
            }
          } catch (e) {}
          
          // If YouTube player and not playing/buffering, skip (states: 1=playing, 3=buffering)
          if (video.source === 'youtube' && playerState !== 1 && playerState !== 3) {
            return;
          }
          
          // DEBUG: Log frequently to see what's happening
          if (video.end_time) {
            const timeRemaining = video.end_time - currentTime;
            
            // Always log the time at regular intervals for debugging
            console.log(`TIME-CHECK: ${currentTime.toFixed(2)}/${video.end_time.toFixed(2)}s, Remaining: ${timeRemaining.toFixed(2)}s`);
            
            if (timeRemaining < 3) {
              console.log(`MONITOR: Time=${currentTime.toFixed(2)}, End=${video.end_time.toFixed(2)}s, Remaining=${timeRemaining.toFixed(2)}s, State=${playerState}`);
            }
          }
          
          // Check if we've reached the end time - use a small buffer to catch it slightly before
          if (video.end_time !== undefined && currentTime >= video.end_time - 0.1) {
            console.log(`🚨 END TIME REACHED: Video at ${currentTime.toFixed(2)}s, end time is ${video.end_time.toFixed(2)}s`);
            
            // FORCEFULLY pause the video - use multiple approaches
            try {
              console.log("Attempting to pause video...");
              
              // Try both direct YouTube API call and our wrapped method
              if (video.source === 'youtube') {
                // Force direct API call to avoid any potential wrapping issues
                try {
                  const iframe = playerContainerRef.current?.querySelector('iframe');
                  if (iframe && iframe.contentWindow) {
                    console.log("Sending direct postMessage pause command to YouTube iframe");
                    try {
                      iframe.contentWindow.postMessage(JSON.stringify({
                        event: 'command',
                        func: 'pauseVideo'
                      }), '*');
                    } catch (postError) {
                      console.error("Error sending postMessage:", postError);
                    }
                  }
                } catch (e) {
                  console.error("Error with direct iframe pause:", e);
                }
                
                // As a last resort, try to pause using direct DOM manipulation
                try {
                  const videoElement = playerContainerRef.current?.querySelector('video');
                  if (videoElement) {
                    console.log("Found direct video element, pausing directly");
                    videoElement.pause();
                  }
                } catch (vidError) {
                  console.error("Error pausing direct video element:", vidError);
                }
              }
              
              // Try the standard pauseVideo method
              playerRef.current.pauseVideo();
              console.log("Called pauseVideo()");
              
              // Force an update to our state
              setCurrentPlayerState('paused');
              onStateChange?.('paused');
              onPause?.();
              onEnd?.();
              
              // Double-check that it paused
              setTimeout(() => {
                try {
                  // Check if we're still playing
                  const state = playerRef.current.getPlayerState();
                  const newTime = playerRef.current.getCurrentTime();
                  console.log(`After pause: State=${state}, Time=${newTime.toFixed(2)}s`);
                  
                  // If still playing (state=1 for YouTube), force another pause
                  if (state === 1 || newTime > video.end_time!) {
                    console.log("🚨 Still playing after pause attempt! Forcing another pause...");
                    playerRef.current.pauseVideo();
                    
                    // As a last resort, try to seek back to end time and pause again
                    setTimeout(() => {
                      console.log("Final pause attempt with seek");
                      if (video.end_time) {
                        playerRef.current.seekTo(video.end_time - 0.1);
                        playerRef.current.pauseVideo();
                      }
                    }, 100);
                  }
                } catch (e) {
                  console.error("Error in pause verification:", e);
                }
              }, 200);
            } catch (e) {
              console.error("Error while trying to pause:", e);
            }
            
            // Stop monitoring
            console.log("Stopping end time monitoring");
            stopEndTimeMonitoring();
            return;
          }
        } catch (err) {
          console.error('Error during end time monitoring:', err);
        }
      }, 20); // Even more frequent checks - every 20ms
    };

    // Reset state when video changes
    useEffect(() => {
      setIsTransitioning(false);
      setSecondsLeft(null);
      startTimeRef.current = null;
      if (video?.start_time !== undefined && video?.end_time !== undefined) {
        durationRef.current = video.end_time - video.start_time;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, [video?.id, video?.start_time, video?.end_time]);

    // This effect ensures cleanup of intervals when component unmounts or video changes
    useEffect(() => {
      return () => {
        stopEndTimeMonitoring();
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [video?.id]);

    useImperativeHandle(ref, () => ({
      playVideo: () => {
        console.log("playVideo called, player ready:", isPlayerReady);
        if (!playerRef.current || !isPlayerReady) {
          console.log("Cannot play - player not ready");
          return;
        }
        
        try {
          if (video?.source === 'youtube' && playerRef.current.playVideo) {
            // If we have start_time, seek to it first
            if (video.start_time !== undefined) {
              console.log(`Seeking to start time: ${video.start_time.toFixed(2)}s`);
              try {
                playerRef.current.seekTo(video.start_time, true);
              } catch (seekError) {
                console.error("Error seeking to start time:", seekError);
              }
            }
            
            // Play the video
            try {
              playerRef.current.playVideo();
            } catch (playError) {
              console.error("Error playing video:", playError);
            }
            
            // Start end time monitoring when we play
            startEndTimeMonitoring();
          } else if ((video?.source === 'veo' || video?.source === 'facebook') && playerRef.current.playVideo) {
            if (video.start_time !== undefined) {
              try {
                playerRef.current.seekTo(video.start_time);
              } catch (seekError) {
                console.error("Error seeking to start time:", seekError);
              }
            }
            
            try {
              playerRef.current.playVideo();
            } catch (playError) {
              console.error("Error playing video:", playError);
            }
            
            // Start end time monitoring for non-YouTube players too
            startEndTimeMonitoring();
          }
        } catch (err) {
          console.error("Error playing video:", err);
        }
      },
      pauseVideo: () => {
        if (!playerRef.current || !isPlayerReady) return;
        
        // Stop monitoring when manually paused
        stopEndTimeMonitoring();
        
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
      forcePause: () => {
        console.log("EMERGENCY FORCE PAUSE CALLED");
        
        // Try every method we have to pause the video
        try {
          // 1. Standard method
          playerRef.current?.pauseVideo();
          
          // 2. Direct YouTube API
          if (video?.source === 'youtube') {
            // Try postMessage
            try {
              const iframe = playerContainerRef.current?.querySelector('iframe');
              if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(JSON.stringify({
                  event: 'command',
                  func: 'pauseVideo'
                }), '*');
              }
            } catch (e) {}
            
            // Try direct player state change
            try {
              // For YouTube, directly set player state
              if (typeof playerRef.current?.setPlaybackRate === 'function') {
                playerRef.current.setPlaybackRate(0);
              }
            } catch (e) {}
          }
          
          // 3. Try HTML5 video element
          try {
            const videoElement = playerContainerRef.current?.querySelector('video');
            if (videoElement) {
              videoElement.pause();
            }
          } catch (e) {}
          
          // 4. Set all relevant state
          setCurrentPlayerState('paused');
          onStateChange?.('paused');
          onPause?.();
          
        } catch (e) {
          console.error("Error in forcePause:", e);
        }
      },
      seekTo: (seconds: number, allowSeekAhead?: boolean) => {
        if (!playerRef.current || !isPlayerReady) return;
        
        try {
          if (video?.source === 'youtube' && playerRef.current.seekTo) {
            playerRef.current.seekTo(seconds, allowSeekAhead);
            
            // If we're playing and seek happens, restart monitoring
            if (currentPlayerState === 'playing') {
              startEndTimeMonitoring();
            }
          } else if ((video?.source === 'veo' || video?.source === 'facebook') && playerRef.current.seekTo) {
            playerRef.current.seekTo(seconds);
            
            // Same for non-YouTube players
            if (currentPlayerState === 'playing') {
              startEndTimeMonitoring();
            }
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
    }), [video?.source, isPlayerReady, video?.start_time, video?.end_time, currentPlayerState, onStateChange, onPause, onEnd]);

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
      
      // If no video is provided, clear the player
      if (!video) {
        console.log("No video provided, clearing player");
        setIsPlayerReady(false);
        if (playerContainerRef.current) {
          playerContainerRef.current.innerHTML = '';
        }
        return;
      }
      
      // Skip reinitialization if we're already initialized for this video
      if (isPlayerReady && playerRef.current && video?.id === videoIdRef.current) {
        console.log("Player already initialized for this video, skipping");
        return;
      }
      
      setIsPlayerReady(false);
      
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
                      
                      // If we have start_time, seek to it ONLY after player is ready
                      if (video?.start_time !== undefined) {
                        console.log(`Seeking to initial start time: ${video.start_time}`);
                        try {
                          playerRef.current.seekTo(video.start_time, true);
                        } catch (e) {
                          console.error("Error seeking to start time:", e);
                        }
                      }
                      
                      onPlayerReady?.();
                      
                      // Force setup of end time monitoring immediately
                      if (video?.end_time) {
                        console.log(`Player ready - setting up immediate end time check for ${video.end_time}s`);
                        startEndTimeMonitoring();
                        
                        // One-time check of player state and time for debugging
                        setTimeout(() => {
                          try {
                            if (playerRef.current) {
                              const state = playerRef.current.getPlayerState();
                              const time = playerRef.current.getCurrentTime();
                              console.log(`Initial player state: ${state}, time: ${time}s`);
                              console.log(`Monitoring active: ${isMonitoringEndTime.current}, End time: ${video.end_time}s`);
                            }
                          } catch (e) {
                            console.error("Error checking initial state:", e);
                          }
                        }, 500);
                      }
                      
                      // Set up time update interval for general updates
                      intervalRef.current = setInterval(() => {
                        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                          try {
                            const time = playerRef.current.getCurrentTime();
                            console.log(`TIME-UPDATE: ${time.toFixed(2)}s`);
                            onTimeUpdate?.(time);
                          } catch (err) {
                            console.error("Error in time update interval:", err);
                          }
                        }
                      }, 100);
                    },
                    onStateChange: (event: any) => {
                      const YTPlayerState = {
                        UNSTARTED: -1,
                        ENDED: 0,
                        PLAYING: 1,
                        PAUSED: 2,
                        BUFFERING: 3,
                        CUED: 5,
                      };

                      let newPlayerState: 'playing' | 'paused' | 'ended' | 'buffering' | 'cued' = 'paused';
                      switch (event.data) {
                        case YTPlayerState.PLAYING:
                          newPlayerState = 'playing';
                          onPlay?.();
                          
                          // When the video starts playing, start end time monitoring
                          if (video?.end_time) {
                            startEndTimeMonitoring();
                          }
                          break;
                        case YTPlayerState.PAUSED:
                          newPlayerState = 'paused';
                          onPause?.();
                          // Stop monitoring when manually paused
                          stopEndTimeMonitoring();
                          break;
                        case YTPlayerState.ENDED:
                          newPlayerState = 'ended';
                          onPause?.();
                          onEnd?.();
                          // Stop monitoring when video ends naturally
                          stopEndTimeMonitoring();
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
              
              // If we have start_time, seek to it
              if (video.start_time !== undefined) {
                htmlVideoElement.currentTime = video.start_time;
              }
              
              onTimeUpdate?.(htmlVideoElement.currentTime);
            };
            htmlVideoElement.ontimeupdate = () => {
              const currentTime = htmlVideoElement.currentTime;
              onTimeUpdate?.(currentTime);
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
        {isTransitioning && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded animate-pulse">
            ⏭️ Transitioning...
          </div>
        )}
        {secondsLeft !== null && secondsLeft > 0 && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded">
            Next in {secondsLeft}s
          </div>
        )}
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