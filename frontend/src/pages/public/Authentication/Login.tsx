import { Link } from "react-router-dom";
import Oauth from "@/components/auth/Oauth";
import { AuthIntro, AuthTerms } from "./AuthParts";

function Login() {
  return (
    <>
      <AuthIntro title="Welcome back" text="Sign in with the account whose Google apps you want GoPilot to work in." />
      <Oauth />
      <p className="mt-6 text-[15px] text-ink-soft animate-rise-sm [animation-delay:240ms]">
        New to GoPilot?{" "}
        <Link to="/register" className="font-medium text-clay-ink underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
      <AuthTerms />
    </>
  );
}

export default Login;
