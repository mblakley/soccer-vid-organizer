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