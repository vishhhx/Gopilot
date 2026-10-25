import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { toast } from "sonner";
import { AuthServices } from "@/services";
import { API_BASE } from "@/utils";
import { errorMessage } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Blossom } from "@/components/bloom/Blossom";

/** Google first (GoPilot works in Google apps), GitHub as the other way in. */
function Oauth() {
  const [going, setGoing] = useState<"google" | "github" | null>(null);

  const google = async () => {
    try {
      setGoing("google");
      const response = await AuthServices.googleOauthInit();
      window.location.href = response.data;
    } catch (err) {
      setGoing(null);
      toast.error("Couldn't reach Google sign-in", { description: errorMessage(err, "Check your connection and try again.") });
    }
  };

  const github = () => {
    setGoing("github");
    window.location.href = `${API_BASE}auth/github/oauth-init`;
  };

  return (
    <div className="flex flex-col gap-2.5">
      <Button size="lg" onClick={google} disabled={going !== null} className="h-12 text-[15.5px]">
        <span className="flex size-6 items-center justify-center rounded-full bg-white">
          {going === "google" ? <Blossom size={16} motion="loading" /> : <FcGoogle className="size-4" />}
        </span>
        Continue with Google
      </Button>
      <Button size="lg" variant="outline" onClick={github} disabled={going !== null} className="h-12 text-[15.5px]">
        {going === "github" ? <Blossom size={18} motion="loading" /> : <FaGithub className="size-[18px]" />}
        Continue with GitHub
      </Button>
    </div>
  );
}

export default Oauth;
