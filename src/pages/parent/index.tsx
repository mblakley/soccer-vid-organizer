'use client'
import { withAuth } from '@/components/auth'

function ParentDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Parent Dashboard</h1>
      <p>Welcome to your parent dashboard. Here you can monitor your child's progress.</p>
      <div className="mt-4">
        <h2 className="text-xl font-semibold">Your Child's Recent Clips</h2>
        <p className="text-gray-500 mt-2">No clips available yet.</p>
      </div>
    </div>
  )
}

// Restrict access to parents and admins
export default withAuth(
  ParentDashboard, 
  {
    teamId: 'any',
    roles: ['parent']
  }
) 