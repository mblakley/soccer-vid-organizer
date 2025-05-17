'use client'
import { useEffect, useState } from 'react'
import RequestRoleForm from '@/components/RequestRoleForm'
import { withAuth } from '@/components/auth'
import { getCurrentUser } from '@/lib/auth'
import { useTheme } from '@/contexts/ThemeContext'

function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { isDarkMode, toggleTheme } = useTheme()

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getCurrentUser()
        setUser(userData)
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>
  if (!user) return <div className="p-8">User not found. Please log in again.</div>

  // Determine if there are any roles to display to prevent empty sections
  const hasAdminRole = user.isAdmin;
  const hasTeamRoles = user.teamRoles && Object.keys(user.teamRoles).length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mt-8 mb-6">Your Profile</h1>
      
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
      {(hasAdminRole || hasTeamRoles) && (
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
          {hasTeamRoles && Object.entries(user.teamRoles).map(([teamId, teamData]: [string, any]) => {
            if (teamData.roles && teamData.roles.length > 0) {
              const teamIdentifier = teamData.name || `Team ID: ${teamId.substring(0, 6)}...`;
              return (
                <div key={teamId} className="mb-4">
                  <h3 className={`text-md font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                    {teamIdentifier}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {teamData.roles.map((role: string) => (
                      <span 
                        key={`${teamId}-${role}`}
                        className={`px-2 py-1 ${isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'} rounded text-sm`}
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })}

          {!hasAdminRole && !hasTeamRoles && (
             <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} italic`}>No roles assigned</p>
          )}
        </div>
      )}

      {!hasAdminRole && !hasTeamRoles && (
         <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-sm p-6 mb-8`}>
             <h2 className="text-xl font-semibold mb-4">Your Roles</h2>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} italic`}>No roles assigned</p>
        </div>
      )}
      
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
      
      <div className="mt-8">
        <RequestRoleForm userRoles={user.roles || []} pendingRoles={user.pending_roles || []} />
      </div>
    </div>
  )
}

export default withAuth(ProfilePage, undefined, 'Profile') 