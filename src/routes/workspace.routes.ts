import express from "express";
import multer from "multer";
import { verifyJWT } from "../middlewares/auth.middleware.ts";
import { verifyWorkspaceAdmin } from "../middlewares/workspace.middleware.ts";
import {
    createWorkspace,
    deleteWorkspace,
    getUserWorkspaces,
    updateWorkspace,
} from "../controllers/workspace.controller.ts";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", verifyJWT, getUserWorkspaces);
router.post("/", verifyJWT, upload.single("workspaceAvatar"), createWorkspace);
router.patch(
    "/:workspaceId",
    verifyJWT,
    verifyWorkspaceAdmin,
    upload.single("workspaceAvatar"),
    updateWorkspace,
);
router.delete("/:workspaceId", verifyJWT, verifyWorkspaceAdmin, deleteWorkspace);

export default router;
