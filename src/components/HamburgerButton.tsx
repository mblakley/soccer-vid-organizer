'use client';

import React from 'react';
import { Menu, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface HamburgerButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

const HamburgerButton: React.FC<HamburgerButtonProps> = ({ isOpen, onClick, className }) => {
  const { isDarkMode } = useTheme();
  const Icon = isOpen ? X : Menu;

  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset ${isDarkMode ? 'text-gray-300 hover:text-white focus:ring-gray-500' : 'text-gray-600 hover:text-gray-900 focus:ring-gray-400'} ${
        className || ''
      }`}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
    >
      <Icon size={24} />
    </button>
  );
};

export default HamburgerButton; 