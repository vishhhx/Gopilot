import mongoose, { Connection } from "mongoose";
import { ENV } from "./env";

const connectDb = async () => {
  try {
    await mongoose.connect(ENV.MONGODB_URL!);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB", error);
    throw error;
  }
};
export { connectDb };
