import React, { useEffect, useState, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/Layout";
import { useAuthContext } from "@/context/AuthContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { CartProvider } from "@/context/CartContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";

// Direct imports (no lazy loading)
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import POS from "@/pages/POS";
import Inventory from "@/pages/Inventory";
import Settings from "@/pages/Settings";
import Support from "@/pages/Support";
import Receipts from "@/pages/Receipts";
import Account from "@/pages/Account";
import NotFound from "@/pages/NotFound";
import BusinessSetup from "@/pages/BusinessSetup";
import Unauthorized from "@/pages/Unauthorized";
import { supabase } from "./integrations/supabase/client";
import StaffAttendance from "./pages/StaffAttendance";
import ManageUsers from "./pages/ManageUsers";
import EmailConfirm from "./pages/EmailConfirm";
import ResetPassword from "./pages/ResetPassword";
import Marketplace from "./pages/Marketplace";
import CartPage from "./pages/CartPage";
import ProductDetail from "./pages/marketplace/[id]";

function App() {
  const { session, setSession } = useAuthContext();
  const [hasRedirected, setHasRedirected] = useState(false); // Prevent repeated redirects
  const loadSession = async () => {
    try {
      const {
        data: { session: loadedSession },
      } = await supabase.auth.getSession();
      if (loadedSession) {
        setSession(loadedSession); // Set session in context
      }
    } catch (error) {
      console.error("Failed to load session:", error);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        supabase.auth.startAutoRefresh();
        loadSession(); // Replace with your session logic
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Optional: Trigger once on mount
    if (document.visibilityState === "visible") {
      supabase.auth.startAutoRefresh();
      loadSession();
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <ThemeProvider defaultTheme="light">
      <SettingsProvider>
        <CartProvider>
        <Router>
          <Suspense>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/email-confirm" element={<EmailConfirm />} />
              <Route path="/business-setup" element={<BusinessSetup />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Marketplace Routes */}
              <Route path="/marketplace">
                <Route index element={
                  <ProtectedRoute>
                    <Marketplace />
                  </ProtectedRoute>
                } />
                <Route path="cart" element={
                  <ProtectedRoute>
                    <CartPage />
                  </ProtectedRoute>
                } />
                <Route path=":id" element={
                  <ProtectedRoute>
                    <ProductDetail />
                  </ProtectedRoute>
                } />
              </Route>

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route
                  index
                  element={
                    <ProtectedRoute allowedRoles={["admin", "manager"]}>
                      <Suspense fallback={<Loader2 />}>
                        <Dashboard />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="pos"
                  element={
                    <Suspense fallback={<Loader2 />}>
                      <POS />
                    </Suspense>
                  }
                />
                <Route
                  path="inventory"
                  element={
                    <Suspense fallback={<Loader2 />}>
                      <Inventory />
                    </Suspense>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "manager"]}>
                      <Suspense fallback={<Loader2 />}>
                        <Settings />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="support"
                  element={
                    <Suspense fallback={<Loader2 />}>
                      <Support />
                    </Suspense>
                  }
                />
                <Route
                  path="receipts"
                  element={
                    <Suspense fallback={<Loader2 />}>
                      <Receipts />
                    </Suspense>
                  }
                />
                <Route
                  path="account"
                  element={
                    <Suspense fallback={<Loader2 />}>
                      <Account />
                    </Suspense>
                  }
                />
                <Route
                  path="staff-attendance"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "manager"]}>
                      <Suspense fallback={<Loader2 />}>
                        <StaffAttendance />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="manage-users"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <Suspense fallback={<Loader2 />}>
                        <ManageUsers />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
              </Route>
              
              <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Router>
        </CartProvider>
        <Toaster />
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;
