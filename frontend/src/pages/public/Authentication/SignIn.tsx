import { Link } from "react-router-dom";
import Oauth from "@/components/auth/Oauth";
import { AuthIntro, AuthTerms } from "./AuthParts";

/** The sign-up page. Accounts are created through Google or GitHub, the same way people sign in. */
function SignIn() {
  return (
    <>
      <AuthIntro
        title="Create your account"
        text="GoPilot works inside your Google apps, so the quickest start is your Google account. You'll pick what each agent may touch afterwards."
      />
      <Oauth />
      <p className="mt-6 text-[15px] text-ink-soft animate-rise-sm [animation-delay:240ms]">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-clay-ink underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
      <AuthTerms />
    </>
  );
}

export default SignIn;
