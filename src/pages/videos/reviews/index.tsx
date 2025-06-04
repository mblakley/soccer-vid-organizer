'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { withAuth } from '@/components/auth'
import { useTheme } from '@/contexts/ThemeContext'
import { PlusCircle, Search, Calendar } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { Review } from '@/lib/types/reviews'
import { toast } from 'react-toastify'

/*
// Removed local type definitions, assuming Review is now in src/lib/types.ts
// and DatabaseReview are obsolete.
interface Review {
  id: string
  title: string
  description: string
  created_at: string
  clip_count: number
}

interface DatabaseReview {
  id: string
  title: string
  description: string
  created_at: string
  film_review_session_clips: {
    count: number
  }[]
}
*/

// Define the expected API response structure for listing reviews
// This should align with what /api/reviews actually returns.
// For now, assuming it returns an array of Review objects directly or an object with a reviews property.
interface ListReviewsApiResponse {
  reviews: Review[]; // Assuming the API returns an object with a 'reviews' key
  // or if it returns Review[] directly, adjust fetchReviews accordingly.
  message?: string;
  count?: number; // If pagination/total count is returned
  totalPages?: number;
}

interface CreateReviewApiResponse {
  error?: string;
  success?: boolean;
}

interface CreateReviewResponse {
  success: boolean;
}

interface ErrorResponse {
  error: string;
}

function ReviewsPage() {
  const router = useRouter()
  const { isDarkMode } = useTheme()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  // const itemsPerPage = 10; // This was defined but not used, consider if pagination is handled by API
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReviews(page, searchTerm) // Pass page and searchTerm
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm]) // searchTerm was missing from dependencies

  const fetchReviews = async (currentPage: number, currentSearchTerm: string) => {
    setLoading(true)
    setError(null)
    try {
      // Adjust query parameters as needed by your API endpoint for search and pagination
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '10'); // Assuming itemsPerPage is 10
      if (currentSearchTerm) {
        params.append('search', currentSearchTerm);
      }
      
      const response = await apiClient.get<ListReviewsApiResponse>(`/api/reviews?${params.toString()}`)
      
      if (response && response.reviews) {
        setReviews(response.reviews)
        // Assuming the API might also return totalPages or count to calculate it
        setTotalPages(response.totalPages || Math.ceil((response.count || 0) / 10) || 1);
      } else {
        console.warn('No reviews data received or data is in unexpected format:', response)
        setReviews([])
        setTotalPages(1)
        // Optionally set an error if the response structure is not as expected but no error was thrown
        // setError(response.message || 'Failed to fetch reviews or no reviews found.');
      }
    } catch (err: any) {
      console.error('Exception fetching reviews:', err)
      setError(err.message || 'An unexpected error occurred')
      setReviews([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleCreateReview = async (reviewData: any) => {
    try {
      const response = await apiClient.post<CreateReviewApiResponse>('/api/reviews/create', reviewData)

      if ((response as ErrorResponse).error) {
        throw new Error((response as ErrorResponse).error)
      }

      // If no error, it's a successful response
      const successfulResponse = response as CreateReviewResponse
      if (successfulResponse.success) {
        toast.success('Review created successfully')
        router.push('/videos/reviews')
      }
    } catch (error: any) {
      console.error('Error creating review:', error)
      toast.error(error.message || 'Failed to create review')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return
    
    try {
      const response = await apiClient.post<ErrorResponse>(`/api/reviews/${id}`, null)
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      toast.success('Review deleted successfully')
      fetchReviews(1, '')
    } catch (err: any) {
      console.error('Error deleting review:', err)
      toast.error(err.message || 'Failed to delete review')
    }
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

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {searchTerm
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
                
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <div className={`flex items-center gap-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <Calendar size={14} />
                    {formatDate(review.created_at)}
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