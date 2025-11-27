import { NextFunction, Request, Response } from "express";
import { ValidationError, validationResult } from "express-validator";
import { ApiError } from "../utils";

const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map((err: ValidationError) => ({
      message: err.msg,
    }));
    return next(
      new ApiError(422, "Required fields are missing", extractedErrors)
    );
  }
  next();
};


export {validate}