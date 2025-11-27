import { createClient, RedisClientType } from "redis";

let client: RedisClientType;

const ConnectToRedis = async () => {
  client = createClient({
    socket: {
      host: "127.0.0.1",
      port: 6379,
    },
  });

  try {
    await client.connect();
    console.log("connected to the redis");
  } catch (error) {
    console.error("error in connecting to redis", error);
  }
};

const getClient = () => {
  if (!client) {
    throw new Error(
      "Redis client not initialized. Call ConnectToRedis() first."
    );
  }
  return client;
};

export { ConnectToRedis, getClient };
