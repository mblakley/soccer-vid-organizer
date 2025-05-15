import React from 'react';
import { CounterType } from './CounterInterfaces';

interface CounterFormProps {
  newCounterName: string;
  onNameChange: (name: string) => void;
  newCounterType: CounterType;
  onTypeChange: (type: CounterType) => void;
  newCounterPlayers: string[];
  newPlayerName: string;
  onPlayerNameChange: (name: string) => void;
  onAddPlayer: (player: string) => void;
  onRemovePlayer: (player: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const CounterForm: React.FC<CounterFormProps> = ({
  newCounterName,
  onNameChange,
  newCounterType,
  onTypeChange,
  newCounterPlayers,
  newPlayerName,
  onPlayerNameChange,
  onAddPlayer,
  onRemovePlayer,
  onSave,
  onCancel
}) => {
  return (
    <div className="p-4 border-t border-gray-800">
      <input
        type="text"
        value={newCounterName}
        onChange={e => onNameChange(e.target.value)}
        placeholder="Counter name"
        className="w-full mb-2 px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white"
      />
      <select
        value={newCounterType}
        onChange={e => onTypeChange(e.target.value as CounterType)}
        className="w-full mb-2 px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white"
      >
        <option value="standard">Standard (accumulates)</option>
        <option value="resettable">Resettable (for streaks)</option>
        <option value="player-based">Player-based (per player)</option>
      </select>
      {newCounterType === 'player-based' && (
        <div className="mb-3 border border-gray-700 rounded p-2">
          <label className="text-sm text-gray-400 mb-1 block">Add Players:</label>
          <div className="flex mb-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={e => onPlayerNameChange(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && onAddPlayer(newPlayerName)}
              placeholder="Player name"
              className="flex-1 px-3 py-2 rounded-l bg-gray-800 border border-gray-700 text-white"
            />
            <button
              onClick={() => onAddPlayer(newPlayerName)}
              className="px-3 py-2 rounded-r bg-blue-700 hover:bg-blue-600 text-white"
            >
              Add
            </button>
          </div>
          {newCounterPlayers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {newCounterPlayers.map(player => (
                <div key={player} className="flex items-center space-x-1 px-2 py-1 rounded text-sm bg-blue-900 text-blue-100">
                  <span>{player}</span>
                  <button onClick={() => onRemovePlayer(player)} className="hover:text-red-500">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex space-x-2">
        <button
          onClick={onSave}
          className="flex-1 px-3 py-2 rounded bg-green-700 hover:bg-green-600 text-white"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CounterForm; 