import express from "express";
import multer from "multer";
import {
  addProjectLabels,
  addProjectMembers,
  createProject,
  getUserProjects,
} from "../controllers/project.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";
import { verifyProjectAdmin } from "../middlewares/project.middleware.ts";
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
router.get("/workspaces/:workspaceId/projects", verifyJWT, getUserProjects);
router.post(
  "/projects/:projectId/members",
  verifyJWT,
  verifyProjectAdmin,
  addProjectMembers,
);
router.post(
  "/projects/:projectId/labels",
  verifyJWT,
  verifyProjectAdmin,
  addProjectLabels,
);

export default router;
