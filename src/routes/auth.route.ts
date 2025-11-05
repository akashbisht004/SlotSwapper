import { Router } from "express";
import { registerHandler, signinHandler } from "../controllers/auth.controller";

const authRoutes = Router();

authRoutes.post("/register", registerHandler);
authRoutes.post("/signin", signinHandler);

export default authRoutes;