import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { IUser } from "./models/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

dotenv.config();
const secret = process.env.SECRET_KEY || "SECRET";

export const encode = (user: IUser) => {
  return jwt.sign(
    { id: user._id, email: user.email }, 
    secret,
    { expiresIn: "1h" } 
  );
};

export const decode = (token: string) => {
  return jwt.verify(token, secret);
};

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
    const decoded = decode(token) as IUser;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};