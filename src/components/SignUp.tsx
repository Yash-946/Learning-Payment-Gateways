import {
  SignedOut,
  SignInButton,
} from "@clerk/nextjs";
import { BackgroundRippleEffect } from "./ui/background-ripple-effect";

export default function SignUp() {
  return (
    <div className="h-screen w-full flex justify-center items-center ">
      <BackgroundRippleEffect />
      <div className="relative z-10">
    
      <SignedOut>
        <SignInButton>
          <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
            Sign In
          </button>
        </SignInButton>
      </SignedOut>
      </div>
    </div>
  );
}
