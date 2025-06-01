'use client'
import { useEffect, useState, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'
import { withAuth, User } from '@/components/auth'
import { useTheme } from '@/contexts/ThemeContext'
import Link from 'next/link'
import { MessageSquare, Video, Film, Edit, AlertTriangle } from 'lucide-react'

interface CoachDashboardProps {
  user: User; // from withAuth
}

interface CommentsCountApiResponse {
  count?: number;
  message?: string;
}

function CoachDashboard({ user }: CoachDashboardProps) {
  const [unrepliedCount, setUnrepliedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isDarkMode } = useTheme()

  const fetchUnrepliedCommentsCount = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<CommentsCountApiResponse>('/api/comments/list?isReplyToNull=true&returnCountOnly=true');
      if (response && typeof response.count === 'number') {
        setUnrepliedCount(response.count);
      } else {
        setError(response.message || 'Failed to fetch unreplied comments count.');
      }
    } catch (err: any) {
      console.error('Error fetching unreplied comments count:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnrepliedCommentsCount();
  }, [fetchUnrepliedCommentsCount]);

  const cardClasses = `rounded-lg shadow-md p-6 flex flex-col items-center justify-center text-center transition-all duration-300 transform hover:scale-105 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50'}`;
  const linkClasses = `font-semibold ${isDarkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`;
  const iconClasses = `mb-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`;

  return (
    <div className={`p-4 md:p-8 space-y-8 ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-100 text-gray-800'}`}>
      <h1 className="text-3xl font-bold text-center md:text-left">Coach Dashboard</h1>
      
      {loading && (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`mt-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading dashboard data...</p>
        </div>
      )}

      {error && (
        <div className={`p-3 my-4 border rounded text-center ${isDarkMode ? 'bg-red-800 border-red-600 text-red-200' : 'bg-red-100 border-red-300 text-red-700'}`} role="alert">
          <h3 className="font-semibold flex items-center justify-center"><AlertTriangle size={18} className="mr-2"/>Error</h3>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/coach/videos" className={cardClasses}>
            <Video size={48} className={iconClasses} />
            <span className={linkClasses}>Manage Videos</span>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Upload, review, and tag game footage.</p>
          </Link>

          <Link href="/coach/analyze-video" className={cardClasses}>
            <Film size={48} className={iconClasses} />
            <span className={linkClasses}>Analyze & Create Clips</span>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Break down videos and generate insightful clips.</p>
          </Link>

          <Link href="/coach/clips" className={cardClasses}>
            <Edit size={48} className={iconClasses} />
            <span className={linkClasses}>Edit & Share Clips</span>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Refine, tag, and share clips with your team.</p>
          </Link>

          <div className={cardClasses}>
            <MessageSquare size={48} className={iconClasses} />
            <span className={linkClasses}>Unreplied Comments</span>
            <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{unrepliedCount}</p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Comments needing your attention.</p>
            {unrepliedCount > 0 && 
                <Link href="/comments?filter=unreplied" className={`mt-3 text-xs ${linkClasses}`}>View Comments</Link>
            }
          </div>
          
          {/* Placeholder for more dashboard items */}
          {/* <Link href="/coach/rosters" className={cardClasses}>
            <Users size={48} className={iconClasses} />
            <span className={linkClasses}>Manage Rosters</span>
          </Link>
          <Link href="/coach/training" className={cardClasses}>
            <ClipboardList size={48} className={iconClasses} />
            <span className={linkClasses}>Training Sessions</span>
          </Link> */}
        </div>
      )}
    </div>
  )
}

export default withAuth(
  CoachDashboard, 
  {
    teamId: 'any',
    roles: ['coach'], // Only coaches can access this dashboard
    requireRole: true, // Ensure role is strictly enforced
  },
  'CoachDashboard' // Optional: Page name for HOC
);
