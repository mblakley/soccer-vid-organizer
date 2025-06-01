import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { Video, VideoListResponse } from '@/lib/types/videos';
import { toast } from 'react-toastify';

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await apiClient.get<VideoListResponse>('/videos');
      setVideos(response.videos);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Videos</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map(video => (
          <div key={video.id} className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">{video.title}</h2>
            <p className="text-sm text-gray-600 mb-2">Source: {video.source}</p>
            {video.duration && (
              <p className="text-sm text-gray-600">Duration: {video.duration} seconds</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 