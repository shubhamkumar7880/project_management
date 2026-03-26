import { Router } from "express";
import { editUser } from "../controllers/user.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";
import multer from "multer";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

// Secured routes
router.route("/edit").put(verifyJWT, upload.single("profilePicture"), editUser);

export default router;