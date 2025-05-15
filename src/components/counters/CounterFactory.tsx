import React from 'react';
import { CountTracker, CounterProps, PlayerCounterProps } from './CounterInterfaces';
import StandardCounter from './StandardCounter';
import ResettableCounter from './ResettableCounter';
import PlayerCounter from './PlayerCounter';

interface CounterFactoryProps {
  counter: CountTracker;
  onIncrement: (counterId: string, playerName?: string) => void;
  onRemove: (counterId: string) => void;
  onReset: (counterId: string) => void;
  onAddPlayer: (counterId: string, playerName: string) => void;
  formatTime: (seconds: number) => string;
  onSeekTo: (time: number) => void;
  currentTime?: number;
  playerState?: 'playing' | 'paused';
}

const CounterFactory: React.FC<CounterFactoryProps> = (props) => {
  const { counter } = props;
  
  // Shared props for all counter types
  const counterProps: CounterProps = {
    counter,
    onIncrement: props.onIncrement,
    onRemove: props.onRemove,
    onReset: props.onReset,
    formatTime: props.formatTime,
    onSeekTo: props.onSeekTo,
    currentTime: props.currentTime,
    playerState: props.playerState
  };
  
  // Render the appropriate counter type based on counter.type
  switch (counter.type) {
    case 'standard':
      return <StandardCounter {...counterProps} />;
    case 'resettable':
      return <ResettableCounter {...counterProps} />;
    case 'player-based':
      const playerCounterProps: PlayerCounterProps = {
        ...counterProps,
        onAddPlayer: props.onAddPlayer
      };
      return <PlayerCounter {...playerCounterProps} />;
    default:
      return <StandardCounter {...counterProps} />;
  }
};

export default CounterFactory; 