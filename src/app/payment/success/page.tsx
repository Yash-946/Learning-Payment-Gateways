"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function PaymentSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [redirectCancelled, setRedirectCancelled] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    
    if (sessionId) {
      verifyStripePayment(sessionId);
    } else {
      setIsVerifying(false);
    }
  }, [searchParams]);

  const verifyStripePayment = async (sessionId: string) => {
    try {
      const response = await fetch("/api/payment/stripe/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
        setVerificationSuccess(true);
      } else {
        console.error("Stripe payment verification failed");
      }
    } catch (error) {
      console.error("Error verifying Stripe payment:", error);
    } finally {
      setIsVerifying(false);
    }
  };


  // Countdown and redirect effect
  useEffect(() => {
    if (verificationSuccess && countdown > 0 && !redirectCancelled) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (verificationSuccess && countdown === 0 && !redirectCancelled) {
      router.push("/");
    }
  }, [verificationSuccess, countdown, redirectCancelled, router]);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Verifying your payment...
          </h2>
          <p className="text-gray-600">Please wait while we confirm your purchase.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          {verificationSuccess ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-4">
                Payment Successful!
              </h1>
              <p className="text-gray-600 mb-4">
                Your payment has been processed successfully. You now have access to our premium gallery.
              </p>
              {!redirectCancelled && (
                <p className="text-sm text-gray-500 mb-6">
                  Redirecting to home page in {countdown} second{countdown !== 1 ? 's' : ''}...
                </p>
              )}
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-4">
                Verification Failed
              </h1>
              <p className="text-gray-600 mb-6">
                There was an issue verifying your payment. Please contact support if you believe this is an error.
              </p>
            </>
          )}
          
          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              {verificationSuccess ? "Access Premium Gallery" : "Return to Home"}
            </Link>
            {verificationSuccess && !redirectCancelled && (
              <button
                onClick={() => setRedirectCancelled(true)}
                className="block w-full bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors text-sm"
              >
                Cancel Auto-redirect
              </button>
            )}
            {!verificationSuccess && (
              <button
                onClick={() => router.back()}
                className="block w-full bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
