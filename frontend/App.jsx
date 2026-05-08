import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { ThemeProvider } from '@/lib/ThemeContext';
import { DataProvider } from '@/lib/DataContext';

import AppLayout from '@/components/layout/AppLayout';
import ExecutiveCockpit from '@/pages/ExecutiveCockpit';
import RiskCenter from '@/pages/RiskCenter';
import ContractsOperations from '@/pages/ContractsOperations';
import Contract360 from '@/pages/Contract360';
import AlertCenter from '@/pages/AlertCenter';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground tracking-widest uppercase">Loading Intelligence Platform</span>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <DataProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ExecutiveCockpit />} />
          <Route path="/risk-center" element={<RiskCenter />} />
          <Route path="/contracts" element={<ContractsOperations />} />
          <Route path="/contract/:id" element={<Contract360 />} />
          <Route path="/alerts" element={<AlertCenter />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </DataProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App