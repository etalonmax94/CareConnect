import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Moon, Sun, Monitor, Settings, LogOut, ChevronDown, BarChart3, History, Shield, UserCheck } from "lucide-react";
import { removeAuthToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";

type Theme = "light" | "dark" | "system";

interface User {
  id: string;
  approvalStatus?: string;
}

interface UserProfileDropdownProps {
  user: {
    id: string;
    email: string;
    displayName: string;
    firstName?: string | null;
    lastName?: string | null;
    roles: string[];
  };
}

export default function UserProfileDropdown({ user }: UserProfileDropdownProps) {
  const [theme, setTheme] = useState<Theme>("system");
  const [, setLocation] = useLocation();

  // Check if user can approve users (director or operations_manager)
  const canApproveUsers = user.roles?.some(role =>
    ["director", "operations_manager"].includes(role)
  ) ?? false;

  // Fetch pending users count if user has approval permissions
  const { data: pendingUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/pending"],
    enabled: canApproveUsers,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const pendingCount = pendingUsers.filter(u => u.approvalStatus === "pending").length;

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      setTheme("system");
      applyTheme("system");
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    if (newTheme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", prefersDark);
    } else {
      document.documentElement.classList.toggle("dark", newTheme === "dark");
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  const handleSignOut = () => {
    console.log('[Auth] Sign out initiated from profile dropdown');

    // Clear JWT token from localStorage first
    removeAuthToken();
    console.log('[Auth] Token removed from localStorage');

    // Clear query cache
    queryClient.clear();
    console.log('[Auth] Query cache cleared');

    // Call logout API asynchronously but don't wait for it
    fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    }).catch(() => {
      // Ignore errors - logout API is optional
    });

    // Force full page redirect to login immediately
    console.log('[Auth] Redirecting to /login');
    window.location.href = "/login";
  };

  const getInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user.displayName) {
      const parts = user.displayName.split(" ");
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      }
      return user.displayName.charAt(0).toUpperCase();
    }
    return user.email.charAt(0).toUpperCase();
  };

  const getDisplayName = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.displayName || user.email;
  };

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-4 w-4" />;
      case "dark":
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-2 py-1.5 h-auto relative"
          data-testid="button-user-profile"
        >
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            {/* Orange dot indicator for pending approvals */}
            {canApproveUsers && pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-orange-500" />
              </span>
            )}
          </div>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-medium leading-none">{getDisplayName()}</span>
            <span className="text-xs text-muted-foreground leading-none mt-0.5">
              {user.roles.length > 0 ? user.roles[0].replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : "User"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* User Approvals - Only show if user has permission */}
        {canApproveUsers && (
          <DropdownMenuItem
            onClick={() => setLocation("/user-approvals")}
            data-testid="menu-item-user-approvals"
            className="relative"
          >
            <UserCheck className="mr-2 h-4 w-4" />
            <span>User Approvals</span>
            {pendingCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-auto bg-orange-500 hover:bg-orange-600 text-white text-xs px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center"
              >
                {pendingCount}
              </Badge>
            )}
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          onClick={() => setLocation("/reports")}
          data-testid="menu-item-reports"
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          <span>Reports</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocation("/audit-log")}
          data-testid="menu-item-audit-log"
        >
          <History className="mr-2 h-4 w-4" />
          <span>Audit Log</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setLocation("/settings")}
          data-testid="menu-item-settings"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger data-testid="menu-item-theme">
            {getThemeIcon()}
            <span className="ml-2">Theme</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={() => handleThemeChange("light")}
              data-testid="menu-item-theme-light"
            >
              <Sun className="mr-2 h-4 w-4" />
              <span>Light</span>
              {theme === "light" && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleThemeChange("dark")}
              data-testid="menu-item-theme-dark"
            >
              <Moon className="mr-2 h-4 w-4" />
              <span>Dark</span>
              {theme === "dark" && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleThemeChange("system")}
              data-testid="menu-item-theme-system"
            >
              <Monitor className="mr-2 h-4 w-4" />
              <span>System</span>
              {theme === "system" && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
          data-testid="menu-item-signout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
