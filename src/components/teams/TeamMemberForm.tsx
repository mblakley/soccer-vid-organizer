import React from 'react';
import { TeamMemberFormData } from '@/lib/types/teams';

interface TeamMemberFormProps {
  formData: TeamMemberFormData;
  isDarkMode: boolean;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onRoleChange: (role: string) => void;
  selectedRoles: string[];
}

export function TeamMemberForm({
  formData,
  isDarkMode,
  isSubmitting,
  onSubmit,
  onInputChange,
  onRoleChange,
  selectedRoles,
}: TeamMemberFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="name"
            className={`block text-sm font-medium ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={onInputChange}
            required
            className={`mt-1 block w-full rounded-md shadow-sm ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'border-gray-300 text-gray-900'
            }`}
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className={`block text-sm font-medium ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={onInputChange}
            required
            className={`mt-1 block w-full rounded-md shadow-sm ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'border-gray-300 text-gray-900'
            }`}
          />
        </div>

        <div>
          <label
            htmlFor="jersey_number"
            className={`block text-sm font-medium ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}
          >
            Jersey Number
          </label>
          <input
            type="number"
            id="jersey_number"
            name="jersey_number"
            value={formData.jersey_number}
            onChange={onInputChange}
            min="0"
            max="99"
            className={`mt-1 block w-full rounded-md shadow-sm ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'border-gray-300 text-gray-900'
            }`}
          />
        </div>

        <div>
          <label
            htmlFor="position"
            className={`block text-sm font-medium ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}
          >
            Position
          </label>
          <select
            id="position"
            name="position"
            value={formData.position}
            onChange={onInputChange}
            className={`mt-1 block w-full rounded-md shadow-sm ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'border-gray-300 text-gray-900'
            }`}
          >
            <option value="">Select Position</option>
            <option value="Goalkeeper">Goalkeeper</option>
            <option value="Defender">Defender</option>
            <option value="Midfielder">Midfielder</option>
            <option value="Forward">Forward</option>
          </select>
        </div>
      </div>

      <div>
        <label
          className={`block text-sm font-medium ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`}
        >
          Roles
        </label>
        <div className="mt-2 space-y-2">
          {['player', 'coach', 'parent'].map((role) => (
            <label
              key={role}
              className={`inline-flex items-center mr-4 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedRoles.includes(role)}
                onChange={() => onRoleChange(role)}
                className={`rounded ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-blue-500'
                    : 'border-gray-300 text-blue-600'
                }`}
              />
              <span className="ml-2 capitalize">{role}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            isDarkMode
              ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-800'
              : 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-400'
          }`}
        >
          {isSubmitting ? 'Adding...' : 'Add Team Member'}
        </button>
      </div>
    </form>
  );
} 