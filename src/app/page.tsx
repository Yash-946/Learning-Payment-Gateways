"use client";

import Home from "@/components/Home";
import SignUp from "@/components/SignUp";
import { useSignIn, useUser } from "@clerk/nextjs";

export default function GoogleSignInButton() {
  const { signIn } = useSignIn();
  const { isSignedIn, user, isLoaded } = useUser();
  if (!isLoaded) {
    return <div>Loading</div>;
  }

  console.log("User:", user);

  return <div>{isSignedIn ? <Home /> : <SignUp />}</div>;
}
