import crypto from "crypto";
import { ENV } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

export interface EncryptedText {
  encrypted: string;
  iv: string;
  tag: string;
}

export const encryptText = (content: string): EncryptedText => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENV.ENCRYPTION_KEY!, "hex"),
    iv
  );

  let encrypted = cipher.update(content, "utf8", "hex");
  encrypted += cipher.final("hex");

  return {
    encrypted,
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
};

export const decryptText = (encrypted: string, iv: string, tag: string): string => {
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENV.ENCRYPTION_KEY!, "hex"),
      Buffer.from(iv, "hex")
    );
    decipher.setAuthTag(Buffer.from(tag, "hex"));

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("[Decryption Error]:", error);
    throw new Error("Failed to decrypt message");
  }
};
