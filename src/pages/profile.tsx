'use client'
import { useEffect, useState, useCallback } from 'react'
import RequestRoleForm from '@/components/RequestRoleForm'
import { withAuth } from '@/components/auth'
import { getCurrentUser, refreshUserSession, User } from '@/lib/auth'
import { useTheme } from '@/contexts/ThemeContext'
import { apiClient } from '@/lib/api/client'
import { TeamRole, TeamRolesResponse } from '@/lib/types/teams'

function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<{ id: string, name: string } | null>(null)
  const [pendingRolesForSelectedTeam, setPendingRolesForSelectedTeam] = useState<TeamRole[]>([])
  const [fetchingPendingRoles, setFetchingPendingRoles] = useState(false)
  const { isDarkMode, toggleTheme } = useTheme()

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true)
        
        // First refresh the token to get latest claims
        setRefreshing(true)
        console.log('[Profile] Refreshing user session...')
        const refreshedUser = await refreshUserSession()
        setRefreshing(false)
        
        if (refreshedUser) {
          console.log('[Profile] Session refreshed successfully')
          setUser(refreshedUser)
        } else {
          console.log('[Profile] Token refresh failed, falling back to getCurrentUser')
          const userData = await getCurrentUser()
          setUser(userData)
        }
      } catch (error) {
        console.error('[Profile] Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  // Callback to fetch pending roles for a selected team
  const fetchPendingRoles = useCallback(async (teamId: string, userId: string) => {
    if (!teamId || !userId) return;
    setFetchingPendingRoles(true);
    try {
      const rolesData = await apiClient.get<TeamRolesResponse>(`/api/teams/roles?teamId=${teamId}&userId=${userId}`);
      if (rolesData && rolesData.pendingRoles) {
        setPendingRolesForSelectedTeam(rolesData.pendingRoles as TeamRole[]);
      } else {
        console.error('Error fetching pending roles: Invalid data', rolesData);
        setPendingRolesForSelectedTeam([]);
      }
    } catch (error) {
      console.error('Error fetching pending roles:', error);
      setPendingRolesForSelectedTeam([]);
    } finally {
      setFetchingPendingRoles(false);
    }
  }, []);

  // Effect to fetch pending roles when selectedTeam changes
  useEffect(() => {
    if (selectedTeam && user) {
      fetchPendingRoles(selectedTeam.id, user.id);
    } else {
      setPendingRolesForSelectedTeam([]); // Clear if no team selected or no user
    }
  }, [selectedTeam, user, fetchPendingRoles]);

  if (loading) return <div className="p-8">Loading...</div>
  if (!user) return <div className="p-8">User not found. Please log in again.</div>

  // Determine if there are any roles to display to prevent empty sections
  const hasAdminRole = user.isAdmin;
  const hasTeamRoles = user.teamRoles && Object.keys(user.teamRoles).length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mt-8 mb-6">Your Profile</h1>
      
      {refreshing && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
        }`}>
          Refreshing session to get your latest roles and permissions...
        </div>
      )}
      
      <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-sm p-6 mb-8`}>
        <h2 className="text-xl font-semibold mb-4">Account Information</h2>
        <div className="grid gap-4">
          <div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>User ID</p>
            <p className="font-mono text-sm">{user.id}</p>
          </div>
        </div>
      </div>

      {/* Roles Section - Updated Structure */}
      <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-sm p-6 mb-8`}>
        <h2 className="text-xl font-semibold mb-4">Your Roles</h2>
        
        {/* General Roles (Admin) */}
        {hasAdminRole && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              <span 
                className={`px-2 py-1 ${isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'} rounded text-sm`}
              >
                Admin
              </span>
            </div>
          </div>
        )}

        {/* Team Roles */}
        {hasTeamRoles && Object.entries(user.teamRoles).map(([teamId, teamData]: [string, { name: string; roles: TeamRole[] }]) => {
          const teamIdentifier = teamData.name || `Team ID: ${teamId.substring(0, 6)}...`;
          
          return (
            <div key={teamId} className="mb-6 border-b border-gray-700 pb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className={`text-md font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  {teamIdentifier}
                </h3>
                <button
                  onClick={() => setSelectedTeam({ id: teamId, name: teamData.name })}
                  className={`px-3 py-1 rounded text-sm ${
                    isDarkMode 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  Request Role
                </button>
              </div>
              
              {/* Team roles */}
              {teamData.roles && teamData.roles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {teamData.roles.map((role: string) => (
                    <span 
                      key={`${teamId}-${role}`}
                      className={`px-2 py-1 ${isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'} rounded text-sm`}
                    >
                      {role}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {!hasAdminRole && !hasTeamRoles && (
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} italic`}>No roles assigned</p>
        )}

        {/* Role Request Form - Only shown when a team is selected */}
        {selectedTeam && user && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">
              Request Roles for: {selectedTeam.name}
            </h3>
            {fetchingPendingRoles ? (
              <p>Loading role information...</p>
            ) : (
              <RequestRoleForm 
                userRoles={user.teamRoles?.[selectedTeam.id]?.roles || []} 
                pendingRoles={pendingRolesForSelectedTeam}
                teamId={selectedTeam.id}
                teamName={selectedTeam.name}
              />
            )}
          </div>
        )}
      </div>
      
      {/* Theme Preferences Section */}
      <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-sm p-6 mb-8`}>
        <h2 className="text-xl font-semibold mb-4">Display Preferences</h2>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Theme</h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Choose between light and dark mode
            </p>
          </div>
          <button 
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <span>{isDarkMode ? 'Dark' : 'Light'}</span>
            <span>{isDarkMode ? '🌙' : '☀️'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default withAuth(ProfilePage) 