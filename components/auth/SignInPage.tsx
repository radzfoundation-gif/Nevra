import React, { useEffect, useState } from 'react';
import { SignIn, useAuth, useClerk } from '@clerk/clerk-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../Logo';
import { AlertTriangle, Loader2 } from 'lucide-react';

const SignInPage: React.FC = () => {
    const { isSignedIn, isLoaded } = useAuth();
    const clerk = useClerk();
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState<string | null>(null);
    const [isClerkReady, setIsClerkReady] = useState(false);

    // Get the intended destination from location state
    const from = (location.state as any)?.from || '/';

    // Check if Clerk is properly initialized
    useEffect(() => {
        const checkClerk = () => {
            try {
                const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
                
                if (!publishableKey) {
                    setError('Clerk Publishable Key tidak ditemukan. Pastikan VITE_CLERK_PUBLISHABLE_KEY sudah di-set di file .env.local');
                    return;
                }

                if (!publishableKey.startsWith('pk_')) {
                    setError('Clerk Publishable Key tidak valid. Key harus dimulai dengan "pk_"');
                    return;
                }

                // Check if Clerk instance is available
                if (clerk && isLoaded) {
                    setIsClerkReady(true);
                    setError(null);
                } else if (isLoaded && !clerk) {
                    setError('Clerk instance tidak tersedia. Pastikan ClerkProvider sudah di-wrap dengan benar di App.tsx');
                }
            } catch (err: any) {
                console.error('Error checking Clerk:', err);
                setError(`Error: ${err.message || 'Unknown error'}`);
            }
        };

        checkClerk();
    }, [clerk, isLoaded]);

    // Redirect if already signed in
    useEffect(() => {
        if (isSignedIn && isLoaded) {
            navigate(from, { replace: true });
        }
    }, [isSignedIn, isLoaded, navigate, from]);

    // Show loading state while Clerk is initializing
    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#050505] text-white p-4">
                <div className="w-full max-w-md text-center">
                    <div className="flex justify-center mb-4">
                        <Logo size={64} />
                    </div>
                    <h1 className="text-4xl font-display font-bold tracking-widest mb-2 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                        NEVRA
                    </h1>
                    <p className="text-gray-400 text-sm mb-8">Neural Automation Platform</p>
                    <div className="flex items-center justify-center gap-3 text-gray-400">
                        <Loader2 className="animate-spin" size={20} />
                        <span>Loading authentication...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#050505] text-white p-4">
            <div className="w-full max-w-md">
                {/* Branding */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <Logo size={64} />
                    </div>
                    <h1 className="text-4xl font-display font-bold tracking-widest mb-2 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                        NEVRA
                    </h1>
                    <p className="text-gray-400 text-sm">Neural Automation Platform</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
                            <div className="flex-1">
                                <h3 className="text-red-400 font-semibold mb-1">Clerk Configuration Error</h3>
                                <p className="text-red-300 text-sm">{error}</p>
                                <div className="mt-3 text-xs text-red-400/80">
                                    <p className="mb-1"><strong>Solusi:</strong></p>
                                    <ol className="list-decimal list-inside space-y-1 ml-2">
                                        <li>Pastikan file <code className="bg-black/30 px-1 rounded">.env.local</code> ada di root project</li>
                                        <li>Tambahkan: <code className="bg-black/30 px-1 rounded">VITE_CLERK_PUBLISHABLE_KEY=pk_test_...</code></li>
                                        <li>Restart development server setelah menambah environment variable</li>
                                        <li>Pastikan key dari Clerk Dashboard sudah benar</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Clerk Sign In Component */}
                {isClerkReady && !error ? (
                    <div className="flex justify-center">
                        <SignIn
                            appearance={{
                                elements: {
                                    rootBox: 'w-full',
                                    card: 'bg-[#0a0a0a] border border-white/10 shadow-2xl',
                                    headerTitle: 'text-white',
                                    headerSubtitle: 'text-gray-400',
                                    socialButtonsBlockButton: 'bg-white/5 border border-white/10 text-white hover:bg-white/10',
                                    formButtonPrimary: 'bg-purple-600 hover:bg-purple-500',
                                    footerActionLink: 'text-purple-400 hover:text-purple-300',
                                    formFieldInput: 'bg-[#151515] border-white/10 text-white',
                                    formFieldLabel: 'text-gray-300',
                                    identityPreviewText: 'text-white',
                                    identityPreviewEditButton: 'text-purple-400',
                                },
                            }}
                            redirectUrl={from}
                            signUpUrl="/sign-up"
                            routing="path"
                            path="/sign-in"
                        />
                    </div>
                ) : !error ? (
                    <div className="text-center py-8">
                        <Loader2 className="animate-spin mx-auto mb-4 text-purple-400" size={32} />
                        <p className="text-gray-400">Initializing Clerk...</p>
                    </div>
                ) : null}

                {/* Additional Info */}
                <div className="mt-8 text-center text-xs text-gray-500">
                    <p>By signing in, you agree to our Terms of Service</p>
                </div>
            </div>
        </div>
    );
};

export default SignInPage;
