/** Gray player silhouette placeholder used wherever a photo is missing. */
export default function PlayerSilhouette({ scale = '70%' }: { scale?: string }) {
  return (
    <svg viewBox="0 0 80 90" xmlns="http://www.w3.org/2000/svg" style={{ width: scale, height: scale }}>
      <ellipse cx="40" cy="28" rx="18" ry="20" fill="#d1d5db" />
      <path d="M8 90 Q8 58 40 58 Q72 58 72 90Z" fill="#d1d5db" />
    </svg>
  )
}
