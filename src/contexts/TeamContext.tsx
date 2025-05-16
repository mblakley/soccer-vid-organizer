'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getCurrentUser, User, TeamRolesMap, getUserTeams } from '@/lib/auth'
import { TeamRole } from '@/lib/types'

type TeamContextType = {
  selectedTeamId: string | null
  setSelectedTeamId: (teamId: string | null) => void
  currentUser: User | null
  isLoadingUser: boolean
  userTeams: { id: string; name: string; roles: TeamRole[] }[]
  selectedTeamRoles: TeamRole[] | null
}

const TeamContext = createContext<TeamContextType | undefined>(undefined)

export function TeamProvider({ children }: { children: ReactNode }) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [userTeams, setUserTeams] = useState<{ id: string; name: string; roles: TeamRole[] }[]>([])
  const [selectedTeamRoles, setSelectedTeamRoles] = useState<TeamRole[] | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoadingUser(true)
      try {
        const user = await getCurrentUser()
        setCurrentUser(user)
        if (user) {
          const teams = getUserTeams(user)
          setUserTeams(teams)
          // Default to first team if none selected and teams are available
          if (selectedTeamId === null && teams.length > 0) {
            setSelectedTeamId(teams[0].id)
          }
        } else {
          setUserTeams([])
        }
      } catch (error) {
        console.error("Failed to fetch current user:", error)
        setCurrentUser(null)
        setUserTeams([])
      } finally {
        setIsLoadingUser(false)
      }
    }
    fetchUser()
  }, []) // Fetch user once on mount

  useEffect(() => {
    if (currentUser && selectedTeamId) {
      const roles = currentUser.teamRoles?.[selectedTeamId]?.roles || null
      setSelectedTeamRoles(roles)
    } else {
      setSelectedTeamRoles(null)
    }
  }, [currentUser, selectedTeamId])

  return (
    <TeamContext.Provider
      value={{
        selectedTeamId,
        setSelectedTeamId,
        currentUser,
        isLoadingUser,
        userTeams,
        selectedTeamRoles,
      }}
    >
      {children}
    </TeamContext.Provider>
  )
}

export function useTeam() {
  const context = useContext(TeamContext)
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider')
  }
  return context
} 