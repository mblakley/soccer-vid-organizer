import { PlayerTimer, TimerSession } from '@/components/timers/TimerInterfaces';

export interface TimerEvent {
  id: string;
  timer_id: string;
  start_time: number;
  end_time: number | null;
  duration: number | null;
  team_member_id: string | null;
}

export interface TimerEventResponse {
  data: TimerEvent;
  error?: string;
}

export interface TimerEventsResponse {
  data: TimerEvent[];
  error?: string;
}

export interface TimerResponse {
  data: PlayerTimer;
  error?: string;
}

export interface TimersResponse {
  data: { timers: PlayerTimer[] };
  error?: string;
} 