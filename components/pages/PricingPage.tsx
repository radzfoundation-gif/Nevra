import React, { useState, useEffect } from 'react';
import Navbar from '../Navbar';
import Footer from '../Footer';
import Background from '../ui/Background';
import { Check } from 'lucide-react';
import { detectCurrency, getPremiumPricing, formatCurrency } from '@/lib/currency';
import { useUser } from '@clerk/clerk-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PricingPage: React.FC = () => {
  const { user, isSignedIn } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'IDR'>('USD');
  const [loadingCurrency, setLoadingCurrency] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Check for success/cancel from Stripe
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success === 'true') {
      setError(null);
      // Refresh subscription status
      if (user?.id) {
        checkSubscriptionStatus();
      }
      // Remove query params
      navigate('/pricing', { replace: true });
    } else if (canceled === 'true') {
      setError('Payment was canceled. You can try again anytime.');
      navigate('/pricing', { replace: true });
    }
  }, [searchParams, user, navigate]);

  // Check subscription status
  const checkSubscriptionStatus = async () => {
    if (!user?.id) return;
    
    try {
      const resp = await fetch(`/api/payment/subscription?userId=${user.id}`);
      if (resp.ok) {
        const data = await resp.json();
        setIsSubscribed(data.isActive);
      }
    } catch (e) {
      console.error('Error checking subscription:', e);
    }
  };

  useEffect(() => {
    if (user?.id) {
      checkSubscriptionStatus();
    }
  }, [user?.id]);

  useEffect(() => {
    // Detect currency on mount
    detectCurrency().then((info) => {
      setCurrency(info.currency);
      setLoadingCurrency(false);
    }).catch(() => {
      setCurrency('USD');
      setLoadingCurrency(false);
    });
  }, []);

  const premiumPricing = getPremiumPricing(currency);

  const handleCheckout = async (plan: 'free' | 'premium') => {
    if (plan === 'free') {
      // Free plan - no payment needed
      return;
    }

    // Check if user is signed in
    if (!isSignedIn || !user) {
      setError('Please sign in to subscribe to Premium');
      navigate('/sign-in', { state: { from: '/pricing' } });
      return;
    }

    setError(null);
    setLoadingPlan(plan);
    try {
      const resp = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan: 'premium',
          currency,
          amount: premiumPricing.amount,
          userId: user.id,
        }),
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: 'Failed to create checkout session' }));
        throw new Error(errorData.error || 'Failed to create checkout session');
      }
      const data = await resp.json();
      if (data?.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkout_url;
      } else {
        throw new Error('Invalid checkout response');
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Unable to start checkout. Please try again.';
      setError(errorMessage);
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!isSignedIn || !user) {
      setError('Please sign in to manage your subscription');
      return;
    }

    setError(null);
    setLoadingPlan('manage');
    try {
      const resp = await fetch('/api/payment/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: 'Failed to create portal session' }));
        throw new Error(errorData.error || 'Failed to create portal session');
      }
      const data = await resp.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Invalid portal response');
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Unable to open subscription portal. Please try again.';
      setError(errorMessage);
      setLoadingPlan(null);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden text-aura-primary bg-[#020202] page-transition">
      <Background />
      <Navbar />
      <main className="flex-grow pt-24 relative z-10">
        <section className="relative py-20 px-6">
          <div className="max-w-7xl mx-auto text-center mb-16">
            <h1 className="font-display font-bold text-5xl md:text-6xl mb-6 text-white tracking-tight">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Start free, scale as you grow. No hidden fees.
            </p>
            {loadingCurrency ? (
              <p className="text-sm text-gray-500 mt-2">Detecting your location...</p>
            ) : (
              <p className="text-sm text-gray-500 mt-2">
                Prices shown in {currency === 'IDR' ? 'Indonesian Rupiah' : 'US Dollars'}
              </p>
            )}
          </div>

          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <div className="p-8 rounded-2xl bg-[#0A0A0A] border border-white/10 flex flex-col">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white">Free</h3>
                <div className="text-3xl font-bold text-white mt-2">
                  {formatCurrency(0, currency)} <span className="text-sm font-normal text-gray-500">/mo</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  '200 AI Tokens/month',
                  'Basic AI Models (Groq, Deepseek)',
                  'Community Support',
                  '7-day Chat History',
                  'Builder & Tutor Mode',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-400 text-sm">
                    <Check className="w-4 h-4 text-white" /> {item}
                  </li>
                ))}
              </ul>
              <button 
                className="w-full py-3 rounded-lg border border-white/20 text-white hover:bg-white hover:text-black transition-colors font-medium"
                onClick={() => handleCheckout('free')}
                disabled={loadingPlan === 'free'}>
                {loadingPlan === 'free' ? 'Processing...' : 'Start Free'}
              </button>
            </div>

            {/* Premium Plan */}
            <div className="p-8 rounded-2xl bg-[#111] border border-purple-500/50 relative flex flex-col shadow-2xl shadow-purple-900/20">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                Most Popular
              </div>
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white">Premium</h3>
                <div className="text-3xl font-bold text-white mt-2">
                  {premiumPricing.formatted} <span className="text-sm font-normal text-gray-500">/mo</span>
                </div>
                {currency === 'IDR' && (
                  <p className="text-xs text-gray-500 mt-1">≈ $3 USD</p>
                )}
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'Unlimited AI Tokens',
                  'All AI Models (GPT-4o, Gemini, Kimi K2)',
                  'Priority Support',
                  'Unlimited Chat History',
                  'Advanced Code Generation',
                  'Export Projects',
                  'Agentic Planning',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                    <Check className="w-4 h-4 text-purple-400" /> {item}
                  </li>
                ))}
              </ul>
              {isSubscribed ? (
                <button
                  className="w-full py-3 rounded-lg bg-green-600 text-white hover:bg-green-500 transition-colors font-medium shadow-lg shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleManageSubscription}
                  disabled={loadingPlan === 'manage' || loadingCurrency}>
                  {loadingPlan === 'manage' ? 'Loading...' : 'Manage Subscription'}
                </button>
              ) : (
                <button
                  className="w-full py-3 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors font-medium shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleCheckout('premium')}
                  disabled={loadingPlan === 'premium' || loadingCurrency}>
                  {loadingPlan === 'premium' ? 'Processing...' : 'Get Premium'}
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className="max-w-3xl mx-auto mt-6 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
              {error}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PricingPage;
