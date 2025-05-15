import React from 'react';
import { PlayerTimer, TimerProps, PlayerTimerProps } from './TimerInterfaces';
import StandardTimer from './StandardTimer';
import PlayerBasedTimer from './PlayerBasedTimer';

interface TimerFactoryProps {
  timer: PlayerTimer;
  onStart: (timerId: string) => void;
  onStop: (timerId: string) => void;
  onReset: (timerId: string) => void;
  onRemove: (timerId: string) => void;
  onAddPlayer: (timerId: string, playerName: string) => void;
  onTogglePlayerTimer: (timerId: string, playerName: string) => void;
  formatTime: (seconds: number) => string;
  getCurrentTime: () => number;
  onSelectPlayerForSessions: (timerId: string, playerName: string) => void;
  selectedPlayerForSessions: {timerId: string, playerName: string} | null;
}

const TimerFactory: React.FC<TimerFactoryProps> = (props) => {
  const { timer } = props;
  
  // Shared props for all timer types
  const timerProps: TimerProps = {
    timer,
    onStart: props.onStart,
    onStop: props.onStop,
    onReset: props.onReset,
    onRemove: props.onRemove,
    formatTime: props.formatTime,
    getCurrentTime: props.getCurrentTime
  };
  
  // Render the appropriate timer type based on timer.type
  if (timer.type === 'player-based') {
    const playerTimerProps: PlayerTimerProps = {
      ...timerProps,
      onAddPlayer: props.onAddPlayer,
      onTogglePlayerTimer: props.onTogglePlayerTimer,
      onSelectPlayerForSessions: props.onSelectPlayerForSessions,
      selectedPlayerForSessions: props.selectedPlayerForSessions
    };
    return <PlayerBasedTimer {...playerTimerProps} />;
  }
  
  // Default to standard timer
  return <StandardTimer {...timerProps} />;
};

export default TimerFactory; 