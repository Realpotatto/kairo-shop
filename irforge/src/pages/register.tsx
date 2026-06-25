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
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { OrangeRobot } from "@/components/layout/brand-home";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const { register } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true);
    try {
      await register(data);
      toast({
        title: "Account created",
        description: "Welcome to IrForge! You are now logged in.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error?.message || "Could not create account. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-background relative">
      <Link
        href="/"
        className="absolute top-4 left-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        data-testid="link-back-home"
      >
        <ArrowLeft className="size-4" />
        Back to home
      </Link>

      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
          <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <OrangeRobot className="size-6" />
          </div>
          <span className="font-bold text-2xl tracking-tight">IrForge</span>
        </Link>
        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[400px]">
        <div className="bg-card px-4 py-8 shadow-xl sm:rounded-xl border sm:px-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Developer"
                        {...field}
                        data-testid="input-register-name"
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="developer@example.com"
                        {...field}
                        data-testid="input-register-email"
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        data-testid="input-register-password"
                        disabled={isLoading}
                        className="bg-background"
                      />
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground mt-1">Must be at least 6 characters.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-11" 
                disabled={isLoading}
                data-testid="button-register-submit"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Register"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
