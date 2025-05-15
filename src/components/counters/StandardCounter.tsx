import React from 'react';
import { CounterProps } from './CounterInterfaces';

const StandardCounter: React.FC<CounterProps> = ({
  counter,
  onIncrement,
  onRemove,
  formatTime,
  onSeekTo
}) => {
  return (
    <div
      className="relative p-4 border-b border-gray-800 hover:bg-gray-800 cursor-pointer group flex flex-col justify-between min-h-[120px]"
      onClick={() => onIncrement(counter.id)}
    >
      {/* Name and Remove X in a row at the top */}
      <div className="flex items-center justify-between w-full mb-2">
        <span className="font-semibold text-center w-full pr-6">{counter.name}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Handle confirmation in parent component
            onRemove(counter.id);
          }}
          className="ml-2 w-6 h-6 flex items-center justify-center rounded-full text-xs bg-red-700 hover:bg-red-800 text-white opacity-80 group-hover:opacity-100 transition-opacity"
          title="Remove counter"
        >
          ×
        </button>
      </div>
      
      {/* Counter value */}
      <div className="flex-1 flex items-center justify-center">
        <span className="text-6xl font-extrabold text-center select-none pointer-events-none">{counter.count}</span>
      </div>
      
      {/* Timestamps */}
      {counter.timestamps.length > 0 && (
        <div className="mt-2 text-xs text-gray-400 w-full text-center">
          {counter.timestamps.map((time, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onSeekTo(time);
              }}
              className="mr-1 px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700"
            >
              {formatTime(time)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StandardCounter; 