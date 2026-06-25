import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";

// Pages
import Landing from "@/pages/landing";
import Docs from "@/pages/docs";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Bots from "@/pages/bots";
import BotWorkspace from "@/pages/bot-workspace";
import Marketplace from "@/pages/marketplace";
import Themes from "@/pages/themes";
import Plans from "@/pages/plans";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin";
import AdminUsers from "@/pages/admin-users";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BrandHomeButton } from "@/components/layout/brand-home";
import { Spinner } from "@/components/ui/spinner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, adminOnly = false, ...rest }: { component: any, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && user.role !== "admin" && user.role !== "super_admin") {
    return <Redirect to="/dashboard" />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="h-5 w-px bg-border mx-1" />
          <BrandHomeButton className="size-8" />
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Component {...rest} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function PublicOnlyRoute({ component: Component, ...rest }: { component: any }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Redirect to="/dashboard" />;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/docs" component={Docs} />
      <Route path="/login"><PublicOnlyRoute component={Login} /></Route>
      <Route path="/register"><PublicOnlyRoute component={Register} /></Route>
      
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/bots"><ProtectedRoute component={Bots} /></Route>
      <Route path="/bots/:botId"><ProtectedRoute component={BotWorkspace} /></Route>
      <Route path="/marketplace"><ProtectedRoute component={Marketplace} /></Route>
      <Route path="/themes"><ProtectedRoute component={Themes} /></Route>
      <Route path="/plans"><ProtectedRoute component={Plans} /></Route>
      <Route path="/profile"><ProtectedRoute component={Profile} /></Route>
      
      <Route path="/admin"><ProtectedRoute component={Admin} adminOnly /></Route>
      <Route path="/admin/users"><ProtectedRoute component={AdminUsers} adminOnly /></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
