import React from 'react'
import { NavigationMenu, NavigationMenuItem, NavigationMenuList, NavigationMenuContent, NavigationMenuTrigger } from '@/components/ui/navigation-menu'
import { Link, useLocation } from 'react-router-dom'
import { 
  BarChart3, 
  Clock, 
  Users, 
  BookOpen, 
  Target, 
  FileText, 
  Settings,
  Calendar,
  Bell
} from 'lucide-react'

const RegistrarNavigation: React.FC = () => {
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <NavigationMenu>
      <NavigationMenuList>
        {/* Program Overview */}
        <NavigationMenuItem>
          <Link 
            to="/registrar" 
            className={`px-3 py-2 text-sm hover:text-primaryBlue flex items-center gap-2 ${
              isActive('/registrar') ? 'text-primaryBlue font-medium' : 'text-textDark'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Program Overview
          </Link>
        </NavigationMenuItem>

        {/* Practice Log */}
        <NavigationMenuItem>
          <Link 
            to="/registrar/practice" 
            className={`px-3 py-2 text-sm hover:text-primaryBlue flex items-center gap-2 ${
              isActive('/registrar/practice') ? 'text-primaryBlue font-medium' : 'text-textDark'
            }`}
          >
            <Clock className="h-4 w-4" />
            Practice Log
          </Link>
        </NavigationMenuItem>

        {/* Supervision Log */}
        <NavigationMenuItem>
          <Link 
            to="/registrar/supervision" 
            className={`px-3 py-2 text-sm hover:text-primaryBlue flex items-center gap-2 ${
              isActive('/registrar/supervision') ? 'text-primaryBlue font-medium' : 'text-textDark'
            }`}
          >
            <Users className="h-4 w-4" />
            Supervision Log
          </Link>
        </NavigationMenuItem>

        {/* CPD Log */}
        <NavigationMenuItem>
          <Link 
            to="/registrar/cpd" 
            className={`px-3 py-2 text-sm hover:text-primaryBlue flex items-center gap-2 ${
              isActive('/registrar/cpd') ? 'text-primaryBlue font-medium' : 'text-textDark'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            CPD Log
          </Link>
        </NavigationMenuItem>

        {/* Competencies */}
        <NavigationMenuItem>
          <NavigationMenuTrigger className={`text-sm hover:text-primaryBlue ${
            isActive('/registrar/competencies') ? 'text-primaryBlue font-medium' : 'text-textDark'
          }`}>
            <Target className="h-4 w-4 mr-2" />
            Competencies
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid gap-3 p-4 w-[300px]">
              <div className="grid gap-2">
                <h4 className="font-medium text-sm text-textDark">AoPE Competencies</h4>
                <Link to="/registrar/competencies" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-sm">
                  <Target className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium">Competency Matrix</div>
                    <div className="text-xs text-gray-500">Track progress across competency areas</div>
                  </div>
                </Link>
                <Link to="/registrar/competencies/observations" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-sm">
                  <Users className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="font-medium">Supervisor Observations</div>
                    <div className="text-xs text-gray-500">Record competency observations</div>
                  </div>
                </Link>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Reports */}
        <NavigationMenuItem>
          <NavigationMenuTrigger className={`text-sm hover:text-primaryBlue ${
            isActive('/registrar/reports') ? 'text-primaryBlue font-medium' : 'text-textDark'
          }`}>
            <FileText className="h-4 w-4 mr-2" />
            Reports
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid gap-3 p-4 w-[300px]">
              <div className="grid gap-2">
                <h4 className="font-medium text-sm text-textDark">Progress Reports</h4>
                <Link to="/registrar/reports/midpoint" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-sm">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium">Midpoint Report (PREA-76)</div>
                    <div className="text-xs text-gray-500">Generate midpoint progress summary</div>
                  </div>
                </Link>
                <Link to="/registrar/reports/final" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-sm">
                  <FileText className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="font-medium">Final Report (AECR-76)</div>
                    <div className="text-xs text-gray-500">Generate final program summary</div>
                  </div>
                </Link>
                <Link to="/registrar/reports/export" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-sm">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <div>
                    <div className="font-medium">Export Data</div>
                    <div className="text-xs text-gray-500">Export logs and reports</div>
                  </div>
                </Link>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Settings */}
        <NavigationMenuItem>
          <Link 
            to="/registrar/settings" 
            className={`px-3 py-2 text-sm hover:text-primaryBlue flex items-center gap-2 ${
              isActive('/registrar/settings') ? 'text-primaryBlue font-medium' : 'text-textDark'
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </NavigationMenuItem>

        {/* Calendar */}
        <NavigationMenuItem>
          <Link 
            to="/calendar" 
            className={`px-3 py-2 text-sm hover:text-primaryBlue flex items-center gap-2 ${
              isActive('/calendar') ? 'text-primaryBlue font-medium' : 'text-textDark'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </Link>
        </NavigationMenuItem>

        {/* Notifications */}
        <NavigationMenuItem>
          <Link 
            to="/notifications" 
            className={`px-3 py-2 text-sm hover:text-primaryBlue flex items-center gap-2 ${
              isActive('/notifications') ? 'text-primaryBlue font-medium' : 'text-textDark'
            }`}
          >
            <Bell className="h-4 w-4" />
            Notifications
          </Link>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

export default RegistrarNavigation
