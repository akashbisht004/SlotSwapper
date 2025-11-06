import { Router } from "express";
import eventRoutes from "./events.route";
import swapRoutes from "./swap.route";

const userRoutes = Router();

userRoutes.use("/events",eventRoutes);
userRoutes.use("/swap",swapRoutes);

export default userRoutes;