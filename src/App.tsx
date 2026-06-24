import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import UploadImprove from "./pages/UploadImprove";
import Library from "./pages/Library";
import ProcessDetail from "./pages/ProcessDetail";
import Knowledge from "./pages/Knowledge";
import Roadmaps from "./pages/Roadmaps";
import RoadmapDetail from "./pages/RoadmapDetail";
import Quality from "./pages/Quality";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AccountSettings from "./pages/AccountSettings";
import { AuthProvider } from "./lib/auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { ThemeProvider } from "./lib/theme";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<Library />} />
                      <Route path="/upload" element={<UploadImprove />} />
                      <Route path="/library" element={<Library />} />
                      <Route path="/process/:id" element={<ProcessDetail />} />
                      <Route path="/knowledge" element={<Knowledge />} />
                      <Route path="/roadmaps" element={<Roadmaps />} />
                      <Route path="/roadmaps/:id" element={<RoadmapDetail />} />
                      <Route path="/kvalitet" element={<Quality />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/account" element={<AccountSettings />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
