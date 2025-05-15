// Counter type definitions
export type CounterType = 'standard' | 'resettable' | 'player-based';

export interface CountTracker {
  id: string;
  name: string;
  count: number;
  timestamps: number[];
  type: CounterType;
  players?: string[]; // Array of player names for player-based counters
  playerCounts?: Record<string, { count: number, timestamps: number[] }>; // Tracking counts per player
}

export interface CounterProps {
  counter: CountTracker;
  onIncrement: (counterId: string, playerName?: string) => void;
  onRemove: (counterId: string) => void;
  onReset?: (counterId: string) => void;
  formatTime: (seconds: number) => string;
  currentTime?: number;
  playerState?: 'playing' | 'paused';
  onSeekTo: (time: number) => void;
}

export interface PlayerCounterProps extends CounterProps {
  onAddPlayer: (counterId: string, playerName: string) => void;
} 