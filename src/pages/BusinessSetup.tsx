import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const BusinessSetup = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    tax_id: "",
    address: "",
    phone: "",
    email: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { session } = useAuthContext();
  const user = session?.user || null;

  useEffect(() => {
    // Check if user is already associated with a business
    const checkBusinessAssociation = async () => {
      if (!session) {
        navigate("/login");
      }

      try {
        const { data } = await supabase
          .from("users")
          .select("business_id")
          .eq("id", user.id)
          .single();

        // If user already has a business_id, redirect to dashboard
        if (data?.business_id) {
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error("Error checking business association:", error);
      }
    };

    checkBusinessAssociation();
  }, [session, user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please login first",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      // Create the business
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .insert([
          {
            name: formData.name,
            tax_id: formData.tax_id,
            address: formData.address,
            phone: formData.phone,
            email: formData.email,
          },
        ])
        .select("id")
        .single();

      if (businessError) throw businessError;

      // Update the user with the business_id
      const { error: userError } = await supabase
        .from("users")
        .update({ business_id: businessData.id })
        .eq("id", user.id);

      if (userError) throw userError;

      // Add a row in the settings table with business information
      const { error: settingsError } = await supabase
        .from("settings")
        .insert([
          {
            business_id: businessData.id,
            business_name: formData.name,
            address: formData.address,
            phone_number: formData.phone,
            tax_rate: 5.0, // Default tax rate
            primary_color: "#FF7700", // Default primary color
            secondary_color: "#7c3aed", // Default secondary color
          },
        ])
        .select();

      if (settingsError) throw settingsError;

      toast({
        title: "Business setup complete",
        description: "Your business has been registered successfully",
      });
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
    } catch (error: any) {
      console.error("Error setting up business:", error);
      toast({
        title: "Error",
        description:
          error.message || "There was an issue setting up your business",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
       // Redirect to dashboard without logging out the user
      navigate("/");
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen w-full flex justify-center overflow-y-auto scrollbar-hide py-8 px-4">
      <div className="w-full max-w-md flex flex-col">
        <div className="text-center mb-6 sm:mb-8 flex-shrink-0">
          <div className="flex justify-center mb-2">
            <img
              src="/logo.png"
              alt="VIILARE"
              className="w-auto h-16 sm:h-20 md:h-24"
            />
          </div>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Business Setup
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl md:text-2xl">
              Business Information
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Please provide your business details to continue
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="name" className="text-sm sm:text-base">
                  Business Name *
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="text-sm sm:text-base h-10 sm:h-11"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="tax_id" className="text-sm sm:text-base">
                  Tax ID / GST Number
                </Label>
                <Input
                  id="tax_id"
                  name="tax_id"
                  value={formData.tax_id}
                  onChange={handleChange}
                  className="text-sm sm:text-base h-10 sm:h-11"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="address" className="text-sm sm:text-base">
                  Business Address
                </Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="text-sm sm:text-base h-10 sm:h-11"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="phone" className="text-sm sm:text-base">
                  Business Phone
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="text-sm sm:text-base h-10 sm:h-11"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="email" className="text-sm sm:text-base">
                  Business Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
            </CardContent>
            <CardFooter className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
              <Button
                type="submit"
                className="w-full bg-viilare-500 hover:bg-viilare-600 h-10 sm:h-11 md:h-12 text-xs sm:text-sm md:text-base transition-all"
                disabled={loading || !formData.name}
              >
                {loading ? "Setting up..." : "Complete Setup"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default BusinessSetup;
