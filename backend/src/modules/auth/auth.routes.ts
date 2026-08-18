import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "./auth.controller";
import { requireAuth } from "../../middleware/auth";

export const authRouter = Router();

// Auth endpoints are prime brute-force / OTP-spam targets, so they get a
// tighter limit than the rest of the API.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.use(authLimiter);

authRouter.post("/register", authController.register);
authRouter.post("/login", authController.login);
authRouter.post("/otp/request", authController.requestOtp);
authRouter.post("/otp/verify", authController.verifyOtp);
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", requireAuth, authController.me);
