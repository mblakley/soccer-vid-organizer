import React from 'react';
import { useCounters } from '@/hooks/useCounters';
import CounterFactory from './CounterFactory';
import CounterForm from './CounterForm';
import { CounterType } from './CounterInterfaces';

interface CountersSectionProps {
  userId: string;
  videoId?: string;
  formatTime: (seconds: number) => string;
  onShowConfirmModal: (config: {
    title: string;
    message: string;
    onConfirm: () => void;
  }) => void;
  onShowAddPlayerForm: (counterId: string, onAddPlayer: (playerName: string) => void) => void;
  currentTime: number;
  playerState: 'playing' | 'paused';
  onSeekTo: (time: number) => void;
}

const CountersSection: React.FC<CountersSectionProps> = ({
  userId,
  videoId,
  formatTime,
  onShowConfirmModal,
  onShowAddPlayerForm,
  currentTime,
  playerState,
  onSeekTo
}) => {
  const {
    counters,
    showCounterForm,
    newCounterName,
    newCounterType,
    newCounterPlayers,
    newPlayerName,
    setNewCounterName,
    setNewCounterType,
    setNewCounterPlayers,
    setNewPlayerName,
    handleAddCounter,
    handleCancelCounterForm,
    saveCounter,
    addPlayerToCounterForm,
    removePlayerFromCounterForm,
    incrementCounter,
    removeCounter,
    resetCounter,
    addPlayerToCounter
  } = useCounters({
    userId,
    videoId
  });

  return (
    <>
      {counters.length === 0 && (
        <div className="p-4 text-gray-400">No counters yet. Add one below.</div>
      )}
      {counters.map(counter => (
        <CounterFactory
          key={counter.id}
          counter={counter}
          onIncrement={incrementCounter}
          onRemove={(counterId) => {
            onShowConfirmModal({
              title: 'Remove Counter',
              message: `Are you sure you want to remove the counter "${counter.name}"? This action cannot be undone.`,
              onConfirm: () => removeCounter(counterId)
            });
          }}
          onReset={resetCounter}
          onAddPlayer={(counterId) => {
            onShowAddPlayerForm(counterId, (playerName: string) => {
              addPlayerToCounter(counterId, playerName);
            });
          }}
          formatTime={formatTime}
          onSeekTo={onSeekTo}
          currentTime={currentTime}
          playerState={playerState}
        />
      ))}
      {showCounterForm ? (
        <CounterForm
          newCounterName={newCounterName}
          onNameChange={setNewCounterName}
          newCounterType={newCounterType}
          onTypeChange={setNewCounterType}
          newCounterPlayers={newCounterPlayers}
          newPlayerName={newPlayerName}
          onPlayerNameChange={setNewPlayerName}
          onAddPlayer={addPlayerToCounterForm}
          onRemovePlayer={removePlayerFromCounterForm}
          onSave={saveCounter}
          onCancel={handleCancelCounterForm}
        />
      ) : (
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleAddCounter}
            className="w-full px-3 py-2 rounded bg-blue-700 hover:bg-blue-600 text-white"
          >
            Add Counter
          </button>
        </div>
      )}
    </>
  );
};

export default CountersSection; 