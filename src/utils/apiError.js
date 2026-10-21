export class ApiError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
export const badRequest = (message, details) => new ApiError(400, "BAD_REQUEST", message, details);
export const unauthorized = (message = "Authentication required") => new ApiError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "Insufficient permissions") => new ApiError(403, "FORBIDDEN", message);
export const notFound = (message = "Record not found") => new ApiError(404, "NOT_FOUND", message);
export const conflict = (message, details) => new ApiError(409, "CONFLICT", message, details);
