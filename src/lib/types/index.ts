export interface Clip {
  id: string;
  video_id: string;
  title?: string;
  start_time: number;
  end_time: number;
  created_at?: string;
  updated_at?: string;
}

export interface ListClipsApiResponse {
  clips: Clip[];
  message?: string;
} 