class ApiError extends Error {
  public readonly statusCode: number;

  public readonly errors: unknown[];

  public readonly success: boolean;

  constructor(statusCode: number, message: string = "Something went wrong", errors: unknown[] = []) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;
    this.success = false;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;
