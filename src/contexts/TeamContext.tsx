'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getCurrentUser, User, getUserTeams } from '@/lib/auth'
import { TeamRole } from '@/lib/types'
import { useRouter } from 'next/router'

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
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoadingUser(true)
      try {
        console.log("[TeamContext] Starting to fetch user data")
        const user = await getCurrentUser()
        console.log("[TeamContext] Fetched user data:", user)
        setCurrentUser(user)
        if (user) {
          const teams = getUserTeams(user)
          console.log("[TeamContext] User teams:", teams)
          setUserTeams(teams)
          
          // Get team_id from URL query parameters (highest priority)
          const urlTeamId = router.query.team_id as string
          console.log("[TeamContext] URL team_id parameter:", urlTeamId)
          
          // Get persistent team selection if available
          const currentTeamId = typeof window !== 'undefined' ? localStorage.getItem('current_team_id') : null
          console.log("[TeamContext] Current team_id from localStorage:", currentTeamId)
          
          // Order of priority for team selection:
          // 1. URL parameter (someone clicked a link with team_id)
          if (urlTeamId) {
            console.log("[TeamContext] Found team_id in URL:", urlTeamId)
            const teamExists = teams.some(team => team.id === urlTeamId)
            console.log("[TeamContext] Team exists in user's teams:", teamExists)
            
            if (teamExists) {
              console.log("[TeamContext] URL team_id is valid, using it:", urlTeamId)
              setSelectedTeamId(urlTeamId)
              
              // If this came from a URL, also save it as the current team
              localStorage.setItem('current_team_id', urlTeamId)
              console.log("[TeamContext] Saved URL team_id to localStorage")
              
              // Clear the team_id from URL to avoid issues with browser refreshes
              const newUrl = new URL(window.location.href)
              newUrl.searchParams.delete('team_id')
              window.history.replaceState({}, '', newUrl.toString())
              console.log("[TeamContext] Cleared team_id from URL")
            } else {
              console.log("[TeamContext] URL team_id is not valid for user's teams:", urlTeamId)
              console.log("[TeamContext] Available teams:", teams.map(t => t.id))
            }
          } 
          // 2. Saved selection from localStorage
          else if (currentTeamId) {
            console.log("[TeamContext] Checking localStorage team_id:", currentTeamId)
            const teamExists = teams.some(team => team.id === currentTeamId)
            console.log("[TeamContext] Team exists in user's teams:", teamExists)
            
            if (teamExists) {
              console.log("[TeamContext] Using current team_id from localStorage:", currentTeamId)
              setSelectedTeamId(currentTeamId)
            } else {
              console.log("[TeamContext] localStorage team_id is not valid, clearing it")
              localStorage.removeItem('current_team_id')
            }
          } 
          // 3. Default to first team if nothing else available
          else if (selectedTeamId === null && teams.length > 0) {
            console.log("[TeamContext] No team_id found, defaulting to first team:", teams[0].id)
            setSelectedTeamId(teams[0].id)
            localStorage.setItem('current_team_id', teams[0].id)
            console.log("[TeamContext] Saved default team_id to localStorage")
          }
        } else {
          console.log("[TeamContext] No user data, clearing teams")
          setUserTeams([])
        }
      } catch (error) {
        console.error("[TeamContext] Failed to fetch current user:", error)
        setCurrentUser(null)
        setUserTeams([])
      } finally {
        setIsLoadingUser(false)
      }
    }
    fetchUser()
  }, [router.query.team_id])

  useEffect(() => {
    if (currentUser && selectedTeamId) {
      const roles = currentUser.teamRoles?.[selectedTeamId]?.roles || null
      console.log("[TeamContext] Setting selected team roles:", roles)
      setSelectedTeamRoles(roles)
    } else {
      console.log("[TeamContext] No current user or selected team, clearing roles")
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