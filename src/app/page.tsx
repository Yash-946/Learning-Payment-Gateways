"use client";

import Home from "@/components/Home";
import SignUp from "@/components/SignUp";
import { useUser } from "@clerk/nextjs";

export default function GoogleSignInButton() {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) {
    return <div>Loading</div>;
  }

  // console.log("User:", user);

  return <div>{isSignedIn ? <Home /> : <SignUp />}</div>;
}
