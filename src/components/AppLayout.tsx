'use client';

import { ReactNode, useState, useEffect } from 'react'
import UserBanner from '@/components/UserBanner'
import { useTheme } from '@/contexts/ThemeContext'
import AppSidebar from '@/components/AppSidebar'
import { useTeam } from '@/contexts/TeamContext'
import HamburgerButton from '@/components/HamburgerButton'
import { usePathname } from 'next/navigation'
import type { User } from '@/components/auth'

type AppLayoutProps = {
  children: ReactNode
  user?: User | null
  title?: string
  fullWidth?: boolean
}

export default function AppLayout({ children, title, fullWidth }: AppLayoutProps) {
  const { isDarkMode } = useTheme()
  const { currentUser, isLoadingUser } = useTeam()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {currentUser && !isLoadingUser && (
        <header className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm border-b p-4 sticky top-0 z-30`}>
          <div className={`${fullWidth ? '' : 'max-w-7xl mx-auto'} flex justify-between items-center`}>
            <div className="flex items-center space-x-2">
              {!fullWidth && (
                <HamburgerButton isOpen={isSidebarOpen} onClick={toggleSidebar} />
              )}
              {title && <h1 className="text-xl font-bold">{title}</h1>}
            </div>
            <UserBanner email={currentUser.email || ''} roles={currentUser.isAdmin ? ['admin'] : []} />
          </div>
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        {currentUser && !isLoadingUser && !fullWidth && (
          <AppSidebar isOpen={isSidebarOpen} onClose={toggleSidebar} />
        )}
        <main className={`flex-1 overflow-y-auto p-6 ${fullWidth ? 'w-full px-0 py-0' : 'max-w-none'} ${isSidebarOpen && !fullWidth ? 'opacity-50 lg:opacity-100 transition-opacity duration-300' : 'transition-opacity duration-300'}`}>
          {children}
        </main>
      </div>
    </div>
  )
} 