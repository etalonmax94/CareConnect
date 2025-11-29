import { useEffect } from "react";
import { Home, Users, FileText, BarChart3, UserCog, Building2, Briefcase, LogOut, User, Stethoscope, Pill, Calculator, Shield, History, HeartPulse, Calendar, ClipboardList, HomeIcon, LifeBuoy, ListTodo, MessageSquare } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { removeAuthToken } from "@/lib/auth";
import logoImage from "@assets/EmpowerLink Word_1764064625503.png";
import { cn } from "@/lib/utils";

interface UserInfo {
  id: string;
  email: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  roles: string[];
  isFirstLogin: string;
}

interface AppSidebarProps {
  user?: UserInfo | null;
}

interface MenuItem {
  title: string;
  url: string;
  icon: typeof Home;
  iconColor: string;
}

interface MenuCategory {
  label: string;
  items: MenuItem[];
}

const menuCategories: MenuCategory[] = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", url: "/", icon: Home, iconColor: "text-blue-500" },
    ],
  },
  {
    label: "Clients",
    items: [
      { title: "Clients", url: "/clients", icon: Users, iconColor: "text-emerald-500" },
      { title: "Appointments", url: "/appointments", icon: Calendar, iconColor: "text-sky-500" },
      { title: "Quotes", url: "/quotes", icon: Calculator, iconColor: "text-purple-500" },
      { title: "Documents", url: "/documents", icon: FileText, iconColor: "text-amber-500" },
      { title: "SIL Houses", url: "/sil-houses", icon: HomeIcon, iconColor: "text-indigo-500" },
    ],
  },
  {
    label: "Team",
    items: [
      { title: "Care Team", url: "/care-team", icon: UserCog, iconColor: "text-emerald-500" },
      { title: "Tasks", url: "/tasks", icon: ListTodo, iconColor: "text-violet-500" },
      { title: "Chat", url: "/chat", icon: MessageSquare, iconColor: "text-pink-500" },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Reports", url: "/reports", icon: BarChart3, iconColor: "text-orange-500" },
      { title: "Form Templates", url: "/form-templates", icon: ClipboardList, iconColor: "text-lime-500" },
      { title: "Help Desk", url: "/help-desk", icon: LifeBuoy, iconColor: "text-cyan-500" },
      { title: "Audit Log", url: "/audit-log", icon: History, iconColor: "text-slate-500" },
    ],
  },
];

export function AppSidebar({ user }: AppSidebarProps) {
  const [location] = useLocation();
  const { state, isMobile, setOpenMobile } = useSidebar();
  // On mobile, always show expanded menu with text labels (never collapsed icons-only view)
  const isCollapsed = isMobile ? false : state === "collapsed";

  // Auto-close sidebar on mobile after navigation (watches location changes)
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location, isMobile, setOpenMobile]);

  // Fallback for immediate close on menu click
  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
  const handleSignOut = async () => {
    console.log('[Auth] Sign out initiated from sidebar');
    
    // Clear JWT token from localStorage first
    removeAuthToken();
    console.log('[Auth] Token removed from localStorage');
    
    // Clear query cache
    queryClient.clear();
    console.log('[Auth] Query cache cleared');
    
    try {
      // Call logout API and wait for it to complete
      const response = await fetch("/api/auth/logout", { 
        method: "POST",
        credentials: "include"
      });
      if (response.ok) {
        console.log('[Auth] Server logout successful');
      } else {
        console.log('[Auth] Server returned error, but continuing with client-side logout');
      }
    } catch (error) {
      console.log('[Auth] Server logout failed, continuing with client-side redirect');
    }
    
    // Force full page reload to login - use replace to prevent back button issues
    console.log('[Auth] Redirecting to /login');
    window.location.replace("/login");
  };

  const displayName = user?.firstName || user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  const canApproveUsers = user?.roles?.some(role => 
    ["director", "operations_manager"].includes(role)
  ) ?? false;

  const adminItems: MenuItem[] = canApproveUsers ? [
    { title: "User Approvals", url: "/user-approvals", icon: Shield, iconColor: "text-red-500" },
  ] : [];

  const renderMenuItem = (item: MenuItem) => {
    const isActive = location === item.url;
    const handleNavigation = (e: React.MouseEvent) => {
      handleMenuClick();
    };
    
    const menuContent = (
      <Link href={item.url} onClick={handleNavigation} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
        <div className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
          isCollapsed ? "justify-center" : "",
          isActive 
            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' 
            : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
        )}>
          <item.icon className={cn("w-5 h-5 flex-shrink-0", item.iconColor)} />
          {!isCollapsed && <span>{item.title}</span>}
        </div>
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.title} delayDuration={0}>
          <TooltipTrigger asChild>
            {menuContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.title}
          </TooltipContent>
        </Tooltip>
      );
    }

    return menuContent;
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className={cn(
        "border-b border-sidebar-border",
        isCollapsed ? "p-2" : "p-4"
      )}>
        <div className="flex items-center justify-center">
          {isCollapsed ? (
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">E</span>
            </div>
          ) : (
            <img src={logoImage} alt="EmpowerLink" className="h-7 w-auto" />
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent className={cn("pt-2", isCollapsed ? "px-1" : "px-2")}>
        {!isCollapsed && user && (
          <div className="px-3 py-3 mb-1">
            <div className="flex items-center gap-2 text-sidebar-foreground">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium" data-testid="text-user-greeting">
                Hi {displayName}
              </span>
            </div>
          </div>
        )}
        
        {menuCategories.map((category, index) => (
          <div key={category.label}>
            <SidebarGroup className="py-1">
              {!isCollapsed && (
                <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
                  {category.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {category.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      {renderMenuItem(item)}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            {isCollapsed && index < menuCategories.length - 1 && (
              <div className="my-1 px-2">
                <div className="border-b border-sidebar-border/50"></div>
              </div>
            )}
          </div>
        ))}
        
        {adminItems.length > 0 && (
          <div>
            {isCollapsed && (
              <div className="my-1 px-2">
                <div className="border-b border-sidebar-border/50"></div>
              </div>
            )}
            <SidebarGroup className="py-1">
              {!isCollapsed && (
                <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
                  Admin
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      {renderMenuItem(item)}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        )}
      </SidebarContent>
      
      {user && (
        <SidebarFooter className={cn(
          "border-t border-sidebar-border",
          isCollapsed ? "p-1" : "p-2"
        )}>
          {isCollapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="w-full text-sidebar-foreground hover:bg-sidebar-accent/50"
                  onClick={handleSignOut}
                  data-testid="button-logout"
                >
                  <LogOut className="w-5 h-5 text-red-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                Sign Out
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent/50"
              onClick={handleSignOut}
              data-testid="button-logout"
            >
              <LogOut className="w-5 h-5 text-red-500" />
              <span>Sign Out</span>
            </Button>
          )}
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
