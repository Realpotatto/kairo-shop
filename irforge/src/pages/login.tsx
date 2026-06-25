import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Sun, Moon, Languages } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { OrangeRobot } from "@/components/layout/brand-home";
import { useTheme } from "next-themes";
import { useLanguage } from "@/hooks/use-language";
import { t } from "@/lib/i18n";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  adminCode: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { theme, setTheme } = useTheme();
  const { lang, toggleLang } = useLanguage();
  const tr = t[lang];
  const isDark = theme === "dark";

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      adminCode: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      // Pass adminCode as part of login if filled
      await (login as any)({ email: data.email, password: data.password, adminCode: data.adminCode || undefined });
      toast({
        title: lang === "fa" ? "خوش آمدید" : "Welcome back",
        description: lang === "fa" ? "با موفقیت وارد شدید." : "You have successfully logged in.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: lang === "fa" ? "خطا در ورود" : "Login Failed",
        description: error?.message || (lang === "fa" ? "اطلاعات نادرست است. دوباره تلاش کنید." : "Invalid credentials. Please try again."),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-background relative">
      {/* Top controls */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          data-testid="link-back-home"
        >
          <ArrowLeft className="size-4" />
          {tr.backToHome}
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="relative inline-flex items-center justify-center size-8 rounded-full border border-border bg-background text-muted-foreground transition-all hover:border-primary hover:text-primary"
            aria-label={tr.toggleTheme}
          >
            <span className="relative size-4 flex items-center justify-center overflow-hidden">
              <Sun className={`absolute size-3.5 transition-all duration-300 ${isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"}`} />
              <Moon className={`absolute size-3.5 transition-all duration-300 ${!isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50"}`} />
            </span>
          </button>
          <button
            onClick={toggleLang}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all hover:border-primary hover:text-primary"
          >
            <Languages className="size-3" />
            {tr.toggleLang}
          </button>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
          <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <OrangeRobot className="size-6" />
          </div>
          <span className="font-bold text-2xl tracking-tight">IrForge</span>
        </Link>
        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
          {tr.signInAccount}
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {tr.noAccount}{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            {tr.registerNow}
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[400px]">
        <div className="bg-card px-4 py-8 shadow-xl sm:rounded-xl border sm:px-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tr.emailAddress}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="developer@example.com"
                        {...field}
                        data-testid="input-login-email"
                        disabled={isLoading}
                        className="bg-background"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>{tr.password}</FormLabel>
                      <a href="#" className="text-xs font-medium text-primary hover:underline">
                        {tr.forgotPassword}
                      </a>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        data-testid="input-login-password"
                        disabled={isLoading}
                        className="bg-background"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Admin Code Field */}
              <FormField
                control={form.control}
                name="adminCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs font-medium">
                      {tr.adminCode}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder={tr.adminCodePlaceholder}
                        {...field}
                        data-testid="input-login-admin-code"
                        disabled={isLoading}
                        className="bg-background border-dashed text-xs"
                      />
                    </FormControl>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">{tr.adminCodeHint}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading}
                data-testid="button-login-submit"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {tr.signingIn}
                  </>
                ) : (
                  tr.signIn
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
