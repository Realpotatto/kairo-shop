import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { 
  Bot, 
  LayoutDashboard, 
  Store, 
  Palette, 
  CreditCard, 
  Settings, 
  ShieldAlert, 
  Users,
  LogOut,
  Moon,
  Sun
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { setTheme, theme } = useTheme();

  if (!user) return null;

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="flex h-16 items-center justify-center border-b border-sidebar-border px-4 py-0">
        <div className="flex w-full items-center gap-2 overflow-hidden">
          <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bot className="size-5" />
          </div>
          <span className="truncate font-semibold text-lg tracking-tight group-data-[collapsible=icon]:hidden">
            IrForge
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="pt-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/dashboard"} tooltip="Dashboard">
                  <Link href="/dashboard" data-testid="nav-dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith("/bots")} tooltip="My Bots">
                  <Link href="/bots" data-testid="nav-bots">
                    <Bot />
                    <span>My Bots</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/marketplace"} tooltip="Marketplace">
                  <Link href="/marketplace" data-testid="nav-marketplace">
                    <Store />
                    <span>Marketplace</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/themes"} tooltip="Theme Builder">
                  <Link href="/themes" data-testid="nav-themes">
                    <Palette />
                    <span>Theme Builder</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/plans"} tooltip="Plans & Billing">
                  <Link href="/plans" data-testid="nav-plans">
                    <CreditCard />
                    <span>Plans & Billing</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user.role === "admin" && (
          <SidebarGroup>
            <div className="px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden">
              Admin
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/admin"} tooltip="Admin Panel">
                    <Link href="/admin" data-testid="nav-admin">
                      <ShieldAlert />
                      <span>Admin Panel</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/admin/users"} tooltip="Manage Users">
                    <Link href="/admin/users" data-testid="nav-admin-users">
                      <Users />
                      <span>Manage Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex w-full items-center gap-3 cursor-pointer overflow-hidden rounded-md p-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <Avatar className="size-8 rounded-md border border-sidebar-border bg-background">
                <AvatarImage src={user.avatar || ""} />
                <AvatarFallback className="rounded-md bg-primary/10 text-primary">{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="truncate text-xs text-sidebar-foreground/60">{user.email}</span>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="right" className="w-56" sideOffset={8}>
            <div className="flex items-center gap-2 p-2">
              <Avatar className="size-8 rounded-md">
                <AvatarImage src={user.avatar || ""} />
                <AvatarFallback className="rounded-md bg-primary/10 text-primary">{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user.name}</span>
                <Badge variant="outline" className="h-4 px-1 text-[10px] uppercase w-fit">{user.plan}</Badge>
              </div>
            </div>
            
            <div className="h-px bg-border my-1" />
            
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex w-full cursor-pointer items-center">
                <Settings className="mr-2 size-4" />
                <span>Profile Settings</span>
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="mr-2 size-4" /> : <Moon className="mr-2 size-4" />}
              <span>Toggle Theme</span>
            </DropdownMenuItem>
            
            <div className="h-px bg-border my-1" />
            
            <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
              <LogOut className="mr-2 size-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
