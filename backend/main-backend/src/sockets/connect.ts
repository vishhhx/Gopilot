import * as http from "http";
import { Server, Socket } from "socket.io";
import {
  AuthHelper,
  corsConfig,
  getCookieValueSocket,
  RedisService,
} from "../utils";
import { NextFunction } from "express";

let io: Server;

const SocketIo = async (httpServer: http.Server) => {
  io = new Server(httpServer, {
    cookie: true,
    cors: corsConfig,
  });

  io.use(async (socket: Socket, next: (err?: Error) => void) => {
    const cookies = socket.handshake.headers.cookie;
    if (cookies) {
      const token = getCookieValueSocket(cookies, "authToken");
      if (!token) {
        console.error("Authentication error: Token missing");
        return next(new Error("Authentication error: Token missing"));
      }
      try {
        const authHelper = new AuthHelper();
        const user = authHelper.verifyUser(token);
        socket.data.user = user;
      } catch (error: any) {
        console.error("Authentication error: Invalid token", error.message);
        return next(new Error("Authentication error: Invalid token"));
      }
    } else {
      socket.data.user = null;
    }
    next();
  });

  const redisservice = new RedisService();

  io.on("connection", async (socket: Socket) => {
    const user = socket.data.user;
    if (user) {
      console.log(`connected: ${user.userId}`);
      await redisservice.setUser(user.userId, socket.id);
    } else {
      console.log("container connected", socket.id);
    }

    socket.on("disconnect", async (reason) => {
      if (user) {
        console.log(`disconnected: ${user.userId} - ${reason}`);
        await redisservice.removeUser(user.userId, socket.id);
      } else {
        console.log(`container disconnected: ${socket.id} - ${reason}`);
      }
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error("Socket.io is not initialized. Call SocketIo() first.");
  }
  return io;
};

export { SocketIo, getIo };
