import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import RequestRoleForm from '@/components/RequestRoleForm';
import { useTheme } from '@/contexts/ThemeContext';
import { apiClient } from '@/lib/api/client';
import { withAuth, User } from '@/components/auth';
import { TeamRole } from '@/lib/types';
import { ListTeamsResponse, TeamRolesResponse, AvailableTeam } from '@/lib/types/teams';

interface RoleRequestPageProps {
  user: User | null;
}

export function RoleRequestPage({ user }: RoleRequestPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<AvailableTeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [userRoles, setUserRoles] = useState<TeamRole[]>([]);
  const [pendingRoles, setPendingRoles] = useState<TeamRole[]>([]);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const { isDarkMode } = useTheme();
  const { teamId: teamIdFromQuery } = router.query;

  const fetchRolesForTeam = useCallback(async (teamId: string, userId: string) => {
    try {
      const rolesData = await apiClient.get<TeamRolesResponse>(`/api/teams/roles?teamId=${teamId}&userId=${userId}`);
      
      if (rolesData && rolesData.userRoles !== undefined && rolesData.pendingRoles !== undefined) {
        setUserRoles(rolesData.userRoles as TeamRole[]);
        setPendingRoles(rolesData.pendingRoles as TeamRole[]);
      } else {
        console.error('Error fetching roles: Invalid data received', rolesData);
        setUserRoles([]);
        setPendingRoles([]);
      }
    } catch (error: any) {
      console.error('Error fetching roles:', error);
      setUserRoles([]);
      setPendingRoles([]);
    }
  }, []);

  useEffect(() => {
    const initializePage = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const teamData = await apiClient.get<ListTeamsResponse>('/api/teams/list');
        
        if (teamData && teamData.teams) {
          setTeams(teamData.teams as AvailableTeam[]);
          
          const currentTeamId = Array.isArray(teamIdFromQuery) ? teamIdFromQuery[0] : teamIdFromQuery;
          if (currentTeamId && typeof currentTeamId === 'string') {
            const foundTeam = teamData.teams.find((t) => t.id === currentTeamId);
            if (foundTeam) {
              setSelectedTeam(currentTeamId);
              fetchRolesForTeam(currentTeamId, user.id!);
            } else {
              console.warn(`Team with ID ${currentTeamId} not found in fetched list.`);
            }
          }
        } else {
          console.error('Error fetching teams:', (teamData as any)?.message || 'No teams data returned');
          setTeams([]);
        }
      } catch (error: any) {
        console.error('Error initializing page:', error);
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };
    
    initializePage();
  }, [user, teamIdFromQuery, fetchRolesForTeam]);
  
  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTeamId = e.target.value;
    setSelectedTeam(newTeamId);
    if (newTeamId && user) {
      fetchRolesForTeam(newTeamId, user.id!);
    } else {
      setUserRoles([]);
      setPendingRoles([]);
    }
  };
  
  const selectedTeamName = selectedTeam 
    ? teams.find((t) => t.id === selectedTeam)?.name
    : undefined;
  
  const handleSubmissionComplete = () => {
    setSubmissionComplete(true);
  };
  
  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <>
      <Head>
        <title>Request Team Role</title>
      </Head>
      
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="container mx-auto py-8 px-4 flex flex-col items-center">
          <h1 className="text-3xl font-bold mb-6 text-center">Request a Team Role</h1>
          
          {submissionComplete ? (
            <div className={`p-6 border rounded-lg ${isDarkMode ? 'bg-green-900 border-green-800 text-green-100' : 'bg-green-50 border-green-200 text-green-900'} shadow-sm max-w-md mx-auto text-center`}>
              <h2 className="text-xl font-semibold mb-3">Thank you for submitting your request</h2>
              <p>You will receive an email when your request has been reviewed.</p>
            </div>
          ) : (
            <>
              <div className="mb-8 w-full max-w-md">
                <label className={`block ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm font-bold mb-2`}>
                  Select Team
                </label>
                <select
                  className={`shadow appearance-none border rounded w-full py-2 px-3 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-700'
                  } leading-tight focus:outline-none focus:shadow-outline`}
                  value={selectedTeam}
                  onChange={handleTeamChange}
                >
                  <option value="">-- Select a team --</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedTeam && user ? (
                <RequestRoleForm 
                  teamId={selectedTeam}
                  teamName={selectedTeamName}
                  userRoles={userRoles}
                  pendingRoles={pendingRoles}
                  onSubmissionComplete={handleSubmissionComplete}
                />
              ) : (
                <div className={`p-4 border rounded-lg ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'} shadow-sm max-w-md text-center`}>
                  <p>Please select a team to request a role for.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default withAuth(RoleRequestPage, {
  requireRole: false,
  teamId: 'any',
  roles: [],
}, 'Request Team Role'); 