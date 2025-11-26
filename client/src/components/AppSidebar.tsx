import { Home, Users, FileText, BarChart3, UserCog, Building2, Briefcase, LogOut, User, Stethoscope, Pill, Calculator } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
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
      { title: "Quotes", url: "/quotes", icon: Calculator, iconColor: "text-purple-500" },
      { title: "Documents", url: "/documents", icon: FileText, iconColor: "text-amber-500" },
    ],
  },
  {
    label: "Team",
    items: [
      { title: "Staff", url: "/staff", icon: UserCog, iconColor: "text-cyan-500" },
      { title: "Support Coordinators", url: "/support-coordinators", icon: Building2, iconColor: "text-indigo-500" },
      { title: "Plan Managers", url: "/plan-managers", icon: Briefcase, iconColor: "text-pink-500" },
    ],
  },
  {
    label: "Reference",
    items: [
      { title: "GPs", url: "/gps", icon: Stethoscope, iconColor: "text-rose-500" },
      { title: "Pharmacies", url: "/pharmacies", icon: Pill, iconColor: "text-teal-500" },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Reports", url: "/reports", icon: BarChart3, iconColor: "text-orange-500" },
    ],
  },
];

export function AppSidebar({ user }: AppSidebarProps) {
  const [location] = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      window.location.href = "/login";
    },
  });

  const displayName = user?.firstName || user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  const renderMenuItem = (item: MenuItem) => {
    const isActive = location === item.url;
    const menuContent = (
      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
          ) : (
            <img src={logoImage} alt="EmpowerLink" className="h-6 w-auto" />
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent className={cn("pt-2", isCollapsed ? "px-1" : "px-2")}>
        {!isCollapsed && user && (
          <div className="px-3 py-3 mb-1">
            <div className="flex items-center gap-2 text-sidebar-foreground">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium" data-testid="text-user-greeting">
                Hi {displayName}
              </span>
            </div>
          </div>
        )}
        
        {menuCategories.map((category) => (
          <SidebarGroup key={category.label} className="py-1">
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
        ))}
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
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
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
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              <LogOut className="w-5 h-5 text-red-500" />
              <span>{logoutMutation.isPending ? "Signing out..." : "Sign Out"}</span>
            </Button>
          )}
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
