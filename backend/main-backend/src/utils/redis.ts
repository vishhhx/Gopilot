import { getClient } from "../config";
import { RedisClientType } from "redis";
import { UserDetails } from "../types";
import { getUserById } from "../services/db";

export class RedisService {
  client: RedisClientType;
  constructor() {
    this.client = getClient();
  }
  async addUserSocket(userId: string, socketId: string) {
    try {
      await this.client.sAdd(`socket:${userId}`, socketId);
    } catch (error) {
      throw new Error(`Error adding socket for user ${userId}: ${error}`);
    }
  }
  async getUserSockets(userId: string): Promise<string[]> {
    try {
      return await this.client.sMembers(`socket:${userId}`);
    } catch (error) {
      throw new Error(`Error getting sockets for user ${userId}: ${error}`);
    }
  }
  async removeUserSocket(userId: string, socketId: string) {
    try {
      await this.client.sRem(`socket:${userId}`, socketId);
    } catch (error) {
      throw new Error(`Error removing socket for user ${userId}: ${error}`);
    }
  }
  async setRefreshToken(userId: string, refreshToken: string) {
    try {
      await this.client.del(`refreshToken:${userId}`);
      await this.client.set(`refreshToken:${userId}`, refreshToken);
    } catch (error) {
      throw new Error(`Error setting refresh token for user ${userId}: ${error}`);
    }
  }
  async getRefreshToken(userId: string): Promise<string | null> {
    try {
      return await this.client.get(`refreshToken:${userId}`);
    } catch (error) {
      throw new Error(`Error getting refresh token for user ${userId}: ${error}`);
    }
  }
  private defaultExpiration = 5000;

  async setUserDetails(userId: string, data: UserDetails, expirationSeconds = this.defaultExpiration) {
    try {
      await this.client.set(
        `userDetails:${userId}`,
        JSON.stringify(data),
        { expiration:{
          type:"EX",
          value:this.defaultExpiration
        }}
      );
    } catch (error) {
      throw new Error(`Error setting user details for ${userId}: ${error}`);
    }
  }

  async getUserDetails(userId: string): Promise<UserDetails | null> {
    try {
      const cached = await this.client.get(`userDetails:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }
      const userFromDb = await getUserById(userId);
      if (!userFromDb) return null;
      const userDetails: UserDetails = {
        _id: userFromDb._id.toString(),
        name: userFromDb.name,
        email: userFromDb.email,
        avatarUrl: userFromDb.avatarUrl,
      };

      await this.setUserDetails(userId, userDetails);
      return userDetails;
    } catch (error) {
      throw new Error(`Error getting user details for ${userId}: ${error}`);
    }
  }
}
