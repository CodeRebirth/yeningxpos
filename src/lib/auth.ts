import { supabase } from "@/integrations/supabase/client";

// Sign up new user
export const signUp = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: "admin" | "manager" | "staff" = "admin"
) => {
  const { data: existingUser, error: checkError } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (checkError) {
    throw new Error(`Failed to check existing users: ${checkError.message}`);
  }

  if (existingUser) {
    throw new Error("Email is already registered.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        role,
      },
    },
  });

  if (error) throw error;
  return data;
};

// Add user for multi-business support
export const addUser = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: "admin" | "manager" | "staff",
  businessId: string
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        role,
      },
    },
  });

  if (data?.user) {
    await supabase
      .from("users")
      .update({
        role: role,
        business_id: businessId,
      })
      .eq("id", data.user.id);
  }

  if (error) throw error;
  return data;
};

// Sign in user
export const signIn = async (email: string, password: string) => {
  console.log("Starting sign in process for:", email);

  try {
    console.log("Attempting to sign in with password");
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Sign in error:", error);
      throw error;
    }

    if (!data.session) {
      console.error("No session returned after sign in");
      throw new Error("Sign in failed, no session returned");
    }
    console.log("Sign in successful, session established");
    return data;
  } catch (error) {
    console.error("Exception during sign in:", error);
    throw error;
  }
};
