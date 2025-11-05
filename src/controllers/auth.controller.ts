import { Request, Response } from "express";
import { encode } from "../middleware";
import { User } from "../models/user.model";

/**
 * @desc Handles user registration
 * @method POST
 * @route /auth/signup
 */
export const registerHandler = async (req: Request, res: Response) => {
  try {

    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const user = await User.create({ username, email, password });

    const token = encode(user);

    return res.status(201).json({ token });

  } catch (e) {
    console.error("Register error:", e);
    return res.status(400).json({ error: (e as Error).message });
  }
};

/**
 * @desc Handles user login
 * @method POST
 * @route /auth/login
 */
export const signinHandler = async (req: Request, res: Response) => {
  try {

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || user.password != password) {
      return res.status(404).json({ error: "Invalid credentials" });
    }

    const token = encode(user);

    res.status(200).json({ token });
    
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
};