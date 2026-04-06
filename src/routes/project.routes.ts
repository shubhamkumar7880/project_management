import express from "express";
import multer from "multer";
import {
  addProjectMembers,
  createProject,
} from "../controllers/project.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";
import { verifyWorkspaceAdmin } from "../middlewares/workspace.middleware.ts";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/workspaces/:workspaceId/projects",
  verifyJWT,
  verifyWorkspaceAdmin,
  upload.single("projectLogo"),
  createProject,
);
router.post("/projects/:projectId/members", verifyJWT, addProjectMembers);

export default router;
