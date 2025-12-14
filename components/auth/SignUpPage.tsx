import React, { useEffect } from 'react';
import { SignUp, useAuth } from '@clerk/clerk-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../Logo';

const SignUpPage: React.FC = () => {
    const { isSignedIn, isLoaded } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Get the intended destination from location state
    const from = (location.state as any)?.from || '/';

    // Redirect if already signed in
    useEffect(() => {
        if (isSignedIn && isLoaded) {
            navigate(from, { replace: true });
        }
    }, [isSignedIn, isLoaded, navigate, from]);

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

                {/* Clerk Sign Up Component */}
                <div className="flex justify-center">
                    <SignUp
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
                        signInUrl="/sign-in"
                        routing="path"
                        path="/sign-up"
                    />
                </div>

                {/* Additional Info */}
                <div className="mt-8 text-center text-xs text-gray-500">
                    <p>By signing up, you agree to our Terms of Service</p>
                </div>
            </div>
        </div>
    );
};

export default SignUpPage;
