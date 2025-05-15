import React from 'react';
import { TimerProps } from './TimerInterfaces';

const StandardTimer: React.FC<TimerProps> = ({
  timer,
  onStart,
  onStop,
  onReset,
  onRemove,
  formatTime,
  getCurrentTime
}) => {
  return (
    <div
      className="relative p-4 border-b border-gray-800 hover:bg-gray-800 flex flex-col justify-between min-h-[120px]"
    >
      {/* Name and Remove X in a row at the top */}
      <div className="flex items-center justify-between w-full mb-2">
        <span className="font-semibold text-center w-full pr-6">{timer.name}</span>
        <button
          onClick={() => onRemove(timer.id)}
          className="ml-2 w-6 h-6 flex items-center justify-center rounded-full text-xs bg-red-700 hover:bg-red-800 text-white opacity-80 hover:opacity-100 transition-opacity"
          title="Remove timer"
        >
          ×
        </button>
      </div>
      
      {/* Timer status and duration */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-lg">
          {timer.active ? (
            <span className="text-green-500 flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse mr-2"></div>
              Running
            </span>
          ) : (
            <span>Stopped</span>
          )}
        </div>
        <div className="text-4xl font-bold mt-2">
          {formatTime(timer.duration)}
        </div>
        {timer.active && timer.startTime !== null && (
          <div className="text-sm text-blue-400 mt-1">
            Current session: {formatTime(getCurrentTime() - timer.startTime)}
          </div>
        )}
      </div>
      
      {/* Timer controls */}
      <div className="flex space-x-2 mt-2">
        {!timer.active ? (
          <button
            onClick={() => onStart(timer.id)}
            className="flex-1 px-3 py-2 rounded bg-green-700 hover:bg-green-600 text-white"
          >
            Start
          </button>
        ) : (
          <button
            onClick={() => onStop(timer.id)}
            className="flex-1 px-3 py-2 rounded bg-yellow-700 hover:bg-yellow-600 text-white"
          >
            Stop
          </button>
        )}
        <button
          onClick={() => onReset(timer.id)}
          className="flex-1 px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white"
        >
          Reset
        </button>
      </div>

      {/* Session list */}
      {timer.sessions.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-gray-400 mb-1">Sessions:</div>
          <div className="max-h-28 overflow-y-auto text-xs">
            {timer.sessions.map((session, index) => (
              <div key={index} className="flex justify-between py-1 border-b border-gray-700">
                <span>{formatTime(session.startTime)}-{session.endTime ? formatTime(session.endTime) : 'Active'}</span>
                <span>{formatTime(session.duration)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StandardTimer; 