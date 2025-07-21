import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statuscode =
      error.statuscode || error instanceof mongoose.Error ? 400 : 500;

    const message = error.message || "Something went wrong";

    error = new ApiResponse(
      statuscode,
      message,
      error?.errors || [],
      err.stack
    );
  }

  const response = {
    ...error,
    message: error.message,
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {}),
  };

  return res.status(error.statusCode).json(response);
};

export { errorHandler };

//// its all just copy paste (i have to look into this in future ) // (its pretty hard)
