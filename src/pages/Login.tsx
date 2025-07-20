import React, { useEffect, useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthContext } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Logo size state
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Password reset and email confirmation state
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [resendConfirmationEmail, setResendConfirmationEmail] = useState('');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isResendConfirmationOpen, setIsResendConfirmationOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { loading, session, signIn, signUp } = useAuthContext();

  useEffect(() => {
    // Add debounce to prevent rapid navigation
    let navigationTimeout: NodeJS.Timeout;
    
    if (!loading && session) {
      // Clear any existing timeout
      if (navigationTimeout) {
        clearTimeout(navigationTimeout);
      }
      // Set a small delay before navigation
      navigationTimeout = setTimeout(() => {
        navigate('/', { replace: true });
      }, 100);
    }
    
    // Cleanup
    return () => {
      if (navigationTimeout) {
        clearTimeout(navigationTimeout);
      }
    };
  }, [session, loading, navigate]);
  
  

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Please enter both email and password.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await signIn(email, password);
      
      if (result?.error) {
        throw new Error(result.error.message || 'Failed to sign in');
      }
      
      // No need to show success message here as the redirect will handle it
      
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Failed to sign in. Please check your credentials and try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please confirm your email before signing in.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }
    
    setIsRegisterLoading(true);
    
    try {
      await signUp(registerEmail, registerPassword, firstName, lastName, 'admin');
      toast({
        title: "Registration successful",
        description: "Please check your email to confirm your account.",
      });
      // Switch to login tab
      document.getElementById('login-tab')?.click();
    } catch (error) {
      console.error(error);
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "There was an error creating your account.",
        variant: "destructive",
      });
    } finally {
      setIsRegisterLoading(false);
    }
  };

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!forgotPasswordEmail) return;
    
    setIsProcessing(true);
    
    try {
      // Use default Supabase reset flow without redirect override
      // Supabase will send a link with the format: https://yourdomain.com/#access_token=xxx&type=recovery
      // Our AuthCallback component will handle this URL format
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail);
      
      if (error) throw error;
      
      toast({
        title: 'Password reset email sent',
        description: 'Check your email for a link to reset your password. Please check your spam folder if you do not see it.',
      });
      
      setIsForgotPasswordOpen(false);
      
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        title: 'Failed to send reset email',
        description: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle resend confirmation email
  const handleResendConfirmation = async () => {
    if (!resendConfirmationEmail) return;
    
    setIsProcessing(true);
    
    try {
      // Supabase doesn't have a direct method to resend confirmation
      // So we use the signUp method again which will resend for unconfirmed accounts
      const { error } = await supabase.auth.signUp({
        email: resendConfirmationEmail,
        password: 'temporaryPassword123', // This won't be used if account exists
      });
      
      if (error) throw error;
      
      toast({
        title: 'Confirmation email sent',
        description: 'If an account exists and is not confirmed, a new confirmation email has been sent.',
      });
      
      setIsResendConfirmationOpen(false);
      
    } catch (error) {
      console.error('Resend confirmation error:', error);
      toast({
        title: 'Failed to resend confirmation',
        description: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 sm:p-6 md:p-8 overflow-auto hide-scrollbar">
      <div className="w-full max-w-md mx-auto flex-shrink-0">
        <div className={`text-center ${activeTab === 'login' ? 'mb-6 sm:mb-8' : 'mb-2'} transition-all duration-300`}>
          {activeTab === 'login' ? (
            <div className="flex justify-center mb-2 transition-all duration-300 ease-in-out">
              <img 
                src="/logonew.png" 
                alt="YENING X POS" 
                className="w-auto h-16 sm:h-20 md:h-24 transition-all duration-300"
              />
            </div>
          ) : (
            <div className="flex justify-center transition-all duration-300 ease-in-out">
              <img 
                src="/logonew.png" 
                alt="YENING X POS" 
                className="w-auto h-5 transition-all duration-300"
              />
            </div>
          )}
          <p className={`text-sm sm:text-base text-gray-500 ${activeTab === 'register' ? 'hidden sm:block' : 'mt-1'}`}>Point of Sale System</p>
        </div>
        
        <Tabs 
          defaultValue="login" 
          className="w-full" 
          onValueChange={(value) => setActiveTab(value as 'login' | 'register')}
        >
          <TabsList className="grid w-full grid-cols-2 mb-4 h-auto py-2 rounded-lg overflow-hidden">
            <TabsTrigger 
              id="login-tab" 
              value="login"
              className="py-2 px-1 sm:px-4 text-xs sm:text-sm md:text-base font-medium transition-all"
            >
              Login
            </TabsTrigger>
            <TabsTrigger 
              value="register"
              className="py-2 px-1 sm:px-4 text-xs sm:text-sm md:text-base font-medium transition-all"
            >
              Register
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl md:text-2xl">Login</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Enter your credentials to access the POS system
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@foodie.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="text-sm sm:text-base h-10 sm:h-11"
                    />
                  </div>
                  
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
                      <a 
                        href="#" 
                        className="text-xs sm:text-sm text-viilare-500 hover:text-viilare-600"
                        onClick={(e) => {
                          e.preventDefault();
                          setForgotPasswordEmail(email);
                          setIsForgotPasswordOpen(true);
                        }}
                      >
                        Forgot password?
                      </a>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="text-sm sm:text-base h-10 sm:h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="px-3 sm:px-5 pb-3 sm:pb-5 pt-0">
                  <Button
                    type="submit"
                    className="w-full bg-viilare-500 text-white hover:bg-viilare-600 h-10 sm:h-11 md:h-12 text-xs sm:text-sm md:text-base transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : 'Sign In'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl md:text-2xl">Create an account</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Register to get started with VIILARE POS
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-5 max-h-[60vh] sm:max-h-none overflow-y-auto hide-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="firstName" className="text-sm sm:text-base">First name</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="text-sm sm:text-base h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="lastName" className="text-sm sm:text-base">Last name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="text-sm sm:text-base h-10 sm:h-11"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="registerEmail" className="text-sm sm:text-base">Email</Label>
                    <Input
                      id="registerEmail"
                      type="email"
                      placeholder="john@example.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      className="text-sm sm:text-base h-10 sm:h-11"
                    />
                  </div>
                  
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="registerPassword" className="text-sm sm:text-base">Password</Label>
                    <div className="relative">
                      <Input
                        id="registerPassword"
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                        className="text-sm sm:text-base h-10 sm:h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                      >
                        {showRegisterPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm sm:text-base">Confirm password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="text-sm sm:text-base h-10 sm:h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="px-3 sm:px-5 pb-3 sm:pb-5 pt-0">
                  <Button
                    type="submit"
                    className="w-full bg-viilare-500 text-white hover:bg-viilare-600 h-10 sm:h-11 md:h-12 text-xs sm:text-sm md:text-base transition-all"
                    disabled={isRegisterLoading}
                  >
                    {isRegisterLoading ? "Creating account..." : "Create account"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Forgot Password Dialog */}
        <AlertDialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg sm:text-xl">Reset your password</AlertDialogTitle>
              <AlertDialogDescription className="text-xs sm:text-sm">
                Enter your email address and we'll send you a link to reset your password.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3 my-4">
              <Label htmlFor="reset-email" className="text-sm sm:text-base">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                placeholder="Enter your email address"
                className="text-sm sm:text-base h-10 sm:h-11"
              />
            </div>
            <AlertDialogFooter className="flex-col space-y-2 sm:space-y-0 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setIsForgotPasswordOpen(false)}
                className="w-full sm:w-auto text-xs sm:text-sm h-10 sm:h-11"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || !forgotPasswordEmail}
                onClick={handlePasswordReset}
                className="w-full sm:w-auto bg-viilare-500 hover:bg-viilare-600 text-xs sm:text-sm h-10 sm:h-11"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : 'Send reset link'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Resend Confirmation Dialog */}
        <AlertDialog open={isResendConfirmationOpen} onOpenChange={setIsResendConfirmationOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg sm:text-xl">Resend confirmation email</AlertDialogTitle>
              <AlertDialogDescription className="text-xs sm:text-sm">
                Having trouble confirming your account? Enter your email address and we'll resend the confirmation link.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3 my-4">
              <Label htmlFor="confirmation-email" className="text-sm sm:text-base">Email</Label>
              <Input
                id="confirmation-email"
                type="email"
                value={resendConfirmationEmail}
                onChange={(e) => setResendConfirmationEmail(e.target.value)}
                placeholder="Enter your email address"
                className="text-sm sm:text-base h-10 sm:h-11"
              />
            </div>
            <AlertDialogFooter className="flex-col space-y-2 sm:space-y-0 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setIsResendConfirmationOpen(false)}
                className="w-full sm:w-auto text-xs sm:text-sm h-10 sm:h-11"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || !resendConfirmationEmail}
                onClick={handleResendConfirmation}
                className="w-full sm:w-auto bg-viilare-500 hover:bg-viilare-600 text-xs sm:text-sm h-10 sm:h-11"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : 'Resend confirmation'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      
      {/* Link to resend confirmation email at the bottom */}
      <p className="mt-6 text-center text-xs sm:text-sm text-gray-500">
        Having trouble confirming your email?{' '}
        <a 
          href="#" 
          className="text-viilare-500 hover:text-viilare-600"
          onClick={(e) => {
            e.preventDefault();
            setResendConfirmationEmail('');
            setIsResendConfirmationOpen(true);
          }}
        >
          Resend confirmation email
        </a>
      </p>
    </div>
  );
};



export default Login;
