import { FcGoogle } from "react-icons/fc";
import { Button } from "../ui/button";
import { FaGithub } from "react-icons/fa";
import { AuthServices } from "@/services";

function Oauth() {
  const handleGoogleOAuthInit = async () => {
    try {
      const response = await AuthServices.googleOauthInit();
      window.location.href = response.data;
      console.log(response);
    } catch (error) {
      console.log(error);
    }
  };
  const handleGithubOAuthInit = async () => {
    try {
      window.location.href =
        "http://localhost:5000/api/v1/auth/github/oauth-init";
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div>
      <div className="flex flex-col gap-2">
        <Button className="cursor-pointer" onClick={handleGoogleOAuthInit}>
          <FcGoogle /> <span>Continue with google</span>
        </Button>
        <Button className="cursor-pointer" onClick={handleGithubOAuthInit}>
          <FaGithub /> <span>Continue with Github</span>
        </Button>
      </div>
    </div>
  );
}

export default Oauth;
