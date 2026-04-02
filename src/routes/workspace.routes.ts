import express from "express";
import multer from "multer";
import { verifyJWT } from "../middlewares/auth.middleware.ts";
import { verifyWorkspaceAdmin } from "../middlewares/workspace.middleware.ts";
import {
    createWorkspace,
    deleteWorkspace,
    getCurrentUserPendingInvitations,
    getUserWorkspaces,
    inviteWorkspaceMembers,
    respondToWorkspaceInvitation,
    updateWorkspace,
} from "../controllers/workspace.controller.ts";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", verifyJWT, getUserWorkspaces);
router.get("/invitations/pending", verifyJWT, getCurrentUserPendingInvitations);
router.patch("/invitations/:invitationId/respond", verifyJWT, respondToWorkspaceInvitation);
router.post("/", verifyJWT, upload.single("workspaceAvatar"), createWorkspace);
router.patch(
    "/:workspaceId",
    verifyJWT,
    verifyWorkspaceAdmin,
    upload.single("workspaceAvatar"),
    updateWorkspace,
);
router.post(
    "/:workspaceId/invitations",
    verifyJWT,
    verifyWorkspaceAdmin,
    inviteWorkspaceMembers,
);
router.delete("/:workspaceId", verifyJWT, verifyWorkspaceAdmin, deleteWorkspace);

export default router;
