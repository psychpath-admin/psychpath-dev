import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from '@/components/ui/navigation-menu'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Link } from 'react-router-dom'
import HeaderNotificationBell from '@/components/HeaderNotificationBell'
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
            <NavigationMenuItem>
              <Link className="px-3 py-2 text-sm text-textDark hover:text-primaryBlue" to="/">Dashboard</Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link className="px-3 py-2 text-sm text-textDark hover:text-primaryBlue" to="/epas">EPAs</Link>
            </NavigationMenuItem>
            {(me?.role === 'PROVISIONAL' || me?.role === 'REGISTRAR') && (
              <>
                <NavigationMenuItem>
                  <Link className="px-3 py-2 text-sm text-textDark hover:text-primaryBlue" to="/section-a">Section A</Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link className="px-3 py-2 text-sm text-textDark hover:text-primaryBlue" to="/section-b">Section B</Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link className="px-3 py-2 text-sm text-textDark hover:text-primaryBlue" to="/section-c">Section C</Link>
                </NavigationMenuItem>
              </>
            )}
            <NavigationMenuItem>
              <Link className="px-3 py-2 text-sm text-textDark hover:text-primaryBlue" to="/logbook">Logbook</Link>
            </NavigationMenuItem>
            {me?.role === 'SUPERVISOR' && (
              <NavigationMenuItem>
                <Link className="px-3 py-2 text-sm text-textDark hover:text-primaryBlue" to="/supervisor/queue">Queue</Link>
              </NavigationMenuItem>
            )}
            {me?.role === 'SUPERVISOR' && (
              <NavigationMenuItem>
                <Link className="px-3 py-2 text-sm text-textDark hover:text-primaryBlue" to="/supervisor/links">Links</Link>
              </NavigationMenuItem>
            )}
            {me?.role === 'ORG_ADMIN' && (
              <NavigationMenuItem>
                <Link className="px-3 py-2 text-sm text-textDark hover:text-primaryBlue" to="/org">Org</Link>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>
        <div className="flex items-center gap-2">
          {!me ? (
            <span className="text-sm text-textLight">Guest</span>
          ) : (
            <>
              <Link className="px-3 py-2 text-sm text-textDark hover:text-primaryBlue" to="/notifications">
                Notifications
              </Link>
              <HeaderNotificationBell />
              <Link className="px-3 py-2 text-sm text-textDark hover:text-primaryBlue" to="/profile">
                Profile
              </Link>
              <span className="text-sm text-textLight">
                {me.email}{me.role && ` (${me.role})`}
              </span>
              <Button onClick={() => { localStorage.clear(); window.location.reload() }} className="bg-accentOrange text-white hover:opacity-90">Logout</Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar


