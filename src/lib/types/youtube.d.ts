export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  channelTitle: string;
  publishedAt: string;
  tags: string[];
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  itemCount: number;
  videos: YouTubeVideo[];
}

interface Window {
  onYouTubeIframeAPIReady: () => void;
  YT: {
    Player: any;
    PlayerState: {
      ENDED: number;
      PLAYING: number;
      PAUSED: number;
      BUFFERING: number;
      CUED: number;
      UNSTARTED: number;
    };
  };
} 