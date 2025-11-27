
import { ApiError, AuthHelper } from "../utils";
import { NextFunction, Request, Response } from "express";
const authHelper=new AuthHelper()

export const isAuthenticated = (req:Request, res:Response, next:NextFunction) => {
  try {
    const authToken = req.cookies?.accessToken;
    if (!authToken) {
      throw new ApiError(401, "Not authenticated. Token missing.");
    }
   const decoded= authHelper.verifyUser(authToken)
    if (!decoded) {
      throw new ApiError(401, "Not authenticated. Invalid token.");
    }
    req.user = decoded;
    next();
    
  } catch (error) {
    throw new ApiError(401, "Authentication failed.");
  }
};


