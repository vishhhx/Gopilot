import { Button } from "@/components/ui/button";
import Logo from "../../../components/nav/Logo";
import { Input } from "../../../components/ui/input";
import { useNavigate } from "react-router-dom";
import Oauth from "@/components/auth/Oauth";
function SignIn() {
  const navigate = useNavigate();
  return (
    <div className=" h-full w-full flex justify-center items-center">
      <div className="b w-5/12 h-[45rem] flex flex-col gap-2  mt-20 ">
        <div className="">
          <Logo />

          <p className="text-2xl font-bold dark:text-neutral-100 text-neutral-900 mt-1">
            Sign in to your account
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <div>
              <p className=" dark:text-neutral-100 text-neutral-900 mb-3 ml-1 text-sm">
                {" "}
                Full name
              </p>
              <Input type="text" placeholder="tylordurdun" />
            </div>
            <div>
              <p className=" dark:text-neutral-100 text-neutral-900 mb-3 ml-1 text-sm">
                {" "}
                Email address
              </p>
              <Input type="email" placeholder="tylordurdun@f****c****.com" />
            </div>
            <div>
              <p className=" dark:text-neutral-100 text-neutral-900 mb-3 ml-1 text-sm">
                Password
              </p>
              <Input type="password" placeholder="......." />
            </div>

            <div className="flex flex-col justify-center items-center gap-2 mt-6">
              <Button className="w-full  cursor-pointer bg-black rounded-xl dark:bg-neutral-600/40 dark:hover:bg-neutral-600/10 text-neutral-100 shadow-[inset_0_0_30px_rgba(0,255,255,0.)] border-[0.5px]  border-neutral-500 transition duration-300 ">
                Sign Up
              </Button>
              <p className="dark:text-neutral-300 text-neutral-900 mt-2  text-sm">
                Already have an account?{" "}
                <span
                  className="font-bold cursor-pointer"
                  onClick={() => navigate("/login")}
                >
                  {" "}
                  Login
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="relative flex py-5 items-center text-sm ">
          <div className="flex-grow border-t border-gray-500"></div>
          <span className="flex-shrink mx-4 text-gray-500">
            Or continue with
          </span>
          <div className="flex-grow border-t border-gray-500"></div>
        </div>

        <div className="flex flex-col justify-center gap-6 ">
          <Oauth />
          <p className="dark:text-neutral-400 text-neutral-800 mb-4 ml-1 text-sm text-center tracking-normal">
            By clicking on sign in, you agree to our Terms of Service and
            Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
