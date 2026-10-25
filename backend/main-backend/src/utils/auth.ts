import { verify, sign, JwtPayload as JwtPayloadLib } from "jsonwebtoken";
import { JwtPayload } from "../types";
import { ENV } from "../config/env";

export class AuthHelper {
  private readonly secret: string = ENV.JWT_SECRET || "changeme";

  verifyUser(token: string): JwtPayloadLib {
    try {
      return verify(token, this.secret) as JwtPayloadLib;
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  signUser(payload: JwtPayload, expiresIn: any = "7d"): string {
    try {
      return sign(payload, this.secret, { expiresIn: expiresIn });
    } catch (error) {
      throw new Error("Error signing token");
    }
  }
}
