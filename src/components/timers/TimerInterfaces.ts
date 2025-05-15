// Timer type definitions
export interface TimerSession {
  startTime: number;
  endTime: number | null;
  duration: number;
}

export interface PlayerTimer {
  id: string;
  name: string;
  startTime: number | null;
  endTime: number | null;
  duration: number;
  active: boolean;
  type?: 'standard' | 'player-based';
  players?: string[];
  playerTimes?: Record<string, {
    duration: number;
    active: boolean;
    startTime: number | null;
    sessions: TimerSession[];
  }>;
  sessions: TimerSession[];
}

export interface TimerProps {
  timer: PlayerTimer;
  onStart: (timerId: string) => void;
  onStop: (timerId: string) => void;
  onReset: (timerId: string) => void;
  onRemove: (timerId: string) => void;
  formatTime: (seconds: number) => string;
  getCurrentTime: () => number;
}

export interface PlayerTimerProps extends TimerProps {
  onAddPlayer: (timerId: string, playerName: string) => void;
  onTogglePlayerTimer: (timerId: string, playerName: string) => void;
  onSelectPlayerForSessions: (timerId: string, playerName: string) => void;
  selectedPlayerForSessions: {timerId: string, playerName: string} | null;
} 