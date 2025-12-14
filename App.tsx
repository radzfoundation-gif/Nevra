import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import Home from './components/pages/Home';
import ChatInterface from './components/pages/ChatInterface';
import AgentsPage from './components/pages/AgentsPage';
import WorkflowsPage from './components/pages/WorkflowsPage';
import EnterprisePage from './components/pages/EnterprisePage';
import PricingPage from './components/pages/PricingPage';
import SignInPage from './components/auth/SignInPage';
import SignUpPage from './components/auth/SignUpPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useUserSync } from './hooks/useSupabase';
import ErrorBoundary from './components/ErrorBoundary';

// Get Clerk publishable key from environment
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Better error handling - don't throw immediately, show helpful message
if (!CLERK_PUBLISHABLE_KEY) {
  console.error('❌ Missing Clerk Publishable Key!');
  console.error('📝 Please add VITE_CLERK_PUBLISHABLE_KEY to your .env.local file');
  console.error('💡 Example: VITE_CLERK_PUBLISHABLE_KEY=pk_test_...');
  console.error('🔗 Get your key from: https://dashboard.clerk.com');
}

// Component to sync Clerk user with Supabase
const UserSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useUserSync(); // Automatically sync user on mount
  return <>{children}</>;
};

const App: React.FC = () => {
  // Show error page if Clerk key is missing
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-[#0a0a0a] border border-red-500/30 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Clerk Configuration Missing</h1>
          <p className="text-gray-300 mb-6">
            Clerk Publishable Key tidak ditemukan. Silakan setup environment variable terlebih dahulu.
          </p>
          <div className="bg-[#151515] border border-white/10 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-400 mb-2">Langkah-langkah:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300 ml-2">
              <li>Buat file <code className="bg-black/50 px-2 py-1 rounded">.env.local</code> di root project</li>
              <li>Tambahkan: <code className="bg-black/50 px-2 py-1 rounded">VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here</code></li>
              <li>Dapatkan key dari <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Clerk Dashboard</a></li>
              <li>Restart development server: <code className="bg-black/50 px-2 py-1 rounded">npm run dev</code></li>
            </ol>
          </div>
          <a
            href="https://dashboard.clerk.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            Buka Clerk Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ClerkProvider 
        publishableKey={CLERK_PUBLISHABLE_KEY}
        afterSignInUrl="/chat"
        afterSignUpUrl="/chat"
      >
        <UserSyncProvider>
          <Router>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/sign-in" element={<SignInPage />} />
                <Route path="/sign-up" element={<SignUpPage />} />
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <ChatInterface />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route path="/agents" element={<AgentsPage />} />
                <Route path="/workflows" element={<WorkflowsPage />} />
                <Route path="/enterprise" element={<EnterprisePage />} />
                <Route path="/pricing" element={<PricingPage />} />
              </Routes>
            </ErrorBoundary>
          </Router>
        </UserSyncProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
};

export default App;