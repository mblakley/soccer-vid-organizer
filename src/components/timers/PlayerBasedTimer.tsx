import React from 'react';
import { PlayerTimerProps } from './TimerInterfaces';

const PlayerBasedTimer: React.FC<PlayerTimerProps> = ({
  timer,
  onRemove,
  onAddPlayer,
  onTogglePlayerTimer,
  formatTime,
  getCurrentTime,
  onSelectPlayerForSessions,
  selectedPlayerForSessions
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
      
      {/* Player-based content */}
      <div className="flex-1 flex flex-col justify-center w-full">
        <div className="w-full grid grid-cols-3 gap-2 mt-2">
          {timer.players?.map(player => {
            const playerTime = timer.playerTimes?.[player];
            const isActive = playerTime?.active || false;
            const duration = playerTime?.duration || 0;
            const currentSessionTime = isActive && playerTime?.startTime && getCurrentTime
              ? getCurrentTime() - playerTime.startTime 
              : 0;
            const totalTime = isActive ? duration + currentSessionTime : duration;
            
            return (
              <button
                key={player}
                onClick={() => onTogglePlayerTimer(timer.id, player)}
                className={`px-1 py-1 ${isActive ? 'bg-green-800 hover:bg-green-700' : 'bg-blue-800 hover:bg-blue-700'} rounded text-center`}
              >
                <div className="text-xs truncate flex items-center justify-center">
                  {player}
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-1"></div>
                  )}
                </div>
                <div className="text-lg font-bold">
                  {formatTime(totalTime)}
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Add Player button */}
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => onAddPlayer(timer.id, '')}
            className="px-2 py-1 bg-green-700 hover:bg-green-600 rounded text-center flex items-center justify-center text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Player
          </button>
        </div>

        {/* Sessions view */}
        {timer.players && timer.players.length > 0 && (
          <div className="mt-3">
            <select 
              className="w-full px-3 py-1 rounded bg-gray-800 border border-gray-700 text-white text-xs"
              onChange={(e) => {
                const selectedPlayer = e.target.value;
                if (!selectedPlayer) {
                  onSelectPlayerForSessions(timer.id, '');
                  return;
                }
                
                onSelectPlayerForSessions(timer.id, selectedPlayer);
              }}
              value={selectedPlayerForSessions?.timerId === timer.id ? selectedPlayerForSessions?.playerName : ""}
            >
              <option value="">View player sessions...</option>
              {timer.players.map(player => (
                <option key={player} value={player}>
                  {player} ({timer.playerTimes?.[player]?.sessions.length || 0} sessions)
                </option>
              ))}
            </select>
            
            {/* Display sessions for selected player */}
            {selectedPlayerForSessions?.timerId === timer.id && selectedPlayerForSessions?.playerName && (
              <div className="mt-2 max-h-28 overflow-y-auto text-xs">
                <div className="text-xs text-gray-400 mb-1">Sessions for {selectedPlayerForSessions.playerName}:</div>
                {timer.playerTimes?.[selectedPlayerForSessions.playerName]?.sessions.map((session, index) => (
                  <div key={index} className="flex justify-between py-1 border-b border-gray-700">
                    <span>{formatTime(session.startTime)}-{session.endTime ? formatTime(session.endTime) : 'Active'}</span>
                    <span>{formatTime(session.duration)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerBasedTimer; 