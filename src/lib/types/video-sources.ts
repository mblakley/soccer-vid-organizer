import { ReactElement } from 'react';

/**
 * Base video source interface
 */
export interface VideoSource {
  /** The unique identifier for this source */
  id: string;
  
  /** The display name of this source */
  name: string;
  
  /** The URL pattern regex string for this source */
  urlPattern: string;
  
  /** Function to extract video ID from URL */
  extractVideoId(url: string): string | null;
  
  /** Function to get the video player component or embed */
  getPlayerComponent(videoId: string, start?: number, end?: number): ReactElement;
  
  /** Function to get a thumbnail URL for this video */
  getThumbnailUrl(videoId: string, metadata?: any): string;
  
  /** Function to get a direct URL to the video */
  getVideoUrl(videoId: string): string;
  
  /** Default placeholder image for this source */
  placeholderImage: string;

  /** Optional function to import a single video (for sources that support it) */
  importSingleVideo?: (
    videoId: string,
    originalUrl: string,
    userId: string,
    apiToken?: string
  ) => Promise<void>;
}

/**
 * YouTube-specific source interface
 */
export interface YouTubeSource extends VideoSource {
  /** Function to extract playlist ID from URL */
  extractPlaylistId(url: string): string | null;

  /** Function to import a single video */
  importSingleVideo(videoId: string, originalUrl: string, userId: string): Promise<void>;

  /** Function to import/sync a playlist */
  importPlaylist(playlistId: string, userId: string): Promise<{
    added: number;
    updated: number;
    removed: number;
  }>;
}

/**
 * Common video metadata interface
 */
export interface VideoMetadata {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: number;
  publishedAt?: string;
  channelId?: string;
  channelTitle?: string;
  tags?: string[];
  [key: string]: any;
}

/**
 * Progress information for video source operations
 */
export interface VideoSourceProgress {
  current: number;
  total: number;
  status: string;
  error?: string;
}

/**
 * Interface for video source importers
 */
export interface VideoSourceImporter {
  importVideo(videoId: string, userId: string, onProgress?: (progress: VideoSourceProgress) => void): Promise<VideoImportResult>;
}

/**
 * Result of a video import operation
 */
export interface VideoImportResult {
  success: boolean;
  videoId?: string;
  error?: VideoSourceError;
  metadata?: VideoMetadata;
}

/**
 * Error information for video source operations
 */
export interface VideoSourceError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Supported video sources
 */
export type VideoSourceType = 
  | 'youtube'
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'veo'
  | 'hudl'
  | 'vimeo'; 