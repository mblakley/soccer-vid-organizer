import { ReactNode } from 'react'
import UserBanner from '@/components/UserBanner'
import { useTheme } from '@/contexts/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'

type AppLayoutProps = {
  children: ReactNode
  user?: {
    email?: string
    roles?: string[]
  }
}

export default function AppLayout({ children, user }: AppLayoutProps) {
  const { isDarkMode } = useTheme()

  // Only show UserBanner if user is provided
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {user && (
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm border-b p-4`}>
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <UserBanner email={user.email || ''} roles={user.roles || []} />
            <ThemeToggle />
          </div>
        </div>
      )}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
} 