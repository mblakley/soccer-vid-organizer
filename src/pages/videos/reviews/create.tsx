'use client'
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router'; // Changed from next/navigation for Pages Router
import { FilmReviewSessionClip, LibraryClip } from '@/lib/types';
import { CreateReviewApiResponse, CreateReviewResponse, ErrorResponse } from '@/lib/types/reviews';
import { PlusCircle, Save, Film, Search, ListVideo, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import AppLayout from '@/components/AppLayout';
import { toast } from 'react-toastify';
import { useTeam } from '@/contexts/TeamContext';
import { useAuth } from '@/lib/hooks/useAuth';
import { apiClient } from '@/lib/api/client'; // Added apiClient import

// Remove the mock function and replace with real API call
async function fetchAvailableClips(searchTerm?: string, tags?: string[]): Promise<LibraryClip[]> {
  try {
    // const response = await fetch('/api/auth/session') // apiClient handles auth
    // if (!response.ok) {
    //   throw new Error('Not authenticated')
    // }
    // const { session } = await response.json()
    // if (!session) {
    //   throw new Error('Not authenticated')
    // }

    const queryParams = new URLSearchParams();
    if (searchTerm) queryParams.append('search', searchTerm);
    if (tags && tags.length > 0) queryParams.append('tags', tags.join(','));

    console.log('Fetching clips with params:', { searchTerm, tags });

    // const clipsResponse = await fetch(`/api/clips?${queryParams.toString()}`, { // Replaced with apiClient
    //   headers: {
    //     'Authorization': `Bearer ${session.access_token}`
    //   }
    // })
    const clipsResponse = await apiClient.get<{ clips: LibraryClip[] }>(`/api/clips?${queryParams.toString()}`);


    // const data = await clipsResponse.json() // apiClient handles JSON parsing

    // if (!clipsResponse.ok) { // apiClient handles error checking
    //   console.error('API error response:', data)
    //   throw new Error(data.error || data.message || 'Failed to fetch clips')
    // }

    // return data
    if (clipsResponse.clips) {
      return clipsResponse.clips;
    }
    // Handle cases where clipsResponse might not have a 'clips' property directly,
    // or if the API returns the array directly.
    // This depends on the actual structure of your API response for /api/clips
    // For now, assuming it's { clips: LibraryClip[] } based on common patterns.
    // If it returns LibraryClip[] directly, then `return clipsResponse as LibraryClip[]` might work.
    // Or if there's an error field:
    if ((clipsResponse as any).error) {
      throw new Error((clipsResponse as any).error.message || (clipsResponse as any).error || 'Failed to fetch clips');
    }
    return []; // Default to empty array if structure is unexpected and no error
  } catch (error: any) {
    console.error('Error fetching clips:', error)
    throw error
  }
}

function NewFilmReviewSessionPageContent() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { selectedTeamId } = useTeam();
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sessionTags, setSessionTags] = useState('');
  const [selectedClips, setSelectedClips] = useState<FilmReviewSessionClip[]>([]);
  
  const [isAddingClips, setIsAddingClips] = useState(false);
  const [availableClips, setAvailableClips] = useState<LibraryClip[]>([]);
  const [clipSearchTerm, setClipSearchTerm] = useState('');
  const [clipSearchTags, setClipSearchTags] = useState('');
  const [isLoadingClips, setIsLoadingClips] = useState(false);
  const [loading, setLoading] = useState(false);

  // Remove the mock useEffect and replace with real data fetching
  useEffect(() => {
    if (isAddingClips) {
      handleSearchClips()
    }
  }, [isAddingClips])

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Please log in to create a film review session');
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleSearchClips = async () => {
    setIsLoadingClips(true)
    try {
      const tagsArray = clipSearchTags.split(',').map(t => t.trim()).filter(t => t)
      const clips = await fetchAvailableClips(clipSearchTerm, tagsArray)
      setAvailableClips(clips)
    } catch (error: any) {
      console.error('Error searching clips:', error)
      toast.error(error.message || 'Failed to search clips')
    } finally {
      setIsLoadingClips(false)
    }
  }

  const addClipToSession = (clipToAdd: LibraryClip) => {
    // Check if clip already added
    if (selectedClips.find(c => c.clip_id === clipToAdd.id)) {
      alert('This clip is already in the session.');
      return;
    }
    const newSessionClip: FilmReviewSessionClip = {
      id: crypto.randomUUID(), // Temporary ID for client-side, real ID from DB on save
      clip_id: clipToAdd.id,
      display_order: selectedClips.length + 1,
      comment: '' // Initial empty comment
    };
    setSelectedClips(prev => [...prev, newSessionClip]);
  };

  const updateClipComment = (sessionClipId: string, comment: string) => {
    setSelectedClips(prev => prev.map(sc => sc.id === sessionClipId ? { ...sc, comment } : sc));
  };
  
  const removeClipFromSession = (sessionClipId: string) => {
    setSelectedClips(prev => prev.filter(sc => sc.id !== sessionClipId).map((clip, index) => ({ ...clip, display_order: index + 1 })));
  };

  // TODO: Implement reordering logic (e.g., drag and drop or move up/down buttons)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to create a review session');
      return;
    }

    if (!selectedTeamId) {
      toast.error('Please select a team');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setLoading(true);

    try {
      // const response = await fetch('/api/auth/session') // apiClient handles auth
      // if (!response.ok) {
      //   throw new Error('Not authenticated')
      // }
      // const { session } = await response.json()
      // if (!session) {
      //   throw new Error('Not authenticated')
      // }

      const finalSessionTags = sessionTags.split(',').map(t => t.trim()).filter(t => t);
      const sessionData = {
        title,
        description,
        tags: finalSessionTags,
        clips: selectedClips,
        team_id: selectedTeamId
      };

      console.log('Submitting session data:', sessionData);

      const createResponse = await apiClient.post<CreateReviewApiResponse>('/api/reviews/create', sessionData);

      if (createResponse && (createResponse as ErrorResponse).error) {
        throw new Error((createResponse as ErrorResponse).error || 'Failed to create session');
      }
      
      // Assuming if no error, it's a CreateReviewResponse
      const successfulResponse = createResponse as CreateReviewResponse;
      if (successfulResponse.success && successfulResponse.review) {
        toast.success('Review session created successfully!');
        router.push('/videos/reviews');
      } else {
        // This case should ideally be caught by the error check above if the API conforms to CreateReviewApiResponse
        throw new Error('Failed to create session or invalid response.');
      }
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast.error(error.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const pageBg = isDarkMode ? 'bg-gray-900' : 'bg-gray-100';
  const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-gray-200' : 'text-gray-800';
  const inputBg = isDarkMode ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDarkMode ? 'border-gray-600' : 'border-gray-300';
  const hoverBg = isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50';
  const subduedTextColor = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  if (authLoading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className={`p-6 rounded-lg shadow-md ${cardBg}`}>
          <h2 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-gray-100' : 'text-gray-700'}`}>Session Details</h2>
          <div className="space-y-5">
            <div>
              <label htmlFor="title" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Title <span className="text-red-500">*</span></label>
              <input type="text" name="title" id="title" value={title} onChange={e => setTitle(e.target.value)} className={`mt-1 block w-full rounded-md ${inputBg} ${inputBorder} ${textColor} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5`} placeholder="Enter session title" required />
            </div>
            <div>
              <label htmlFor="description" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
              <textarea name="description" id="description" value={description} onChange={e => setDescription(e.target.value)} rows={4} className={`mt-1 block w-full rounded-md ${inputBg} ${inputBorder} ${textColor} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5`} placeholder="Provide a brief overview of this film review session..."></textarea>
            </div>
            <div>
              <label htmlFor="sessionTags" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Session Focus Tags <span className={subduedTextColor}>(comma-separated)</span></label>
              <input type="text" name="sessionTags" id="sessionTags" value={sessionTags} onChange={e => setSessionTags(e.target.value)} className={`mt-1 block w-full rounded-md ${inputBg} ${inputBorder} ${textColor} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5`} placeholder="e.g., defensive-strategy, offensive-plays, player-name" />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-md ${cardBg}`}>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-5">
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-700'} mb-3 sm:mb-0`}>Clips for this Session</h2>
            <div className="flex items-center gap-3">
                <Link href="/coach/analyze" className={`text-xs sm:text-sm font-medium flex items-center gap-1.5 ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}>
                    <Film size={16}/> Go to Analyze Video
                </Link>
                <button type="button" onClick={() => setIsAddingClips(true)} className={`py-2 px-3 rounded-md flex items-center text-xs sm:text-sm font-semibold ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'} transition-colors`}>
                    <PlusCircle size={18} className="mr-1.5"/> Add Clips from Library
                </button>
            </div>
          </div>

          {selectedClips.length === 0 ? (
            <div className={`text-center py-6 border-2 border-dashed ${isDarkMode ? 'border-gray-700' : 'border-gray-300'} rounded-md`}>
              <ListVideo size={40} className={`mx-auto mb-2 ${subduedTextColor}`} />
              <p className={`${subduedTextColor}`}>No clips added yet. Click "Add Clips from Library" to start.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedClips.map((sClip, index) => {
                const libraryClip = availableClips.find((ac: LibraryClip) => ac.id === sClip.clip_id)
                return (
                  <div key={sClip.id} className={`p-4 border rounded-md ${isDarkMode ? `bg-gray-700 ${inputBorder}` : `bg-gray-50 ${inputBorder}`}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className={`font-medium ${textColor}`}>Clip {index + 1}: {libraryClip?.title || sClip.clip_id}</p>
                      </div>
                      <button type="button" onClick={() => removeClipFromSession(sClip.id)} className={`text-xs font-medium ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'} transition-colors`}>Remove</button>
                    </div>
                    <textarea
                      value={sClip.comment}
                      onChange={e => updateClipComment(sClip.id, e.target.value)}
                      placeholder="Add comment for this clip in the session..."
                      rows={2}
                      className={`block w-full rounded-md ${isDarkMode ? `bg-gray-600 ${inputBorder} placeholder-gray-400` : `bg-white ${inputBorder} placeholder-gray-500`} ${textColor} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 text-sm`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" className={`py-2.5 px-6 rounded-md flex items-center font-semibold ${isDarkMode ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-green-500 hover:bg-green-600 text-white'} transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${isDarkMode ? 'focus:ring-green-400 focus:ring-offset-gray-900' : 'focus:ring-green-500 focus:ring-offset-gray-100'}`}>
            <Save size={18} className="mr-2"/> Create Session
          </button>
        </div>
      </form>

      {isAddingClips && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out" onClick={() => setIsAddingClips(false)}>
          <div className={`${cardBg} p-6 sm:p-8 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalEnter`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-2xl font-semibold ${textColor}`}>Add Clips to Session</h3>
              <button onClick={() => setIsAddingClips(false)} className={`${subduedTextColor} hover:${textColor} transition-colors`}><X size={24}/></button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <input 
                type="text" 
                placeholder="Search by name/description..." 
                value={clipSearchTerm}
                onChange={e => setClipSearchTerm(e.target.value)}
                className={`border ${inputBorder} ${inputBg} ${textColor} p-2.5 rounded-md w-full focus:ring-indigo-500 focus:border-indigo-500 text-sm`}
              />
              <input 
                type="text" 
                placeholder="Filter by clip tags (comma-sep)..." 
                value={clipSearchTags}
                onChange={e => setClipSearchTags(e.target.value)}
                className={`border ${inputBorder} ${inputBg} ${textColor} p-2.5 rounded-md w-full focus:ring-indigo-500 focus:border-indigo-500 text-sm`}
              />
              <button onClick={handleSearchClips} disabled={isLoadingClips} className={`bg-blue-500 text-white p-2.5 px-4 rounded-md hover:bg-blue-600 flex items-center justify-center text-sm font-medium ${isLoadingClips ? 'opacity-50 cursor-not-allowed' : ''} transition-colors`}>
                <Search size={18} className="mr-1.5"/>{isLoadingClips ? 'Searching...' : 'Search'}
              </button>
            </div>
            <div className="overflow-y-auto flex-grow space-y-3 pr-2 -mr-2 custom-scrollbar">
              {isLoadingClips && <p className={`${subduedTextColor} text-center py-4`}>Loading clips...</p>}
              {!isLoadingClips && availableClips.length > 0 && availableClips.map(clip => (
                <div key={clip.id} className={`p-3.5 border ${inputBorder} rounded-lg ${hoverBg} ${isDarkMode ? 'hover:border-gray-500' : 'hover:border-gray-400'} transition-all duration-150 flex justify-between items-center cursor-pointer`} onClick={() => addClipToSession(clip)}>
                  <div className="flex-grow">
                    <p className={`font-medium ${textColor} text-sm`}>{clip.title || 'Unnamed Clip'}</p>
                    <p className={`text-xs ${subduedTextColor} mt-0.5`}>
                      {clip.start_time && clip.end_time ? 
                        `Time: ${Math.floor(clip.start_time / 60)}:${(clip.start_time % 60).toString().padStart(2, '0')} - ${Math.floor(clip.end_time / 60)}:${(clip.end_time % 60).toString().padStart(2, '0')}` : 
                        'No time range specified'}
                    </p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); addClipToSession(clip); }} className={`ml-3 bg-green-500 text-white text-xs py-1 px-2.5 rounded-md hover:bg-green-600 transition-colors font-medium`}>Add</button>
                </div>
              ))}
              {!isLoadingClips && availableClips.length === 0 && <p className={`${subduedTextColor} text-center py-4`}>No clips found. Try different search terms or create new clips.</p>}
            </div>
            <div className="mt-6 text-right">
              <button onClick={() => setIsAddingClips(false)} className={`py-2 px-4 rounded-md font-semibold ${isDarkMode ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} transition-colors`}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
          @keyframes modalEnter {
              to { opacity: 1; transform: scale(1); }
          }
          .animate-modalEnter {
              animation: modalEnter 0.3s forwards;
          }
          .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
              background: ${isDarkMode ? '#2d3748' : '#e2e8f0'};
              border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
              background: ${isDarkMode ? '#4a5568' : '#a0aec0'};
              border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: ${isDarkMode ? '#718096' : '#718096'};
          }
      `}</style>
    </div>
  )
}

export default function NewFilmReviewSession() {
  return (
    <AppLayout title="Create Film Review Session">
      <NewFilmReviewSessionPageContent />
    </AppLayout>
  )
} 