import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { EmailOtpType } from "@supabase/supabase-js";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [searchParams] = useSearchParams();

  const { toast } = useToast();
  const navigate = useNavigate();

  // Password strength checker
  const checkPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (pass.match(/[A-Z]/)) strength += 25;
    if (pass.match(/[0-9]/)) strength += 25;
    if (pass.match(/[^A-Za-z0-9]/)) strength += 25;
    setPasswordStrength(strength);
  };

  // Update password strength when password changes
  useEffect(() => {
    checkPasswordStrength(password);
  }, [password]);

  useEffect(() => {
    const verifyToken = async () => {
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type") as EmailOtpType | null;

      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type,
        });

        if (error) {
          navigate("/unauthorized");
        }
      } else {
        navigate("/unauthorized");
      }
    };

    verifyToken();
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (passwordStrength < 75) {
      toast({
        title: "Password too weak",
        description:
          "Please ensure your password includes uppercase letters, numbers, and special characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Session expired",
          description:
            "Your password reset session has expired. Please check your email and click the reset link again.",
          variant: "destructive",
        });
        setTimeout(() => navigate("/login"), 3000);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: "Password updated successfully",
        description:
          "Your password has been reset. You can now log in with your new password.",
      });

      await supabase.auth.signOut();
      setTimeout(() => navigate("/login"), 3000);
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        title: "Failed to reset password",
        description:
          error instanceof Error
            ? error.message
            : "The reset link may have expired. Please request a new link.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 sm:p-6 md:p-8 overflow-auto hide-scrollbar">
      <div className="w-full max-w-md mx-auto flex-shrink-0">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-2">
            <img
              src="/logo.png"
              alt="VIILARE"
              className="w-auto h-16 sm:h-20 md:h-24"
            />
          </div>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Reset Your Password
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl md:text-2xl">
              Create new password
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {isSuccess
                ? "Your password has been reset successfully!"
                : "Enter your new password below"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            {!isSuccess && (
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="password" className="text-sm sm:text-base">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="text-sm sm:text-base h-10 sm:h-11 pr-10"
                      disabled={isLoading || isSuccess}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {password && (
                    <div className="space-y-2 mt-2">
                      <Progress value={passwordStrength} className="h-1" />
                      <div className="text-xs text-gray-500">
                        Password strength:{" "}
                        {passwordStrength <= 25
                          ? "Weak"
                          : passwordStrength <= 50
                          ? "Fair"
                          : passwordStrength <= 75
                          ? "Good"
                          : "Strong"}
                      </div>
                      <ul className="text-xs text-gray-500 list-disc pl-4 space-y-1">
                        <li
                          className={
                            password.length >= 8 ? "text-green-600" : ""
                          }
                        >
                          At least 8 characters
                        </li>
                        <li
                          className={
                            /[A-Z]/.test(password) ? "text-green-600" : ""
                          }
                        >
                          One uppercase letter
                        </li>
                        <li
                          className={
                            /[0-9]/.test(password) ? "text-green-600" : ""
                          }
                        >
                          One number
                        </li>
                        <li
                          className={
                            /[^A-Za-z0-9]/.test(password)
                              ? "text-green-600"
                              : ""
                          }
                        >
                          One special character
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm sm:text-base"
                  >
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="text-sm sm:text-base h-10 sm:h-11 pr-10"
                      disabled={isLoading || isSuccess}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                  {confirmPassword && (
                    <p
                      className={`text-xs mt-1 ${
                        password === confirmPassword
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {password === confirmPassword
                        ? "Passwords match"
                        : "Passwords do not match"}
                    </p>
                  )}
                </div>
              </CardContent>
            )}

            <CardFooter className="px-3 sm:px-5 pb-3 sm:pb-5 pt-0">
              {isSuccess ? (
                <Button
                  type="button"
                  className="w-full bg-viilare-500 hover:bg-viilare-600 h-10 sm:h-11 md:h-12 text-xs sm:text-sm md:text-base transition-all"
                  onClick={() => navigate("/login")}
                >
                  Go to Login
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="w-full bg-viilare-500 hover:bg-viilare-600 h-10 sm:h-11 md:h-12 text-xs sm:text-sm md:text-base transition-all"
                  disabled={
                    isLoading ||
                    !password ||
                    !confirmPassword ||
                    passwordStrength < 75
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
