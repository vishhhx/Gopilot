import { JwtPayload } from "./auth";

declare global {
  namespace Express {
    interface Request {
      user?: string | JwtPayloadad; // adjust type as per your verifyUser() return
    }
  }
}
