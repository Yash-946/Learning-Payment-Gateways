"use client";
import { SignedIn, UserButton, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Image from "next/image";

interface PremiumImage {
  _id: string;
  title: string;
  url: string;
}

// Skeleton Component
const ImageSkeleton = () => (
  <div className="border border-gray-200 p-4 rounded-lg shadow-sm animate-pulse">
    <div className="h-6 bg-gray-300 rounded mb-3 w-3/4"></div>
    <div className="bg-gray-300 rounded-lg w-full h-48"></div>
  </div>
);

export default function Home() {
  const { user } = useUser();
  const [images, setImages] = useState<PremiumImage[]>([]);
  const [isPurchased, setIsPurchased] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(true);

  // Check if user has purchased access from backend API
  useEffect(() => {
    const checkPurchaseStatus = async () => {
      try {
        setCheckingPurchase(true);
        const response = await fetch("/api/purchase/check");
        const data = await response.json();

        if (response.ok) {
          setIsPurchased(data.hasPurchased);
        } else {
          console.error("Error checking purchase status:", data.error);
        }
      } catch (error) {
        console.error("Error checking purchase status:", error);
      } finally {
        setCheckingPurchase(false);
      }
    };

    checkPurchaseStatus();
  }, []);

  // Fetch images only if user has purchased access
  useEffect(() => {
    if (isPurchased) {
      const fetchImages = async () => {
        try {
          setIsLoading(true);
          const res = await fetch("/api/images");
          const data = await res.json();
          setImages(data);
        } catch (error) {
          console.error("Error fetching images:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchImages();
    }
  }, [isPurchased]);

  // Handle Razorpay payment
  const handlePurchase = async () => {
    try {
      setIsLoading(true);
      
      const userEmail = user?.primaryEmailAddress?.emailAddress || "";
      const userName = user?.fullName || "User";

      // Create order (amount is now determined by backend)
      const orderRes = await fetch("/api/payment/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!orderRes.ok) {
        const errorData = await orderRes.json();
        throw new Error(errorData.error || "Failed to create order");
      }

      const orderData = await orderRes.json();

      // Initialize Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Premium Gallery",
        description: "Access to Premium Images",
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            // Record the successful payment
            const purchaseRes = await fetch("/api/purchase", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            if (purchaseRes.ok) {
              setIsPurchased(true);
              alert(
                "Payment successful! You now have access to premium images."
              );
            } else {
              throw new Error("Failed to record purchase");
            }
          } catch (error) {
            console.error("Error recording purchase:", error);
            alert(
              "Payment completed but there was an issue recording it. Please contact support."
            );
          }
        },
        prefill: {
          name: userName,
          email: userEmail,
          contact: "", // Razorpay will show a phone number field to user
        },
        theme: {
          color: "#3B82F6",
        },
      };
      console.log("Razorpay prefill data:", options.prefill);


      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment error:", error);
      alert(
        `Payment failed: ${
          error instanceof Error ? error.message : "Please try again."
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Generate skeleton cards
  const skeletonCards = Array.from({ length: 2 }, (_, index) => (
    <ImageSkeleton key={index} />
  ));

  // Show loading state while checking purchase status
  if (checkingPurchase) {
    return (
      <div className="min-h-screen w-full">
        <header className="flex justify-between items-center p-4 bg-white shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800">Premium Gallery</h1>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </header>
        <main className="p-4">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">
              Checking access status...
            </span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      {/* Header with User Authentication and Purchase Button */}
      <header className="flex justify-between items-center p-4 bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Premium Gallery</h1>
        <div className="flex items-center space-x-4">
          {!isPurchased && (
            <button
              onClick={handlePurchase}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"
                    />
                  </svg>
                  <span>Purchase Access - ₹10</span>
                </>
              )}
            </button>
          )}
          {isPurchased && (
            <div className="flex items-center space-x-2 text-green-600">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium">Premium Access</span>
            </div>
          )}
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        <SignedIn>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-300">
              {isPurchased ? "Your Premium Gallery" : "Premium Gallery Preview"}
            </h2>
            <p className="text-gray-300">
              {isPurchased
                ? "Enjoy your collection of premium images"
                : "Purchase access to unlock high-quality premium images"}
            </p>
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isPurchased ? (
              // Show actual images if purchased
              isLoading ? (
                skeletonCards
              ) : images.length > 0 ? (
                images.map((img) => (
                  <div
                    key={img._id}
                    className="border border-gray-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    <h3 className="text-lg font-medium mb-3 text-gray-00">
                      {img.title}
                    </h3>
                    <Image
                      src={img.url}
                      alt={img.title}
                      width={400}
                      height={400}
                      className="rounded-lg w-full h-48 object-cover"
                    />
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg
                      className="mx-auto h-12 w-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No images found
                  </h3>
                  <p className="text-gray-500">
                    Images will appear here once they are uploaded to the
                    gallery.
                  </p>
                </div>
              )
            ) : (
              // Show skeleton cards if not purchased
              skeletonCards
            )}
          </div>

          {/* Purchase Prompt for Non-Purchased Users */}
          {!isPurchased && (
            <div className="mt-12 text-center bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-xl border border-blue-200">
              <div className="text-blue-600 mb-4">
                <svg
                  className="mx-auto h-16 w-16"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Unlock Premium Content
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Get instant access to our exclusive collection of high-quality
                premium images. Perfect for your projects and creative needs.
              </p>
              <button
                onClick={handlePurchase}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors inline-flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <span>Purchase Now - ₹10</span>
                  </>
                )}
              </button>
            </div>
          )}
        </SignedIn>
      </main>
    </div>
  );
}
