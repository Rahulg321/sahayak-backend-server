import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  console.log("inside authenticate token");

  console.log("req.headers", req.headers);

  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    res.status(401).json({ message: "Not Authenticated" });
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Authorization token is missing" });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.AUTH_SECRET as string);
    (req as any).user = decoded;

    next();
  } catch (error) {
    console.log("An error occurred trying to authenticate token", error);
    if (error instanceof jwt.JsonWebTokenError) {
      console.log("An error occurred trying to authenticate token", error);
      res.status(401).json({ message: error.message });
      return;
    }
    res.status(500).json({
      message: error instanceof Error ? error.message : "Internal server error",
    });
    return;
  }
};

export default authenticateToken;
