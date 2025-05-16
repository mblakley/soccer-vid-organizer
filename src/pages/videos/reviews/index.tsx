'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { withAuth } from '@/components/auth'
import { useTheme } from '@/contexts/ThemeContext'
import { PlusCircle, Search, Filter, Calendar, Tag } from 'lucide-react'

interface Review {
  id: string
  title: string
  description: string
  created_at: string
  tags: string[]
  clip_count: number
  creator_team_member_id: string
  creator_name: string
}

interface DatabaseReview {
  id: string
  title: string
  description: string
  created_at: string
  tags: string[] | null
  creator_team_member_id: string
  film_review_session_clips: {
    count: number
  }[]
}

interface TeamMember {
  id: string
  user_id: string
}

interface SupabaseUser {
  id: string
  user_metadata?: {
    full_name?: string
  }
}

interface SupabaseAuthResponse {
  users: SupabaseUser[]
  aud: string
}

interface SupabaseResponse {
  data: {
    id: string
    title: string
    description: string
    created_at: string
    tags: string[] | null
    creator_team_member_id: string
    team_members: {
      full_name: string
    } | null
    film_review_session_clips: {
      count: number
    }[]
  }[] | null
  error: any
  count: number | null
}

function ReviewsPage() {
  const router = useRouter()
  const { isDarkMode } = useTheme()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchReviews()
    fetchAvailableTags()
  }, [page, searchTerm, selectedTags])

  const fetchUserNames = async (teamMemberIds: string[]) => {
    try {
      console.log('Fetching names for team members:', teamMemberIds)
      const response = await fetch('/api/reviews/creator-names', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamMemberIds }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error response from API:', errorData)
        throw new Error(errorData.message || 'Failed to fetch user names')
      }

      const data = await response.json()
      console.log('Received name map:', data)
      return data
    } catch (err) {
      console.error('Error fetching user names:', err)
      return {}
    }
  }

  const fetchReviews = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('film_review_sessions')
        .select(`
          id,
          title,
          description,
          created_at,
          tags,
          creator_team_member_id,
          film_review_session_clips(count)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1)

      if (searchTerm) {
        query = query.ilike('title', `%${searchTerm}%`)
      }

      if (selectedTags.length > 0) {
        query = query.contains('tags', selectedTags)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching reviews:', error)
        throw new Error('Failed to fetch reviews')
      }

      // Get unique team member IDs from the reviews
      const teamMemberIds = [...new Set(data?.map(review => review.creator_team_member_id) || [])]
      
      // Fetch user names
      const nameMap = await fetchUserNames(teamMemberIds)

      const formattedReviews = (data as DatabaseReview[] | null)?.map(review => ({
        id: review.id,
        title: review.title,
        description: review.description,
        created_at: review.created_at,
        tags: review.tags || [],
        clip_count: review.film_review_session_clips?.[0]?.count || 0,
        creator_team_member_id: review.creator_team_member_id,
        creator_name: nameMap[review.creator_team_member_id] || 'Unknown'
      })) || []
      setReviews(formattedReviews)
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (err) {
      console.error('Exception fetching reviews:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableTags = async () => {
    try {
      const { data, error } = await supabase
        .from('film_review_sessions')
        .select('tags')
      
      if (error) {
        console.error('Error fetching tags:', error)
      } else {
        const allTags = new Set<string>()
        data?.forEach(review => {
          (review.tags || []).forEach((tag: string) => allTags.add(tag))
        })
        setAvailableTags(Array.from(allTags))
      }
    } catch (err) {
      console.error('Exception fetching tags:', err)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
    setPage(1) // Reset to first page when changing filters
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Video Reviews</h1>
        <Link 
          href="/videos/reviews/create"
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium ${
            isDarkMode 
              ? 'bg-blue-600 hover:bg-blue-500 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } transition-colors`}
        >
          <PlusCircle size={18} />
          Create Review
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-grow">
          <div className="relative">
            <input
              type="text"
              className={`w-full pl-10 pr-4 py-2 rounded-md ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300'
              } border focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1) // Reset to first page when searching
              }}
            />
            <Search 
              size={18} 
              className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            />
          </div>
        </div>
      </div>

      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors ${
                selectedTags.includes(tag)
                  ? isDarkMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Tag size={14} />
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {searchTerm || selectedTags.length > 0
              ? 'No reviews found matching your criteria'
              : 'No reviews have been created yet'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {reviews.map(review => (
              <div
                key={review.id}
                className={`p-4 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                } transition-colors cursor-pointer`}
                onClick={() => router.push(`/videos/reviews/${review.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{review.title}</h3>
                    <p className={`mt-1 text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {review.description}
                    </p>
                  </div>
                  <div className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {review.clip_count} {review.clip_count === 1 ? 'clip' : 'clips'}
                  </div>
                </div>
                
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.tags?.map(tag => (
                    <span
                      key={tag}
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        isDarkMode
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-4 text-sm">
                  <div className={`flex items-center gap-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <Calendar size={14} />
                    {formatDate(review.created_at)}
                  </div>
                  <div className={`${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    by {review.creator_name}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-3 py-1 rounded-md ${
                  page === 1
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-200'
                } ${
                  isDarkMode
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Previous
              </button>
              <span className={`px-3 py-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`px-3 py-1 rounded-md ${
                  page === totalPages
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-200'
                } ${
                  isDarkMode
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default withAuth(
  ReviewsPage,
  {
    teamId: 'any',
    roles: ['coach', 'player', 'parent', 'manager']
  },
  'Video Reviews'
) 