import { AuthModel } from "../../models";
import { OAuth, Provider, UserDetails } from "../../types";

export const createAccountViaOauth = async (
  provider: Provider,
  userDetails: OAuth
) => {
  return AuthModel.create({
    ...userDetails,
    provider,
  });
};



 export const getUserViaEmail = async (email: string) => {

        return AuthModel.findOne({
            email:email
        })

};


export const getUserById = async (userId: string): Promise<UserDetails | null> => {
  return AuthModel.findById(userId).select("name email avatarUrl _id");
};