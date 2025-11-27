import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/rest";

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
      data: null,
    });
  }
  console.error("Unhandled error:", err);
  return res.status(500).json({
    success: false,
    message: err instanceof Error ? err.message : "Internal Server Error",
    errors: [],
    data: null,
  });
};
