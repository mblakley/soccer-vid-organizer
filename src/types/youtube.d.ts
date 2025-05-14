interface Window {
  YT: {
    Player: new (
      elementId: string,
      options: {
        videoId: string;
        height: string | number;
        width: string | number;
        playerVars?: {
          start?: number;
          end?: number;
          autoplay?: number;
          enablejsapi?: number;
          rel?: number;
          modestbranding?: number;
          controls?: number;
          showinfo?: number;
          iv_load_policy?: number;
          fs?: number;
          playsinline?: number;
        };
        events?: {
          onReady?: () => void;
          onStateChange?: (event: { data: number }) => void;
        };
      }
    ) => any;
    PlayerState: {
      UNSTARTED: -1;
      ENDED: 0;
      PLAYING: 1;
      PAUSED: 2;
      BUFFERING: 3;
      CUED: 5;
    };
  };
  onYouTubeIframeAPIReady: () => void;
} 