import { randomUUID } from "node:crypto";

const requestIdMiddleware = (req, res, next) => {
  req.requestId = randomUUID();

  res.setHeader("X-Request-ID", req.requestId);

  next();
};

export default requestIdMiddleware;
