import React from 'react';
import { PlayerCounterProps } from './CounterInterfaces';
import { UserPlus } from 'lucide-react';

const PlayerCounter: React.FC<PlayerCounterProps> = ({
  counter,
  onIncrement,
  onRemove,
  onAddPlayer,
  formatTime,
  onSeekTo
}) => {
  return (
    <div
      className="relative p-4 border-b border-gray-800 hover:bg-gray-800 cursor-pointer group flex flex-col justify-between min-h-[120px]"
    >
      {/* Name and Remove X in a row at the top */}
      <div className="flex items-center justify-between w-full mb-2">
        <span className="font-semibold text-center w-full pr-6">{counter.name}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(counter.id);
          }}
          className="ml-2 w-6 h-6 flex items-center justify-center rounded-full text-xs bg-red-700 hover:bg-red-800 text-white opacity-80 group-hover:opacity-100 transition-opacity"
          title="Remove counter"
        >
          ×
        </button>
      </div>
      
      {/* Player-based content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="text-2xl font-bold mb-2">Total: {counter.count}</div>
        <div className="w-full grid grid-cols-3 gap-2">
          {counter.players?.map(player => (
            <button
              key={player}
              onClick={(e) => {
                e.stopPropagation();
                onIncrement(counter.id, player);
              }}
              className="px-1 py-1 bg-blue-800 hover:bg-blue-700 rounded text-center"
            >
              <div className="text-xs truncate">{player}</div>
              <div className="text-lg font-bold">{counter.playerCounts?.[player]?.count || 0}</div>
            </button>
          ))}
        </div>
        
        {/* Add Player button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            // This will trigger the parent to show the add player form
            // The parent component manages the state for showing the form
            // and will call onAddPlayer with the entered player name
            onAddPlayer(counter.id, '');
          }}
          className="mt-3 px-2 py-1 bg-green-700 hover:bg-green-600 rounded text-center flex items-center justify-center text-sm"
        >
          <UserPlus size={16} className="mr-1" />
          Add Player
        </button>
      </div>
      
      {/* Player timestamps */}
      {counter.players && (
        <div className="mt-2">
          <select
            className="w-full px-3 py-1 rounded bg-gray-800 border border-gray-700 text-white text-xs"
            onChange={(e) => {
              const player = e.target.value;
              if (player && counter.playerCounts?.[player]?.timestamps.length) {
                const time = counter.playerCounts[player].timestamps[0];
                onSeekTo(time);
              }
            }}
          >
            <option value="">View player timestamps...</option>
            {counter.players.map(player => 
              counter.playerCounts?.[player]?.timestamps.length ? (
                <option key={player} value={player}>
                  {player} ({counter.playerCounts[player].timestamps.length} timestamps)
                </option>
              ) : null
            )}
          </select>
        </div>
      )}
    </div>
  );
};

export default PlayerCounter; 