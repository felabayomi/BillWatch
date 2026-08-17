import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <SignIn
        routing="path"
        path="/sign-in"
        redirectUrl="/app"
        afterSignInUrl="/app"
      />
    </div>
  );
}
