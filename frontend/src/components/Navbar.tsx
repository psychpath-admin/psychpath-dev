import { NavigationMenu, NavigationMenuItem, NavigationMenuList, NavigationMenuContent, NavigationMenuTrigger } from '@/components/ui/navigation-menu'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Link } from 'react-router-dom'
import HeaderNotificationBell from '@/components/HeaderNotificationBell'
import { ChevronDown, User, BookOpen, Users, Settings, LogOut, Bell, FileText, BarChart3, ClipboardList, Calendar, Award } from 'lucide-react'
// Logo is served from public folder

export function Navbar() {
  const [me, setMe] = useState<{ email?: string; role?: string } | null>(null)
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    apiFetch('/api/me/').then((r) => r.json()).then((data) => {
      console.log('Navbar: User data received:', data)
      setMe(data)
    }).catch(() => {})
  }, [])
  return (
    <header className="w-full border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img 
            src="/cape-logo.png" 
            alt="PsychPATH Logo" 
            className="h-8 w-auto"
          />
          <span className="font-headings text-2xl text-textDark">PsychPATH</span>
        </Link>
        <NavigationMenu>
          <NavigationMenuList>
            {/* Dashboard - Always visible */}
            <NavigationMenuItem>
              <Link className="px-3 py-2 text-sm text-textDark hover:text-primaryBlue flex items-center gap-2" to="/">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Link>
            </NavigationMenuItem>

            {/* Calendar - Always visible */}
            <NavigationMenuItem>
              <Link className="px-3 py-2 text-sm text-textDark hover:text-primaryBlue flex items-center gap-2" to="/calendar">
                <Calendar className="h-4 w-4" />
                Calendar
              </Link>
            </NavigationMenuItem>

            {/* My Work - For Trainees */}
            {(me?.role === 'PROVISIONAL' || me?.role === 'REGISTRAR') && (
              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-sm text-textDark hover:text-primaryBlue">
                  <BookOpen className="h-4 w-4 mr-2" />
                  My Work
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid gap-3 p-4 w-[400px]">
                    <div className="grid gap-2">
                      <h4 className="font-medium text-sm text-textDark">Logbook Sections</h4>
                      <Link to="/section-a" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-sm">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-medium">Section A</div>
                          <div className="text-xs text-gray-500">Direct Client Contact</div>
                        </div>
                      </Link>
                      <Link to="/section-b" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-sm">
                        <FileText className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="font-medium">Section B</div>
                          <div className="text-xs text-gray-500">Professional Development</div>
                        </div>
                      </Link>
                      <Link to="/section-c" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-sm">
                        <FileText className="h-4 w-4 text-purple-600" />
                        <div>
                          <div className="font-medium">Section C</div>
                          <div className="text-xs text-gray-500">Supervision</div>
                        </div>
                      </Link>
                      <Link to="/logbook" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-sm">
                        <ClipboardList className="h-4 w-4 text-indigo-600" />
                        <div>
                          <div className="font-medium">Weekly Logbook</div>
                          <div className="text-xs text-gray-500">Submit & Review</div>
                        </div>
                      </Link>
                      <Link to="/competencies" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-sm">
                        <Award className="h-4 w-4 text-amber-600" />
                        <div>
                          <div className="font-medium">Core Competencies</div>
                          <div className="text-xs text-gray-500">AHPRA Reference</div>
                        </div>
                      </Link>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            )}

            {/* Supervision - For Supervisors */}
            {me?.role === 'SUPERVISOR' && (
              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-sm text-textDark hover:text-primaryBlue">
                  <Users className="h-4 w-4 mr-2" />
                  Supervision
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid gap-3 p-4 w-[350px]">
                    <div className="grid gap-2">
                      <h4 className="font-medium text-sm text-textDark">Supervisor Tools</h4>
                      <Link to="/supervisor/queue" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-sm">
                        <ClipboardList className="h-4 w-4 text-orange-600" />
                        <div>
                          <div className="font-medium">Review Queue</div>
                          <div className="text-xs text-gray-500">Pending logbook reviews</div>
                        </div>
                      </Link>
                      <Link to="/supervisor/links" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-sm">
                        <Users className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-medium">Manage Trainees</div>
                          <div className="text-xs text-gray-500">Invite & supervise trainees</div>
                        </div>
                      </Link>
                      <Link to="/competencies" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-sm">
                        <Award className="h-4 w-4 text-amber-600" />
                        <div>
                          <div className="font-medium">Core Competencies</div>
                          <div className="text-xs text-gray-500">AHPRA Reference</div>
                        </div>
                      </Link>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            )}

            {/* Admin - For Org Admins */}
            {me?.role === 'ORG_ADMIN' && (
              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-sm text-textDark hover:text-primaryBlue">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid gap-3 p-4 w-[300px]">
                    <div className="grid gap-2">
                      <h4 className="font-medium text-sm text-textDark">Organization Management</h4>
                      <Link to="/org" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-sm">
                        <BarChart3 className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="font-medium">Organization Dashboard</div>
                          <div className="text-xs text-gray-500">Manage organization data</div>
                        </div>
                      </Link>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>
        <div className="flex items-center gap-2">
          {!me ? (
            <span className="text-sm text-textLight">Guest</span>
          ) : (
            <>
              <HeaderNotificationBell />
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="text-sm text-textDark hover:text-primaryBlue">
                      <User className="h-4 w-4 mr-2" />
                      Account
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="grid gap-3 p-4 w-[280px]">
                        <div className="grid gap-2">
                          <h4 className="font-medium text-sm text-textDark">Account & Settings</h4>
                          <Link to="/notifications" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-sm">
                            <Bell className="h-4 w-4 text-blue-600" />
                            <div>
                              <div className="font-medium">Notifications</div>
                              <div className="text-xs text-gray-500">View all notifications</div>
                            </div>
                          </Link>
                          <Link to="/profile" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-sm">
                            <Settings className="h-4 w-4 text-green-600" />
                            <div>
                              <div className="font-medium">Profile Settings</div>
                              <div className="text-xs text-gray-500">Manage your profile</div>
                            </div>
                          </Link>
                          <div className="border-t pt-2 mt-2">
                            <div className="text-xs text-gray-500 mb-2 px-2">
                              Logged in as: {me.email}
                              {me.role && ` (${me.role})`}
                            </div>
                            <Button 
                              onClick={() => { localStorage.clear(); window.location.reload() }} 
                              className="w-full bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
                              size="sm"
                            >
                              <LogOut className="h-4 w-4" />
                              Logout
                            </Button>
                          </div>
                        </div>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar


