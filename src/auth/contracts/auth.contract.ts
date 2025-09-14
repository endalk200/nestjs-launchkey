import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { extendZodWithOpenApi } from "@anatine/zod-openapi";

extendZodWithOpenApi(z);
const c = initContract();

export const authContract = c.router(
  {
    login: {
      method: "POST",
      path: "/login",
      responses: {
        200: z.object({
          auth: z.object({
            accessToken: z.string(),
            accessTokenExpiresIn: z.number(),
            refreshToken: z.string(),
            refreshTokenExpiresIn: z.number(),
            deviceId: z.string(),
            deviceName: z.string(),
          }),
          user: z.object({
            id: z.string(),
            firstName: z.string(),
            lastName: z.string(),
            email: z.string(),
            isEmailVerified: z.boolean(),
            isActive: z.boolean(),
          }),
        }),
        400: z.object({
          message: z.string(),
        }),
        401: z.object({
          message: z.string(),
        }),
        423: z.object({
          message: z.string(),
        }),
        500: z.object({
          message: z.string(),
        }),
      },
      body: z.object({
        email: z.string().email("Invalid email address"),
        password: z
          .string()
          .min(8)
          .regex(
            /(?=.*[A-Z])/,
            "Password must contain at least one uppercase letter",
          )
          .regex(/(?=.*\d)/, "Password must contain at least one number")
          .regex(
            /(?=.*[!@#$%^&*(),.?":{}|<>])/,
            "Password must contain at least one special character",
          )
          .min(8, "Password must be at least 8 characters long"),
      }),
      summary: "Login",
    },
    refreshToken: {
      method: "POST",
      path: "/refresh-token/",
      headers: z.object({
        authorization: z.string(),
        "x-device-id": z.string(),
        "x-refresh-token": z.string(),
      }),
      responses: {
        200: z.object({
          auth: z.object({
            accessToken: z.string(),
            accessTokenExpiresIn: z.number(),
            refreshToken: z.string(),
            refreshTokenExpiresIn: z.number(),
            deviceId: z.string(),
            deviceName: z.string(),
          }),
        }),
        400: z.object({
          message: z.string(),
        }),
        401: z.object({
          message: z.string(),
        }),
        423: z.object({
          message: z.string(),
        }),
        500: z.object({
          message: z.string(),
        }),
      },
      body: z.object({}),
      summary: "Refresh token",
    },
    logout: {
      method: "POST",
      path: "/logout",
      headers: z.object({
        authorization: z.string(),
        "x-device-id": z.string(),
        "x-refresh-token": z.string(),
      }),
      responses: {
        200: z.object({
          message: z.string(),
        }),
        400: z.object({
          message: z.string(),
        }),
        401: z.object({
          message: z.string(),
        }),
        423: z.object({
          message: z.string(),
        }),
        500: z.object({
          message: z.string(),
        }),
      },
      body: z.object({}),
      summary: "Logout",
    },
    revokeSession: {
      method: "DELETE",
      path: "/sessions/:sessionId",
      pathParams: z.object({
        sessionId: z.string(),
      }),
      headers: z.object({
        authorization: z.string(),
      }),
      responses: {
        200: z.object({
          message: z.string(),
        }),
        400: z.object({
          message: z.string(),
        }),
        401: z.object({
          message: z.string(),
        }),
        423: z.object({
          message: z.string(),
        }),
        500: z.object({
          message: z.string(),
        }),
      },
      body: z.object({}),
      summary: "Revoke sessions",
    },
    reSendVerificationCode: {
      method: "POST",
      path: "/verification/email",
      responses: {
        200: z.object({
          verificationId: z.string(),
          message: z.string(),
        }),
        400: z.object({
          message: z.string(),
        }),
        404: z.object({
          message: z.string(),
        }),
        500: z.object({
          message: z.string(),
        }),
      },
      body: z.object({
        email: z.string().email("Invalid email address"),
      }),
      summary: "Send verification code",
    },
    verifyEmail: {
      method: "PUT",
      path: "/verification/email",
      responses: {
        200: z.object({
          message: z.string(),
        }),
        400: z.object({
          message: z.string(),
        }),
        404: z.object({
          message: z.string(),
        }),
        500: z.object({
          message: z.string(),
        }),
      },
      body: z.object({
        email: z.string().email(),
        verificationCode: z
          .string()
          .length(6)
          .regex(/^\d{6}$/, "Verification code must be a six-digit number"),
      }),
      summary: "Verify email",
    },
    me: {
      method: "GET",
      path: "/me",
      responses: {
        200: z.object({
          id: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          role: z.enum(["USER", "ADMIN"]),
          email: z.string(),
          isEmailVerified: z.boolean(),
          isActive: z.boolean(),
        }),
        401: z.object({
          message: z.string(),
        }),
        500: z.object({
          message: z.string(),
        }),
      },
      headers: z.object({
        authorization: z.string(),
      }),
      summary: "Get current user information",
    },
    currentSessions: {
      method: "GET",
      path: "/sessions",
      responses: {
        200: z.array(
          z.object({
            id: z.string(),
            deviceName: z.string(),
            deviceId: z.string(),
            createdAt: z.date(),
          }),
        ),
        401: z.object({
          message: z.string(),
        }),
        500: z.object({
          message: z.string(),
        }),
      },
      headers: z.object({
        authorization: z.string(),
      }),
      summary: "Get current active sessions",
    },
    changePassword: {
      method: "POST",
      path: "/password/change",
      body: z.object({
        newPassword: z
          .string()
          .min(8)
          .regex(
            /(?=.*[A-Z])/,
            "Password must contain at least one uppercase letter",
          )
          .regex(/(?=.*\d)/, "Password must contain at least one number")
          .regex(
            /(?=.*[!@#$%^&*(),.?":{}|<>])/,
            "Password must contain at least one special character",
          )
          .min(8, "Password must be at least 8 characters long"),
      }),
      responses: {
        200: z.object({
          message: z.string(),
        }),
        401: z.object({
          message: z.string(),
        }),
        500: z.object({
          message: z.string(),
        }),
      },
      headers: z.object({
        authorization: z.string(),
      }),
      summary: "Change password during password reset process",
    },
    sendPasswordResetCode: {
      method: "POST",
      path: "/password/forgot",
      body: z.object({
        email: z.string().email(),
      }),
      responses: {
        200: z.object({
          resetId: z.string(),
          message: z.string(),
        }),
        400: z.object({
          message: z.string(),
        }),
        404: z.object({
          message: z.string(),
        }),
        500: z.object({
          message: z.string(),
        }),
      },
      summary: "get password reset code via email",
    },
    resetPassword: {
      method: "POST",
      path: "/password/reset",
      responses: {
        200: z.object({
          message: z.string(),
        }),
        400: z.object({
          message: z.string(),
        }),
        404: z.object({
          message: z.string(),
        }),
        500: z.object({
          message: z.string(),
        }),
      },
      body: z.object({
        resetId: z.string().min(3),
        resetCode: z
          .string()
          .length(6)
          .regex(/^\d{6}$/, "Verification code must be a six-digit number"),
        password: z
          .string()
          .min(8)
          .regex(
            /(?=.*[A-Z])/,
            "Password must contain at least one uppercase letter",
          )
          .regex(/(?=.*\d)/, "Password must contain at least one number")
          .regex(
            /(?=.*[!@#$%^&*(),.?":{}|<>])/,
            "Password must contain at least one special character",
          )
          .min(8, "Password must be at least 8 characters long"),
      }),
      summary: "Change password during password reset process",
    },
  },
  {
    pathPrefix: "auth",
  },
);
