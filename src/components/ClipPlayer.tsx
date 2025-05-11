interface ClipPlayerProps {
  videoId: string;
  start: number;
  end: number;
  source?: string;
}

export default function ClipPlayer({ videoId, start, end, source = 'youtube' }: ClipPlayerProps) {
  // For YouTube videos
  if (source === 'youtube') {
    const src = `https://www.youtube.com/embed/${videoId}?start=${start}&end=${end}&autoplay=1`
    return (
      <div className="mb-4 aspect-video">
        <iframe 
          className="w-full h-full"
          src={src} 
          frameBorder="0" 
          allowFullScreen 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        ></iframe>
      </div>
    )
  }
  
  // For Vimeo videos
  if (source === 'vimeo') {
    // Vimeo uses #t=[seconds] for start time
    const src = `https://player.vimeo.com/video/${videoId}#t=${start}s`
    return (
      <div className="mb-4 aspect-video">
        <iframe 
          className="w-full h-full"
          src={src} 
          frameBorder="0" 
          allowFullScreen 
          allow="autoplay; fullscreen; picture-in-picture"
        ></iframe>
      </div>
    )
  }
  
  // For Facebook videos
  if (source === 'facebook') {
    // Facebook doesn't support start/end params in the same way
    // We can pass the start time as t= parameter
    const src = `https://www.facebook.com/plugins/video.php?href=https://www.facebook.com/watch/?v=${videoId}&t=${start}`
    return (
      <div className="mb-4 aspect-video">
        <iframe 
          className="w-full h-full"
          src={src} 
          frameBorder="0" 
          allowFullScreen 
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          scrolling="no"
        ></iframe>
      </div>
    )
  }
  
  // For Instagram videos
  if (source === 'instagram') {
    // Instagram embeds don't support start/end times
    // Need to use their oEmbed format
    const src = `https://www.instagram.com/p/${videoId}/embed/`
    return (
      <div className="mb-4 overflow-hidden">
        <iframe 
          className="w-full"
          src={src} 
          frameBorder="0" 
          scrolling="no" 
          height="500"
          allowTransparency
        ></iframe>
        <div className="text-xs text-gray-500 mt-1">
          Start at {formatTime(start)} {end > 0 && `- End at ${formatTime(end)}`}
        </div>
      </div>
    )
  }
  
  // For TikTok videos
  if (source === 'tiktok') {
    // TikTok doesn't support start/end times in their embed
    return (
      <div className="mb-4">
        <blockquote 
          className="tiktok-embed" 
          cite={`https://www.tiktok.com/@user/video/${videoId}`} 
          data-video-id={videoId}
        >
          <section></section>
        </blockquote>
        <script async src="https://www.tiktok.com/embed.js"></script>
        <div className="text-xs text-gray-500 mt-1">
          Start at {formatTime(start)} {end > 0 && `- End at ${formatTime(end)}`}
        </div>
      </div>
    )
  }
  
  // For Veo videos
  if (source === 'veo') {
    // Veo supports start parameter as seconds
    const src = `https://app.veo.co/embed/matches/${videoId}/?utm_source=embed&start=${start}`
    return (
      <div className="mb-4 aspect-video">
        <iframe 
          className="w-full h-full"
          src={src} 
          frameBorder="0" 
          allowFullScreen
        ></iframe>
      </div>
    )
  }
  
  // For Hudl videos
  if (source === 'hudl') {
    // Hudl embed doesn't directly support start/end in the iframe URL
    // But you can use their embed code which may support playback options
    const src = `https://www.hudl.com/embed/video/${videoId}`
    return (
      <div className="mb-4 aspect-video">
        <iframe 
          className="w-full h-full"
          src={src} 
          frameBorder="0" 
          allowFullScreen
        ></iframe>
        <div className="text-xs text-gray-500 mt-1">
          Start at {formatTime(start)} {end > 0 && `- End at ${formatTime(end)}`}
        </div>
      </div>
    )
  }
  
  // Default fallback for unsupported sources
  return (
    <div className="mb-4 p-4 bg-gray-200 text-center rounded">
      <p>Unable to play video from source: {source}</p>
      <p>Video ID: {videoId}</p>
      <p className="text-xs mt-2">
        Start at {formatTime(start)} {end > 0 && `- End at ${formatTime(end)}`}
      </p>
    </div>
  )
}

// Helper function to format time in MM:SS format
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}