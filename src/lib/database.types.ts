export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clips: {
        Row: {
          id: string
          title: string
          video_id: string
          start_time: number
          end_time: number
          created_by: string | null
        }
        Insert: {
          id?: string
          title: string
          video_id: string
          start_time: number
          end_time: number
          created_by?: string | null
        }
        Update: {
          id?: string
          title?: string
          video_id?: string
          start_time?: number
          end_time?: number
          created_by?: string | null
        }
      }
      comments: {
        Row: {
          id: string
          clip_id: string | null
          user_id: string | null
          content: string
          role_visibility: string
          created_at: string | null
        }
        Insert: {
          id?: string
          clip_id?: string | null
          user_id?: string | null
          content: string
          role_visibility: string
          created_at?: string | null
        }
        Update: {
          id?: string
          clip_id?: string | null
          user_id?: string | null
          content?: string
          role_visibility?: string
          created_at?: string | null
        }
      }
      videos: {
        Row: {
          id: string
          title: string
          url: string
          video_id: string
          source: string
          duration: number | null
          metadata: Json | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          title: string
          url: string
          video_id: string
          source?: string
          duration?: number | null
          metadata?: Json | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          url?: string
          video_id?: string
          source?: string
          duration?: number | null
          metadata?: Json | null
          created_by?: string | null
          created_at?: string | null
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          club_affiliation: string | null
          season: string | null
          age_group: string | null
          additional_info: Json | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          club_affiliation?: string | null
          season?: string | null
          age_group?: string | null
          additional_info?: Json | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          club_affiliation?: string | null
          season?: string | null
          age_group?: string | null
          additional_info?: Json | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string | null
          name: string
          roles: string[]
          jersey_number: string | null
          position: string | null
          joined_date: string
          left_date: string | null
          is_active: boolean | null
          additional_info: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          user_id?: string | null
          name: string
          roles?: string[]
          jersey_number?: string | null
          position?: string | null
          joined_date: string
          left_date?: string | null
          is_active?: boolean | null
          additional_info?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string | null
          name?: string
          roles?: string[]
          jersey_number?: string | null
          position?: string | null
          joined_date?: string
          left_date?: string | null
          is_active?: boolean | null
          additional_info?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      games: {
        Row: {
          id: string
          home_team_id: string | null
          away_team_id: string | null
          location: string | null
          game_date: string
          game_time: string | null
          score_home: number | null
          score_away: number | null
          status: string | null
          additional_info: Json | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          home_team_id?: string | null
          away_team_id?: string | null
          location?: string | null
          game_date: string
          game_time?: string | null
          score_home?: number | null
          score_away?: number | null
          status?: string | null
          additional_info?: Json | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          home_team_id?: string | null
          away_team_id?: string | null
          location?: string | null
          game_date?: string
          game_time?: string | null
          score_home?: number | null
          score_away?: number | null
          status?: string | null
          additional_info?: Json | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      game_attendance: {
        Row: {
          id: string
          game_id: string
          team_member_id: string
          status: string
          minutes_played: number | null
          additional_info: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          game_id: string
          team_member_id: string
          status?: string
          minutes_played?: number | null
          additional_info?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          game_id?: string
          team_member_id?: string
          status?: string
          minutes_played?: number | null
          additional_info?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      game_videos: {
        Row: {
          id: string
          game_id: string
          video_id: string
          video_type: string | null
          additional_info: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          game_id: string
          video_id: string
          video_type?: string | null
          additional_info?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          game_id?: string
          video_id?: string
          video_type?: string | null
          additional_info?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      counters: {
        Row: {
          id: string
          video_id: string
          name: string
          type: string
          count: number | null
          timestamps: Json | null
          player_counts: Json | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          video_id: string
          name: string
          type: string
          count?: number | null
          timestamps?: Json | null
          player_counts?: Json | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          video_id?: string
          name?: string
          type?: string
          count?: number | null
          timestamps?: Json | null
          player_counts?: Json | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      timers: {
        Row: {
          id: string
          video_id: string
          name: string
          type: string
          duration: number | null
          sessions: Json | null
          player_times: Json | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          video_id: string
          name: string
          type: string
          duration?: number | null
          sessions?: Json | null
          player_times?: Json | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          video_id?: string
          name?: string
          type?: string
          duration?: number | null
          sessions?: Json | null
          player_times?: Json | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      counter_events: {
        Row: {
          id: string
          counter_id: string
          team_member_id: string | null
          timestamp: number
          value: number | null
          additional_info: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          counter_id: string
          team_member_id?: string | null
          timestamp: number
          value?: number | null
          additional_info?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          counter_id?: string
          team_member_id?: string | null
          timestamp?: number
          value?: number | null
          additional_info?: Json | null
          created_at?: string | null
        }
      }
      timer_events: {
        Row: {
          id: string
          timer_id: string
          team_member_id: string | null
          start_time: number
          end_time: number | null
          duration: number | null
          additional_info: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          timer_id: string
          team_member_id?: string | null
          start_time: number
          end_time?: number | null
          duration?: number | null
          additional_info?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          timer_id?: string
          team_member_id?: string | null
          start_time?: number
          end_time?: number | null
          duration?: number | null
          additional_info?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      team_member_roles: {
        Row: {
          id: string
          team_id: string
          user_id: string | null
          name: string
          team_name: string
          role: string
          jersey_number: string | null
          position: string | null
          joined_date: string
          left_date: string | null
          is_active: boolean | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 