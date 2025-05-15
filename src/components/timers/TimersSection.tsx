import React from 'react';
import { useTimers } from '@/hooks/useTimers';
import TimerFactory from './TimerFactory';
import TimerForm from './TimerForm';

interface TimersSectionProps {
  userId: string;
  videoId?: string;
  onShowConfirmModal: (config: {
    title: string;
    message: string;
    onConfirm: () => void;
  }) => void;
  formatTime: (seconds: number) => string;
  onShowAddPlayerForm: (timerId: string) => void;
}

const TimersSection: React.FC<TimersSectionProps> = ({
  userId,
  videoId,
  onShowConfirmModal,
  formatTime,
  onShowAddPlayerForm
}) => {
  const {
    playerTimers,
    showTimerForm,
    newTimerName,
    newTimerType,
    newTimerPlayers,
    newTimerPlayerName,
    selectedPlayerForSessions,
    
    setNewTimerName,
    setNewTimerType,
    setNewTimerPlayerName,
    
    handleAddTimer,
    handleCancelTimerForm,
    saveTimer,
    addPlayerToTimerForm,
    removePlayerFromTimerForm,
    startTimer,
    stopTimer,
    resetTimer,
    removeTimer,
    togglePlayerTimer,
    handleSelectPlayerForSessions
  } = useTimers({
    userId,
    videoId
  });

  // Get current time (would be from player reference in real implementation)
  const getCurrentTime = () => {
    return Date.now() / 1000;
  };

  return (
    <>
      {playerTimers.length === 0 && (
        <div className="p-4 text-gray-400">No timers yet. Add one below.</div>
      )}
      {playerTimers.map(timer => (
        <TimerFactory
          key={timer.id}
          timer={timer}
          onStart={startTimer}
          onStop={stopTimer}
          onReset={resetTimer}
          onRemove={(timerId) => {
            onShowConfirmModal({
              title: 'Remove Timer',
              message: `Are you sure you want to remove the timer "${timer.name}"? This action cannot be undone.`,
              onConfirm: () => removeTimer(timerId)
            });
          }}
          onAddPlayer={(timerId) => {
            onShowAddPlayerForm(timerId);
          }}
          onTogglePlayerTimer={togglePlayerTimer}
          formatTime={formatTime}
          getCurrentTime={getCurrentTime}
          onSelectPlayerForSessions={handleSelectPlayerForSessions}
          selectedPlayerForSessions={selectedPlayerForSessions}
        />
      ))}
      
      {/* Add Timer Form */}
      {showTimerForm ? (
        <TimerForm
          newTimerName={newTimerName}
          onNameChange={setNewTimerName}
          newTimerType={newTimerType}
          onTypeChange={setNewTimerType}
          newTimerPlayers={newTimerPlayers}
          newTimerPlayerName={newTimerPlayerName}
          onPlayerNameChange={setNewTimerPlayerName}
          onAddPlayer={addPlayerToTimerForm}
          onRemovePlayer={removePlayerFromTimerForm}
          onSave={saveTimer}
          onCancel={handleCancelTimerForm}
        />
      ) : (
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleAddTimer}
            className="w-full px-3 py-2 rounded bg-blue-700 hover:bg-blue-600 text-white"
          >
            Add Timer
          </button>
        </div>
      )}
    </>
  );
};

export default TimersSection; 