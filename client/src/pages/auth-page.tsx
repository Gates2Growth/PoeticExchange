import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema } from "@shared/schema";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Login schema
const loginSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

// Registration schema
const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      displayName: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-6xl w-full flex bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Hero Section */}
        <div className="hidden md:block md:w-1/2 bg-primary p-12 text-white">
          <div className="h-full flex flex-col justify-center">
            <h1 className="font-display text-4xl font-bold mb-4">Poetic Exchange</h1>
            <p className="text-lg mb-8 font-serif italic">Share your poetry with a trusted friend</p>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="bg-blue-700 rounded-full p-2 mr-4">
                  <i className="fas fa-pen-fancy"></i>
                </div>
                <div>
                  <h3 className="font-medium text-lg mb-1">Creative Freedom</h3>
                  <p className="text-blue-100">Express yourself through beautiful poems and share your thoughts</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-blue-700 rounded-full p-2 mr-4">
                  <i className="fas fa-comments"></i>
                </div>
                <div>
                  <h3 className="font-medium text-lg mb-1">Meaningful Conversations</h3>
                  <p className="text-blue-100">Exchange ideas and feedback with your poetry partner</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-blue-700 rounded-full p-2 mr-4">
                  <i className="fas fa-images"></i>
                </div>
                <div>
                  <h3 className="font-medium text-lg mb-1">Visual Inspiration</h3>
                  <p className="text-blue-100">Enhance your poetry with beautiful images</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Forms */}
        <div className="w-full md:w-1/2 p-8">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold text-darktext mb-2">Poetic Exchange</h2>
            <p className="text-gray-500 italic mb-6">Share your poetry with a trusted friend</p>
          </div>
          
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card>
                <CardContent className="pt-6">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter your password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <span className="flex items-center gap-2">
                            <i className="fas fa-spinner fa-spin"></i> Signing in...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <i className="fas fa-lock"></i> Sign in
                          </span>
                        )}
                      </Button>
                    </form>
                  </Form>
                  
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">
                      Don't have an account?{" "}
                      <button 
                        onClick={() => setActiveTab("register")}
                        className="text-primary hover:underline"
                      >
                        Register now
                      </button>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card>
                <CardContent className="pt-6">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Choose a username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="displayName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your name to display" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Create a password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Confirm your password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <span className="flex items-center gap-2">
                            <i className="fas fa-spinner fa-spin"></i> Creating account...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <i className="fas fa-user-plus"></i> Create account
                          </span>
                        )}
                      </Button>
                    </form>
                  </Form>
                  
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">
                      Already have an account?{" "}
                      <button 
                        onClick={() => setActiveTab("login")}
                        className="text-primary hover:underline"
                      >
                        Sign in
                      </button>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
