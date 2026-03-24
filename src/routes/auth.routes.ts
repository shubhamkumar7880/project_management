import { Router } from "express";
import multer from "multer";
import {
  changePassword,
  forgotPassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  resendEmailVerification,
  resetForgotPassword,
  verifyEmail,
} from "../controllers/auth.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.route("/register").post(upload.single("profilePicture"), registerUser);
router.route("/login").post(loginUser);
router.route("/verify-email/:verificationToken").get(verifyEmail);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-forgot-password/:resetToken").post(resetForgotPassword);
router.route("/resend-verification-email").post(resendEmailVerification);

//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/current-user").post(verifyJWT, getCurrentUser);
router.route("/change-password").post(verifyJWT, changePassword);
router.route("/logout").post(verifyJWT, logoutUser);

export default router;
