import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import RequestRoleForm from '@/components/RequestRoleForm';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/contexts/ThemeContext';

export default function RoleRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [pendingRoles, setPendingRoles] = useState<string[]>([]);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const { isDarkMode } = useTheme();
  const { teamId } = router.query;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await getCurrentUser();
        if (!userData) {
          // Redirect to login if not authenticated
          router.push('/login');
          return;
        }
        setUser(userData);
        
        // Load teams
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .order('name');
          
        if (teamsError) {
          console.error('Error fetching teams:', teamsError);
        } else {
          // Filter out the "Pending" team with ID '00000000-0000-0000-0000-000000000000'
          const filteredTeams = teamsData?.filter(team => team.id !== '00000000-0000-0000-0000-000000000000') || [];
          setTeams(filteredTeams);
          
          // If teamId is provided in the URL, set it as selected
          if (teamId && typeof teamId === 'string') {
            setSelectedTeam(teamId);
            fetchRolesForTeam(teamId, userData.id);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router, teamId]);
  
  const fetchRolesForTeam = async (teamId: string, userId: string) => {
    try {
      // Fetch user's current roles for this team
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select(`
          id,
          team_member_roles(role)
        `)
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
        
      if (!memberError && memberData) {
        const roles = memberData.team_member_roles.map((r: any) => r.role);
        setUserRoles(roles);
      } else {
        setUserRoles([]);
      }
      
      // Fetch pending role requests
      const { data: pendingData, error: pendingError } = await supabase
        .from('team_member_requests')
        .select('requested_roles')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();
        
      if (!pendingError && pendingData) {
        setPendingRoles(pendingData.requested_roles);
      } else {
        setPendingRoles([]);
      }
      
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };
  
  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const teamId = e.target.value;
    setSelectedTeam(teamId);
    if (teamId && user) {
      fetchRolesForTeam(teamId, user.id);
    }
  };
  
  const selectedTeamName = selectedTeam 
    ? teams.find(t => t.id === selectedTeam)?.name 
    : undefined;
  
  const handleSubmissionComplete = () => {
    setSubmissionComplete(true);
  };
  
  if (loading) {
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
              
              {selectedTeam ? (
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