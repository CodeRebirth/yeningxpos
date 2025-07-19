import React, { useState, useRef, useEffect } from 'react';
import Logo from './Logo';
import { Cog, Home, HelpCircle, User, ShoppingCart, Receipt, LogOut, Users, Package, ClipboardCheck, Loader2 } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { NavLink, useNavigate } from 'react-router-dom';
import useAppStore from '@/lib/zustand/appStateStore';

const Sidebar = () => {
  const {userData} = useAppStore();
  const { session, signOut, loading } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
        if (!session) {
          // If authenticated, redirect to Dashboard
         navigate('/login');
        }
    }, [session]);
  

  // Function to handle mouse enter - expand sidebar
  const handleMouseEnter = () => {
    if (collapsed) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setCollapsed(false);
    }
  };

  // Function to handle mouse leave - collapse sidebar after delay
  const handleMouseLeave = () => {
    // Only set a timeout if the sidebar is expanded
    if (!collapsed) {
      timeoutRef.current = setTimeout(() => {
        setCollapsed(true);
      }, 600); // Increased to 600ms for smoother transition
    }
  };

  // Handle menu item click on mobile
  const handleMenuItemClick = () => {
    // Check if we're on mobile by checking the viewport width
    if (window.innerWidth <= 768) { // Standard mobile breakpoint
      setCollapsed(true);
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  

   const navItems = [
    { name: 'Dashboard', path: '/', icon: Home, roles: ['admin', 'manager'] },
    { name: 'POS', path: '/pos', icon: ShoppingCart, roles: ['admin', 'manager', 'staff'] },
    { name: 'Staff Attendance', path: '/staff-attendance', icon: ClipboardCheck, roles: ['admin', 'manager'] },
    { name: 'Inventory', path: '/inventory', icon: Package, roles: ['admin', 'manager', 'staff'] },
    { name: 'Receipts', path: '/receipts', icon: Receipt, roles: ['admin', 'manager', 'staff'] },
    { name: 'Account', path: '/account', icon: User },
    { name: 'Manage Users', path: '/manage-users', icon: Users, roles: ['admin', 'manager'] }, 
    { name: 'Settings', path: '/settings', icon: Cog, roles: ['admin', 'manager'] },
    { name: 'Help & Support', path: '/support', icon: HelpCircle },
    ];

  const handleLogout = async () => {
    try {
      // Disable the button to prevent multiple clicks
      const button = document.getElementById('logout-button');
      if (button) button.setAttribute('disabled', 'true');
      
      // Clear all auth-related localStorage items first
      localStorage.removeItem('currentPath');
      localStorage.removeItem('lastAuthenticatedPath');
      localStorage.removeItem('userRole');
      
      // Clear any Supabase-related cookies
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        if (name && (name.includes('sb-') || name.includes('supabase'))) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
      
      // Perform logout
      const success = await signOut();
      
      // Show success toast
      toast({
        title: "Logged out successfully",
        description: "You have been logged out from the system"
      });
      
      // Force navigation to login page
      window.location.href = '/login';
      return; // Stop execution here
    } catch (error) {
      console.error('Logout error:', error);
      
      // Re-enable the button
      const button = document.getElementById('logout-button');
      if (button) button.removeAttribute('disabled');
      
      // Show error toast
      toast({
        title: "Logout failed",
        description: "Failed to log out. Please try again.",
        variant: "destructive"
      });
      
      // Try navigation as a last resort
      try {
        await navigate('/login');
      } catch (navError) {
        console.error('Navigation error:', navError);
      }
    }
  };

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true; // Items with no roles are accessible to everyone
    if (!userData || !userData.role) return false;
    return item.roles.includes(userData.role as any);
  });

  if (loading) {
    return (<Loader2 className="animate-spin"/>)
  }

  return (
    <div 
      ref={sidebarRef}
      className={cn(
        "h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center justify-center p-4 border-b border-gray-200">
  {collapsed ? (
    <span className="font-bold text-xs tracking-wide text-[var(--primary-color)]">POS</span>
  ) : (
    <span className="font-extrabold text-lg tracking-tight text-gray-900">
      Pos by <span className="text-[var(--primary-color)]">Yeningx</span>
    </span>
  )}
</div>

      {userData && !collapsed && (
        <div className="px-4 py-2 border-b border-gray-200">
          <p className="text-sm font-medium text-gray-900">
            {userData.first_name} {userData.last_name}
          </p>
          <p className="text-xs text-gray-500 capitalize">{userData.role || "user"}</p>
        </div>
      )}

      {!collapsed && (
        <div className="mt-2 px-4">
          <p className="text-sm text-gray-500 mb-2">Main Menu</p>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto">
        <ul className={cn(
          "space-y-2",
          collapsed ? "px-1 py-2" : "px-2"
        )}>
          {filteredNavItems.map((item) => (
            <li key={item.name}>
               <NavLink
                to={item.path}
                onClick={handleMenuItemClick}
                className={({ isActive }) =>
                  cn(
                    "flex items-center py-3 text-gray-700 rounded-md transition-colors duration-200",
                    isActive ? 'active sidebar-item-active' : 'hover:bg-opacity-10',
                    collapsed ? "px-2 justify-center" : "px-4"
                  )
                }
                style={({ isActive }) => ({
                  backgroundColor: isActive ? `color-mix(in srgb, var(--primary-color), white 90%)` : '',
                  color: isActive ? 'var(--primary-color)' : '',
                  borderLeft: isActive ? '3px solid var(--primary-color)' : ''
                })}
                onMouseEnter={(e) => {
                  if (!(e.currentTarget.classList.contains('active'))) {
                    e.currentTarget.style.backgroundColor = `color-mix(in srgb, var(--primary-color), white 95%)`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(e.currentTarget.classList.contains('active'))) {
                    e.currentTarget.style.backgroundColor = '';
                  }
                }}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className={cn(
                  "h-5 w-5",
                  collapsed ? "" : "mr-3"
                )} />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            </li>
          ))}
          {/* Show logout as a menu item in collapsed/mobile view */}
          {collapsed && (
            <li>
              <button
                id="logout-button"
                onClick={async () => {
                  await handleLogout();
                  handleMenuItemClick();
                }}
                className={cn(
                  "flex items-center w-full py-3 text-gray-600 rounded-md transition-colors duration-200 justify-center hover:text-[var(--primary-color)]"
                )}
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </li>
          )}
        </ul>
      </nav>

      {/* Show logout at the bottom only on desktop/expanded */}
      {!collapsed && (
        <div className={cn(
          "border-t border-gray-200",
          collapsed ? "p-2" : "p-4"
        )}>
          <Button
            id="logout-button"
            onClick={handleLogout}
            variant="ghost"
            className={cn(
              "w-full flex items-center text-gray-600 hover:text-[var(--primary-color)]",
              collapsed ? "justify-center p-2" : "justify-center"
            )}
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut className={cn(
              "h-4 w-4",
              collapsed ? "" : "mr-2"
            )} />
            {!collapsed && "Sign out"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
