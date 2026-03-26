import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { users } from "../models/user.models.ts";
import asyncHandler from "../utils/async-handler.ts";
import { updateUserSchema } from "../validators/user.validators.ts";
import ApiError from "../utils/api-error.ts";
import ApiResponse from "../utils/api-respnse.ts";
import type { CustomRequest } from "../utils/types.ts";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
    api_key: process.env.CLOUDINARY_API_KEY as string,
    api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

const editUser = asyncHandler(async (req, res) => {
    const userId = (req as unknown as CustomRequest).user?.id;
    if (!userId) {
        throw new ApiError(401, "Unauthorized request");
    }

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }

    const { fullName } = parsed.data;

    // Prepare update data
    const updateData: { fullName?: string; avatarUrl?: string } = {};
    if (fullName !== undefined) {
        updateData.fullName = fullName;
    }

    // Handle profile picture upload if file is provided
    if (req.file) {
        try {
            const buffer = req.file.buffer;
            if (!buffer) {
                throw new ApiError(
                    400,
                    "Invalid profile picture upload: file buffer is missing",
                );
            }

            const dataUri = `data:${req.file.mimetype};base64,${buffer.toString("base64")}`;
            const uploadResult = await cloudinary.uploader.upload(dataUri, {
                folder: "avatars",
                resource_type: "image",
            });
            updateData.avatarUrl = uploadResult.secure_url;
        } catch (error: unknown) {
            if (error instanceof ApiError) {
                throw new ApiError(
                    400,
                    error.message || "Failed to upload profile picture. Please try again.",
                );
            }
        }
    }

    // Update user in database
    const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning({
            id: users.id,
            username: users.username,
            email: users.email,
            fullName: users.fullName,
            avatarUrl: users.avatarUrl,
            createdAt: users.createdAt,
        });

    if (!updatedUser) {
        throw new ApiError(500, "Something went wrong while updating user");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            { user: updatedUser },
            "User updated successfully",
        ),
    );
});

export { editUser };