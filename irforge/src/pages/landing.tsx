import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Terminal, Blocks, Zap, ChevronRight, Github, Shield, BarChart3, Bot } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function OrangeRobot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
      {/* antenna */}
      <line x1="24" y1="4" x2="24" y2="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="24" cy="3.5" r="2.5" />
      {/* head */}
      <rect x="11" y="10" width="26" height="18" rx="5" />
      {/* eyes */}
      <circle cx="19" cy="19" r="3" fill="hsl(0 0% 5%)" />
      <circle cx="29" cy="19" r="3" fill="hsl(0 0% 5%)" />
      <circle cx="20" cy="18" r="1" fill="white" opacity="0.6"/>
      <circle cx="30" cy="18" r="1" fill="white" opacity="0.6"/>
      {/* mouth */}
      <rect x="18" y="24" width="12" height="2.5" rx="1.25" fill="hsl(0 0% 5%)" opacity="0.7"/>
      {/* ears */}
      <rect x="7" y="15" width="4" height="8" rx="2" />
      <rect x="37" y="15" width="4" height="8" rx="2" />
      {/* body */}
      <rect x="13" y="30" width="22" height="14" rx="4" />
      {/* chest panel */}
      <rect x="18" y="33" width="5" height="5" rx="1.5" fill="hsl(0 0% 5%)" opacity="0.3"/>
      <rect x="25" y="33" width="5" height="5" rx="1.5" fill="hsl(0 0% 5%)" opacity="0.3"/>
      {/* legs */}
      <rect x="16" y="45" width="6" height="3" rx="1.5" />
      <rect x="26" y="45" width="6" height="3" rx="1.5" />
    </svg>
  );
}

function IranianFlagStripe() {
  return (
    <div className="flex w-full h-1.5 rounded-full overflow-hidden">
      <div className="flex-1 bg-[#239f40]" />
      <div className="flex-1 bg-[#f5f0e8]" />
      <div className="flex-1 bg-[#c00]" />
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Iranian flag stripe at very top */}
      <div className="w-full flex h-1">
        <div className="flex-1 bg-[#239f40]" />
        <div className="flex-1 bg-[#f5f0e8]" />
        <div className="flex-1 bg-[#c00]" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex aspect-square size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <OrangeRobot className="size-6 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-lg tracking-tight text-foreground">IrForge</span>
              <span className="text-[9px] text-primary font-semibold tracking-widest uppercase opacity-80">Bot Platform</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
              Sign In
            </Link>
            <Button asChild>
              <Link href={user ? "/dashboard" : "/register"}>
                {user ? "Dashboard" : "Get Started"}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 border-b relative overflow-hidden">
          {/* Orange glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute top-20 right-1/4 w-[300px] h-[300px] bg-primary/5 rounded-full blur-2xl" />
          </div>

          <div className="container mx-auto px-4 relative z-10 text-center max-w-5xl">
            {/* Iranian Flag image as hero emblem */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-primary/20 blur-2xl scale-110" />
                <img
                  src="/iran-flag.jpg"
                  alt="Iran Imperial Flag — Shir o Khorshid"
                  className="relative w-56 md:w-72 rounded-xl border-2 border-primary/40 shadow-2xl shadow-primary/20 object-cover"
                />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold bg-primary/10 text-primary mb-6">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              Platform v2.0 — Built for Iran's builders
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
              The professional<br className="hidden md:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-400 to-amber-400">
                {" "}Telegram Bot Platform
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Build, deploy, and scale advanced Telegram bots and Mini Apps.
              The power of code, the speed of no-code, wrapped in a developer-first experience.
            </p>

            {/* Flag stripe under tagline */}
            <div className="max-w-xs mx-auto mb-10">
              <IranianFlagStripe />
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="h-12 px-8 text-base font-semibold" asChild>
                <Link href={user ? "/dashboard" : "/register"}>
                  Start Building Now <ChevronRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base border-primary/30 hover:border-primary hover:text-primary">
                <Terminal className="mr-2 size-4" />
                View Documentation
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Engineered for Scale</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Everything you need to run production bots, right out of the box.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  icon: Terminal,
                  title: "Advanced Commands",
                  description: "Visual builder meets code. Define complex logic, argument parsing, and permissions with ease."
                },
                {
                  icon: Blocks,
                  title: "Plugin Marketplace",
                  description: "One-click install plugins. Analytics, moderation, payments, AI integrations, and more."
                },
                {
                  icon: Zap,
                  title: "Instant Deploy",
                  description: "Push changes instantly without downtime. Real-time logging and performance monitoring."
                },
                {
                  icon: Shield,
                  title: "Enterprise Security",
                  description: "Role-based permissions, token management, and full audit logs for your team."
                },
                {
                  icon: BarChart3,
                  title: "Analytics Dashboard",
                  description: "Track users, messages, uptime, and revenue with beautiful real-time charts."
                },
                {
                  icon: Bot,
                  title: "Multi-Bot Management",
                  description: "Control unlimited bots from one dashboard. Switch contexts in seconds."
                }
              ].map((feature, i) => (
                <div key={i} className="bg-card p-6 rounded-xl border border-border hover:border-primary/40 transition-colors shadow-sm flex flex-col items-center text-center group">
                  <div className="p-3 bg-primary/10 rounded-lg mb-4 text-primary group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20 border-t relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 pointer-events-none" />
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="flex justify-center mb-6">
              <img
                src="/iran-flag.jpg"
                alt="Iran Imperial Flag"
                className="w-24 h-14 object-cover rounded-lg border border-primary/30 opacity-80"
              />
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              Ready to forge your bots?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of Iranian developers building the next generation of Telegram experiences.
            </p>
            <Button size="lg" className="h-12 px-10 text-base font-bold" asChild>
              <Link href={user ? "/dashboard" : "/register"}>
                Create Free Account <ChevronRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-10 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <OrangeRobot className="size-5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-bold text-foreground">IrForge Platform</span>
                <div className="mt-1 w-20">
                  <IranianFlagStripe />
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} IrForge. Made with pride for Iranian developers.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="size-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
