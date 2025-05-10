export default function ClipPlayer({ videoId, start, end }: { videoId: string; start: number; end: number }) {
  const src = `https://www.youtube.com/embed/${videoId}?start=${start}&end=${end}&autoplay=1`
  return (
    <div className="mb-4">
      <iframe width="560" height="315" src={src} frameBorder="0" allowFullScreen></iframe>
    </div>
  )
}