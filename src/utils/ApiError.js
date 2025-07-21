class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    error = [], // we could have many error , so array holds them
    stack = "",                //  to manually pass the error stack trace for debugging
  ) {
    super(message); // to call the constructor from the parent error class   // Without this, the error wouldn't behave like a proper JS error.
    this.data = null;
    this.statusCode = statusCode;
    this.message = message;
    this.success = false;
    this.error = error;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };

// I really dont get it properly /// THis is just copy and paste and nothing

// Always free to go and search and study about nodejs errors from some online sources
