'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTeam } from '@/contexts/TeamContext';
import { useTheme } from '@/contexts/ThemeContext';
import { TeamRole } from '@/lib/types';
import { 
  Home, Users, Video as VideoIcon, Settings, ShieldCheck, BarChart3, 
  FolderKanban, ClipboardList, X as CloseIcon,
  ChevronDown, ChevronRight, CalendarDays, Film
} from 'lucide-react';

interface NavItem {
  id: string;
  path?: string;
  label: string;
  icon?: React.ElementType;
  requiredRoles?: TeamRole[];
  adminOnly?: boolean;
  teamRequired?: boolean;
  global?: boolean;
  children?: NavItem[];
  isCategory?: boolean;
}

const allNavItems: NavItem[] = [
  { id: 'home', path: '/', label: 'Home', icon: Home, global: true },
  {
    id: 'players',
    label: 'Player',
    icon: Users,
    isCategory: true,
    teamRequired: true,
    children: [
      { id: 'player-stats', path: '/team/players/stats', label: 'Stats', icon: BarChart3, teamRequired: true, requiredRoles: ['coach', 'manager', 'player'] },
    ]
  },
  {
    id: 'videos',
    label: 'Videos',
    icon: VideoIcon,
    isCategory: true,
    global: true,
    requiredRoles: ['coach', 'manager', 'player', 'parent'],
    children: [
      { 
        id: 'video-library', 
        path: '/videos', 
        label: 'Video Library', 
        icon: VideoIcon, 
        global: true,
        requiredRoles: ['coach', 'manager', 'player', 'parent'] 
      },
      { 
        id: 'analyze-video', 
        path: '/videos/analyze', 
        label: 'Analyze Video', 
        icon: FolderKanban, 
        teamRequired: true, 
        requiredRoles: ['coach'] 
      },
      { 
        id: 'film-review',
        path: '/videos/reviews',
        label: 'Film Review',
        icon: Film,
        global: true,
        requiredRoles: ['coach', 'manager', 'player', 'parent'] 
      },
    ]
  },
  {
    id: 'games',
    label: 'Games',
    icon: CalendarDays,
    isCategory: true,
    teamRequired: true,
    children: [
      { id: 'team-schedule', path: '/team/schedule', label: 'Schedule', icon: ClipboardList, teamRequired: true, requiredRoles: ['coach', 'manager', 'player', 'parent'] },
      { id: 'game-stats', path: '/team/games/stats', label: 'Stats', icon: BarChart3, teamRequired: true, requiredRoles: ['coach', 'manager'] },
    ]
  },
  {
    id: 'teams',
    label: 'Teams',
    icon: ShieldCheck,
    isCategory: true,
    teamRequired: true,
    children: [
      { id: 'team-dashboard', path: '/team/dashboard', label: 'Dashboard', icon: BarChart3, teamRequired: true, requiredRoles: ['coach', 'manager'] },
      { id: 'team-roster', path: '/team/roster', label: 'Roster', icon: Users, teamRequired: true, requiredRoles: ['coach', 'manager'] },
    ]
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: Settings,
    isCategory: true,
    adminOnly: true,
    global: true,
    children: [
      { id: 'admin-overview', path: '/admin', label: 'Overview', icon: Settings, adminOnly: true, global: true },
      { id: 'admin-users', path: '/admin/users', label: 'Manage Users', icon: Users, adminOnly: true, global: true },
      { id: 'admin-teams', path: '/admin/teams', label: 'Manage Teams', icon: ShieldCheck, adminOnly: true, global: true },
      { id: 'admin-team-members', path: '/admin/team-members', label: 'Team Members', icon: Users, adminOnly: true, global: true },
    ]
  },
];

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const isNavItemVisible = (item: NavItem, currentUser: any, selectedTeamId: string | null, selectedTeamRoles: TeamRole[] | null): boolean => {
  // Admin pages are always visible to admins, regardless of team selection
  if (item.adminOnly) {
    return currentUser?.isAdmin || false;
  }
  
  // If the item is global and doesn't require a team, it's always visible
  if (!item.adminOnly && item.global && !item.teamRequired && !item.requiredRoles) {
    return true;
  }

  // Check if user has any roles at all
  const teamRoles = currentUser?.teamRoles as Record<string, { roles: TeamRole[] }> || {};
  const hasAnyRoles = Object.values(teamRoles).some((team: any) => 
    team.roles && Array.isArray(team.roles) && team.roles.length > 0
  );
  
  // If user has no roles and the item requires roles, don't show it
  if (!hasAnyRoles && (item.requiredRoles || item.teamRequired)) {
    return false;
  }

  // If no team is selected (All Teams view)
  if (!selectedTeamId) {
    // For team-required items, check if user has the required roles in ALL teams
    if (item.teamRequired) {
      if (!item.requiredRoles || item.requiredRoles.length === 0) return true;
      
      // Check if user has the required roles in ALL teams
      const teams = Object.values(teamRoles);
      
      // If user has no teams, don't show team-required items
      if (teams.length === 0) return false;
      
      // Check if user has the required roles in ALL teams
      const hasRequiredRolesInAllTeams = teams.every(team => 
        item.requiredRoles?.some(requiredRole => team.roles.includes(requiredRole))
      );
      return hasRequiredRolesInAllTeams;
    }
    return false;
  }

  // For specific team selection
  if (item.teamRequired) {
    if (!selectedTeamId) return false;
    if (!item.requiredRoles || item.requiredRoles.length === 0) return true;
    if (!selectedTeamRoles) return false;
    return item.requiredRoles.some(role => selectedTeamRoles.includes(role));
  }

  return false;
};

const AppSidebar: React.FC<AppSidebarProps> = ({ isOpen, onClose }) => {
  const { currentUser, selectedTeamId, selectedTeamRoles, isLoadingUser } = useTeam();
  const { isDarkMode } = useTheme();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  if (isLoadingUser || !currentUser) return null;
  if (!isOpen) return null;

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const renderNavItems = (items: NavItem[], isSubmenu = false) => {
    return items.map(item => {
      const visibleChildren = item.children?.filter(child => isNavItemVisible(child, currentUser, selectedTeamId, selectedTeamRoles)) || [];
      let isEffectivelyVisible = false;
      if (item.isCategory) {
        const categoryContextuallyVisible = isNavItemVisible(item, currentUser, selectedTeamId, selectedTeamRoles);
        isEffectivelyVisible = categoryContextuallyVisible && visibleChildren.length > 0;
      } else {
        isEffectivelyVisible = isNavItemVisible(item, currentUser, selectedTeamId, selectedTeamRoles);
      }

      if (!isEffectivelyVisible) return null;

      if (item.isCategory) {
        const CategoryIcon = item.icon || FolderKanban;
        const IsCategoryOpenIcon = openCategories[item.id] ? ChevronDown : ChevronRight;
        return (
          <div key={item.id} className={isSubmenu ? 'pl-4' : ''}>
            <div
              onClick={() => toggleCategory(item.id)}
              className={`flex items-center justify-between space-x-3 p-2 rounded-md cursor-pointer text-sm font-medium ${isDarkMode ? 'hover:bg-gray-700 hover:text-white' : 'hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <div className="flex items-center space-x-3">
                <CategoryIcon size={18} className="flex-shrink-0" />
                <span>{item.label}</span>
              </div>
              <IsCategoryOpenIcon size={16} />
            </div>
            {openCategories[item.id] && visibleChildren.length > 0 && (
              <div className="pt-1 pl-3 space-y-1 border-l ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} ml-2.5">
                {renderNavItems(visibleChildren, true)}
              </div>
            )}
          </div>
        );
      }

      return (
        <Link 
          href={item.path!} 
          key={item.id}
          onClick={onClose}
          className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer text-sm ${isDarkMode ? 'hover:bg-gray-700 hover:text-white' : 'hover:bg-gray-100 hover:text-gray-900'} ${isSubmenu ? 'ml-4' : ''}`}
        >
          {item.icon && <item.icon size={18} className="flex-shrink-0" />}
          <span>{item.label}</span>
        </Link>
      );
    }).filter(Boolean);
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity duration-300 ease-in-out"
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <aside
        className={`fixed top-0 left-0 w-64 h-full transform transition-transform duration-300 ease-in-out z-40 
                  ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700 shadow-lg'}
                  ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className={`flex justify-between items-center p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className="text-lg font-semibold">Menu</h2>
          <button onClick={onClose} className={`p-1 rounded-md ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`} aria-label="Close menu">
            <CloseIcon size={20} />
          </button>
        </div>
        <nav className="p-2 space-y-1 overflow-y-auto" style={{maxHeight: 'calc(100vh - 65px)'}}>
          {renderNavItems(allNavItems)}
        </nav>
      </aside>
    </>
  );
};

export default AppSidebar; 