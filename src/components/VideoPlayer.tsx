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
    const [currentPlayerState, setCurrentPlayerState] = useState<'playing' | 'paused'>('paused');


    useImperativeHandle(ref, () => ({
      playVideo: () => {
        if (playerRef.current) {
          if (video?.source === 'youtube' && playerRef.current.playVideo) {
            playerRef.current.playVideo();
          } else if ((video?.source === 'veo' || video?.source === 'facebook') && playerRef.current.playVideo) {
             playerRef.current.playVideo();
          }
        }
      },
      pauseVideo: () => {
        if (playerRef.current) {
          if (video?.source === 'youtube' && playerRef.current.pauseVideo) {
            playerRef.current.pauseVideo();
          } else if ((video?.source === 'veo' || video?.source === 'facebook') && playerRef.current.pauseVideo) {
            playerRef.current.pauseVideo();
          }
        }
      },
      seekTo: (seconds: number, allowSeekAhead?: boolean) => {
        if (playerRef.current) {
          if (video?.source === 'youtube' && playerRef.current.seekTo) {
            playerRef.current.seekTo(seconds, allowSeekAhead);
          } else if ((video?.source === 'veo' || video?.source === 'facebook') && playerRef.current.seekTo) {
            playerRef.current.seekTo(seconds);
          }
        }
      },
      getCurrentTime: (): number => {
        if (playerRef.current) {
          if (video?.source === 'youtube' && typeof playerRef.current.getCurrentTime === 'function') {
            return playerRef.current.getCurrentTime();
          } else if ((video?.source === 'veo' || video?.source === 'facebook') && typeof playerRef.current.getCurrentTime === 'function') {
            return playerRef.current.getCurrentTime();
          }
        }
        return 0;
      },
      getPlayerState: (): number | string => {
        if (playerRef.current) {
          if (video?.source === 'youtube' && typeof playerRef.current.getPlayerState === 'function') {
            return playerRef.current.getPlayerState();
          } else if ((video?.source === 'veo' || video?.source === 'facebook') && typeof playerRef.current.getPlayerState === 'function') {
            // Veo/FB uses our internal string state, convert to a comparable value if needed or return string
            return playerRef.current.getPlayerState(); // This was returning our string state
          }
        }
        return video?.source === 'youtube' ? -1 : 'unknown'; // YT default state, string for others
      },
    }));

    useEffect(() => {
      // Cleanup on component unmount or when video changes
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        if (playerRef.current && video?.source === 'youtube' && typeof playerRef.current.destroy === 'function') {
          // playerRef.current.destroy(); // This can cause issues if component re-renders fast
        }
        playerRef.current = null;
        if (playerContainerRef.current) {
          playerContainerRef.current.innerHTML = ''; // Clear previous player
        }
      };
    }, [video?.id]); // Added video.id to ensure cleanup when video truly changes

    useEffect(() => {
      if (!video) {
        if (playerContainerRef.current) playerContainerRef.current.innerHTML = ''; // Clear player if no video
        return;
      }

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
              const playerDiv = document.createElement('div');
              // playerDiv.id = \`youtube-player-\${Math.random().toString(36).substring(7)}\`; // Unique ID for multiple players
              playerDiv.id = 'youtube-player-instance'; // Let's use a fixed ID if only one player on page or manage IDs carefully
              playerContainerRef.current.appendChild(playerDiv);

              playerRef.current = new window.YT.Player(playerDiv.id, {
                videoId: video.video_id,
                height: '100%',
                width: '100%',
                playerVars: {
                  autoplay: 0,
                  controls: 1,
                  modestbranding: 1,
                  rel: 0,
                  playsinline: 1 // Important for mobile
                },
                events: {
                  onReady: () => {
                    onPlayerReady?.();
                    intervalRef.current = setInterval(() => {
                      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                        const time = playerRef.current.getCurrentTime();
                        onTimeUpdate?.(time);
                      }
                    }, 200);
                  },
                  onStateChange: (event: any) => {
                    // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
                    let newPlayerState: 'playing' | 'paused' | 'ended' | 'buffering' | 'cued' = 'paused';
                    switch (event.data) {
                      case window.YT.PlayerState.PLAYING:
                        newPlayerState = 'playing';
                        onPlay?.();
                        break;
                      case window.YT.PlayerState.PAUSED:
                        newPlayerState = 'paused';
                        onPause?.();
                        break;
                      case window.YT.PlayerState.ENDED:
                        newPlayerState = 'ended';
                        onPause?.(); // Treat ended as a form of pause for external components
                        break;
                      case window.YT.PlayerState.BUFFERING:
                        newPlayerState = 'buffering';
                        break;
                      case window.YT.PlayerState.CUED:
                        newPlayerState = 'cued';
                        break;
                    }
                    setCurrentPlayerState(newPlayerState === 'playing' ? 'playing' : 'paused');
                    onStateChange?.(newPlayerState);
                  },
                  onError: (err: any) => {
                    onError?.(err);
                  }
                }
              });
            }
          } else {
             if (typeof window !== 'undefined' && !window.YT) {
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                const firstScriptTag = document.getElementsByTagName('script')[0];
                if (firstScriptTag && firstScriptTag.parentNode) {
                    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                }
                window.onYouTubeIframeAPIReady = initializePlayer;
            } else if (typeof window !== 'undefined' && window.YT) {
                // API loaded, but YT.Player might not be there yet, retry.
                setTimeout(initializePlayer, 100);
            }
          }
        } else if (video.source === 'veo') {
          const container = playerContainerRef.current;
          if (!container) return;

          if (video.url) {
            const htmlVideoElement = document.createElement('video');
            htmlVideoElement.src = video.url;
            htmlVideoElement.controls = true;
            // Use provided width/height for the video element styling
            htmlVideoElement.style.width = width;
            htmlVideoElement.style.height = height;
            htmlVideoElement.className = className; // Apply provided className
            container.appendChild(htmlVideoElement);

            htmlVideoElement.onloadedmetadata = () => {
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
              playVideo: () => htmlVideoElement.play(),
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

            iframeElement = document.createElement('iframe');
            // Ensure FB URL is correct for embedding.
            iframeElement.src = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(video.url)}&show_text=false&autoplay=false&allowfullscreen=true&width=${container.offsetWidth}&height=${container.offsetHeight}`;
            iframeElement.className = 'w-full h-full';
            iframeElement.frameBorder = '0';
            iframeElement.allowFullscreen = true;
            iframeElement.allow = "autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share";
            container.appendChild(iframeElement);
            
            let fbCurrentTime = 0; // FB specific time tracking

            // Facebook player SDK interaction is more complex if using JS SDK.
            // For iframe, it's postMessage based if the embedded player supports it.
            // The original code relied on postMessage, let's try to make it robust.
            // It seems the original code for FB was a copy of Veo, which might not be accurate for FB.
            // Facebook's postMessage API for embedded videos is not as well-documented as YouTube/Vimeo.
            // We'll attempt a similar structure but it may need actual FB API docs for reliability.

            messageHandler = (event: MessageEvent) => {
                // It's crucial to check event.origin for security
                if (event.origin !== 'https://www.facebook.com') return; 
                
                // A common pattern is that the message is stringified JSON
                try {
                    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

                    // FB's API messages might be different. This is speculative based on common patterns.
                    if (data.event === 'playerReady' || data.type === 'ready') { // Hypothetical event name
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
                    // console.warn('Error parsing Facebook player message or unrecognized message format:', e, event.data);
                }
            };
            window.addEventListener('message', messageHandler);

            playerRef.current = {
                getCurrentTime: () => fbCurrentTime,
                seekTo: (seconds: number) => {
                    iframeElement?.contentWindow?.postMessage({ command: 'seek', time: seconds }, '*'); // '*' is insecure, target origin if known
                },
                playVideo: () => {
                    iframeElement?.contentWindow?.postMessage({ command: 'play' }, '*');
                    setCurrentPlayerState('playing'); onStateChange?.('playing'); onPlay?.();
                },
                pauseVideo: () => {
                    iframeElement?.contentWindow?.postMessage({ command: 'pause' }, '*');
                    setCurrentPlayerState('paused'); onStateChange?.('paused'); onPause?.();
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
        // Remove Veo specific message handler if it was ever set (it won't be with new logic)
        // if (messageHandler && video?.source === 'veo') { 
        //   window.removeEventListener('message', messageHandler);
        // }
        if (messageHandler && (video?.source === 'facebook')) { // Keep for Facebook
          window.removeEventListener('message', messageHandler);
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        // if (playerRef.current && video?.source === 'youtube' && typeof playerRef.current.destroy === 'function') {
          // Don't destroy here, handled by the top-level effect
        // }
        // playerRef.current = null; // Also handled by top-level effect
         if (playerContainerRef.current) {
           // playerContainerRef.current.innerHTML = ''; // Avoid clearing if the video object itself hasn't changed.
         }
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [video, onPlayerReady, onTimeUpdate, onStateChange, onPlay, onPause, onError]);
    // Dependencies: Re-initialize if the video object itself changes, or if any callbacks change (though less common for callbacks)

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