'use client'
import withAuth from '@/components/withAuth'

function PlayerDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Player Dashboard</h1>
      <p>Welcome to your player dashboard. Here you can view your clips and progress.</p>
      <div className="mt-4">
        <h2 className="text-xl font-semibold">Your Recent Clips</h2>
        <p className="text-gray-500 mt-2">No clips available yet.</p>
      </div>
    </div>
  )
}

// Restrict access to players and admins
export default withAuth(PlayerDashboard, ['player', 'admin']) 