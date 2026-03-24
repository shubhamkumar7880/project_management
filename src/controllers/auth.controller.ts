import { and, eq, gt, or } from "drizzle-orm";
import { db } from "../db/index.ts";
import { users } from "../models/user.models.ts";
import asyncHandler from "../utils/async-handler.ts";
import {
  insertUserSchema,
  loginUserSchema,
} from "../validators/user.validators.ts";
import bcrypt from "bcrypt";
import ApiError from "../utils/api-error.ts";
import {
  generateAccessToken,
  generateRefreshToken,
  generateTemporaryToken,
} from "../repositories/user.repositories.ts";
import {
  emailVerificationMailgenContent,
  resetPasswordMailgenContent,
  sendEmail,
} from "../utils/mail.ts";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});
import ApiResponse from "../utils/api-respnse.ts";
import type { CustomRequest } from "../utils/types.ts";
import crypto from "crypto";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshToken = async (userInfo: {
  id: string;
  email: string;
  username: string;
}) => {
  const { id, email, username } = userInfo;
  const accessToken = await generateAccessToken(id, email, username);
  const refreshToken = await generateRefreshToken(id);
  return { accessToken, refreshToken };
};

const registerUser = asyncHandler(async (req, res) => {
  const parsed = insertUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }

  const { username, email, password, fullName } = parsed.data;

  // ✅ check if user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username)));

  if (existingUser?.length > 0) {
    const conflictField =
      existingUser?.[0]?.email === email ? "Email" : "Username";
    throw new ApiError(409, `${conflictField} already taken`);
  }

  // ✅ hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // ✅ insert new user
  const [newUser] = await db
    .insert(users)
    .values({
      username,
      email,
      fullName,
      password: hashedPassword,
    })
    .returning({
      id: users.id,
      username: users.username,
      email: users.email,
      fullName: users.fullName,
      createdAt: users.createdAt,
    });

  if (!newUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  // Handle profile picture upload
  let avatarUrl = "https://placehold.co/200x200";
  if (req.file) {
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: "avatars",
      resource_type: "image",
    });
    avatarUrl = uploadResult.secure_url;
    await db
      .update(users)
      .set({
        avatarUrl,
      })
      .where(eq(users.id, newUser.id));
  }

  const { unhashedToken, hashedToken, tokenEXpiry } = generateTemporaryToken();
  await db
    .update(users)
    .set({
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: new Date(tokenEXpiry),
    })
    .where(eq(users.id, newUser.id));

  await sendEmail({
    email: newUser.email,
    subject: "Verify your email",
    mailgenContent: emailVerificationMailgenContent(
      newUser.username,
      `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unhashedToken}`,
    ),
  });

  return res.status(201).json(
    new ApiResponse(
      200,
      {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          fullName: newUser.fullName,
          avatarUrl,
          createdAt: newUser.createdAt,
        },
      },
      "User registered successfully and email verification link has been sent",
    ),
  );
});

const loginUser = asyncHandler(async (req, res) => {
  const parsed = loginUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }

  const { username, email, password } = parsed.data;

  const user = await db
    .select()
    .from(users)
    .where(
      username
        ? eq(users.username, username)
        : eq(users.email, email as string),
    )
    .limit(1);

  if (user.length === 0) {
    throw new ApiError(401, "User does not exists");
  }

  const existingUser = user?.[0];

  if (!existingUser?.isEmailVerified) {
    throw new ApiError(
      401,
      "User email is not verified. Please verify your email.",
    );
  }

  if (existingUser) {
    const isMatch = await bcrypt.compare(password, existingUser?.password);
    if (!isMatch) {
      throw new ApiError(401, "Invalid credentials");
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken({
      id: existingUser.id,
      email: existingUser.email,
      username: existingUser.username,
    });

    await db
      .update(users)
      .set({ refreshToken })
      .where(eq(users.id, existingUser.id));

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("refreshToken", refreshToken, options)
      .cookie("accessToken", accessToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken,
            user: {
              id: existingUser.id,
              username: existingUser.username,
              email: existingUser.email,
              fullName: existingUser.fullName,
            },
          },
          "User logged in successfully",
        ),
      );
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  const userId = (req as unknown as CustomRequest).user?.id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }
  await db
    .update(users)
    .set({ refreshToken: null })
    .where(eq(users.id, userId));

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = (req as unknown as CustomRequest).user?.id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const user = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      fullName: users.fullName,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { user: user[0] }, "User fetched successfully"));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;
  if (!verificationToken) {
    throw new ApiError(400, "Invalid verification token");
  }
  let hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const user = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.emailVerificationToken, hashedToken),
        eq(users.isEmailVerified, false),
        gt(users.emailVerificationExpiry, new Date())
      ),
    )
    .limit(1);

  if (user.length === 0) {
    return res.redirect(
      `${process.env.FRONTEND_URL}/email-verified?success=false`
    );
  }

  const existingUser = user[0];
  if (!existingUser) {
    return res.redirect(
      `${process.env.FRONTEND_URL}/email-verified?success=false`
    );
  }
  await db
    .update(users)
    .set({
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    })
    .where(eq(users.id, existingUser.id));

  return res.redirect(
    `${process.env.FRONTEND_URL}/email-verified?success=true`
  );
});

const resendEmailVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, "Unauthorized request");
  }

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.isEmailVerified, false)))
    .limit(1);

  if (user.length === 0) {
    throw new ApiError(404, "User not found or already verified");
  }

  const existingUser = user[0];
  if (!existingUser) {
    throw new ApiError(404, "User not found or already verified");
  }

  const { unhashedToken, hashedToken, tokenEXpiry } = generateTemporaryToken();
  await db
    .update(users)
    .set({
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: new Date(tokenEXpiry),
    })
    .where(eq(users.id, existingUser.id));

  await sendEmail({
    email: existingUser.email,
    subject: "Verify your email",
    mailgenContent: emailVerificationMailgenContent(
      existingUser.username,
      `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unhashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Email verification link has been sent to your email",
      ),
    );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!refreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }
  let decoded;
  try {
    decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as string,
    ) as { id: string; };
  } catch (err) {
    throw new ApiError(401, "Refresh token expired or invalid");
  }
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, decoded.id))
    .limit(1);

  if (!user.length) {
    throw new ApiError(401, "User not found");
  }

  const existingUser = user[0];
  if (!existingUser) {
    throw new ApiError(401, "User not found");
  }
  if (existingUser.refreshToken !== refreshToken) {
    throw new ApiError(401, "Refresh token mismatch");
  }

  const { accessToken, refreshToken: newRefreshToken } =
    await generateAccessAndRefreshToken({
      id: existingUser.id,
      email: existingUser.email,
      username: existingUser.username,
    });

  await db
    .update(users)
    .set({ refreshToken: newRefreshToken })
    .where(eq(users.id, existingUser.id));

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("refreshToken", newRefreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken: newRefreshToken },
        "Access token refreshed successfully",
      ),
    );
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (user.length === 0) {
    throw new ApiError(404, "User with this email does not exists");
  }

  const existingUser = user?.[0];
  if (!existingUser) {
    throw new ApiError(404, "User with this email does not exists");
  }
  const { unhashedToken, hashedToken, tokenEXpiry } = generateTemporaryToken();
  await db
    .update(users)
    .set({
      forgotPasswordToken: hashedToken,
      forgotPasswordTokenExpiry: new Date(tokenEXpiry),
    })
    .where(eq(users.email, email));

  await sendEmail({
    email,
    subject: "Reset your password",
    mailgenContent: resetPasswordMailgenContent(
      existingUser?.username,
      `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unhashedToken}`,
    ),
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password reset link has been sent to your email",
      ),
    );
});

const resetForgotPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const { resetToken } = req.params;

  if (!resetToken) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters long");
  }

  let hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.forgotPasswordToken, hashedToken),
        gt(users.forgotPasswordTokenExpiry, new Date()),
      ),
    )
    .limit(1);

  if (user.length === 0) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  const existingUser = user[0];
  if (!existingUser) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await db
    .update(users)
    .set({
      password: hashedPassword,
      forgotPasswordToken: null,
      forgotPasswordTokenExpiry: null,
    })
    .where(eq(users.id, existingUser.id));

  res.status(200).json(new ApiResponse(200, {}, "Password reset successfully"));
});
const changePassword = asyncHandler(async (req, res) => {
  const userId = (req as unknown as CustomRequest).user?.id;
  const { currentPassword, newPassword } = req.body;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required");
  }

  if (currentPassword === newPassword) {
    throw new ApiError(400, "Current password and new password cannot be same");
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters long");
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    throw new ApiError(404, "User not found");
  }

  const existingUser = user[0];
  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await bcrypt.compare(
    currentPassword,
    existingUser.password,
  );
  if (!isPasswordValid) {
    throw new ApiError(400, "Current password is incorrect");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, existingUser.id));

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  verifyEmail,
  resendEmailVerification,
  refreshAccessToken,
  forgotPassword,
  resetForgotPassword,
  changePassword,
  getCurrentUser,
};
