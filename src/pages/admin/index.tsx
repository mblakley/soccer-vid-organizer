'use client'
import { useState } from 'react'
import withAuth from '@/components/withAuth'

function AdminDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <ul className="list-disc list-inside space-y-2">
        <li><a href="/admin/roles" className="text-blue-600 underline">Review Role Requests</a></li>
        <li><a href="/admin/users" className="text-blue-600 underline">Manage Users</a></li>
      </ul>
    </div>
  )
}

// Restrict this page to admin users only
export default withAuth(AdminDashboard, ['admin'])
