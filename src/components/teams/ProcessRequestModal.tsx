import React from 'react';
import { AdminDisplayTeamRequest } from '@/lib/types/admin';

interface ProcessRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  request: AdminDisplayTeamRequest | null;
  isDarkMode: boolean;
  isProcessing: boolean;
}

export function ProcessRequestModal({
  isOpen,
  onClose,
  onApprove,
  onReject,
  request,
  isDarkMode,
  isProcessing,
}: ProcessRequestModalProps) {
  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className={`absolute inset-0 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-500'} opacity-75`}></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div
          className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
                isDarkMode ? 'bg-blue-900' : 'bg-blue-100'
              }`}>
                <svg
                  className={`h-6 w-6 ${isDarkMode ? 'text-blue-200' : 'text-blue-600'}`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3
                  className={`text-lg leading-6 font-medium ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-900'
                  }`}
                >
                  Process Team Request
                </h3>
                <div className="mt-2">
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    {request.user_name} is requesting to {request.request_type} the team with the following roles:
                  </p>
                  <ul className={`mt-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    {request.requested_roles.map((role) => (
                      <li key={role} className="capitalize">
                        • {role}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className={`px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <button
              type="button"
              onClick={onApprove}
              disabled={isProcessing}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                isDarkMode
                  ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-800'
                  : 'bg-green-600 hover:bg-green-700 disabled:bg-green-500'
              }`}
            >
              {isProcessing ? 'Processing...' : 'Approve'}
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={isProcessing}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                isDarkMode
                  ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-800'
                  : 'bg-red-600 hover:bg-red-700 disabled:bg-red-500'
              }`}
            >
              {isProcessing ? 'Processing...' : 'Reject'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm ${
                isDarkMode
                  ? 'bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 