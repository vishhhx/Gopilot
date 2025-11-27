import axios from "axios";
import { ENV } from "../config";
import { GitHubUser } from "../types";


export const getGitHubUser = async (code: string): Promise<GitHubUser> => {
  const tokenResponse = await axios.post(
    `https://github.com/login/oauth/access_token`,
    {
      client_id: ENV.GITHUB_CLIENT_ID!,
      client_secret: ENV.GITHUB_CLIENT_SECRET!,
      code,
    },
    { headers: { Accept: "application/json" } }
  );

  const accessToken = tokenResponse.data.access_token;
  if (!accessToken) throw new Error("Failed to get GitHub access token");

  const userResponse = await axios.get(`https://api.github.com/user`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return userResponse.data;
};
