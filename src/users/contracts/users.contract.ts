import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { extendZodWithOpenApi } from "@anatine/zod-openapi";

extendZodWithOpenApi(z);
const c = initContract();

export const userContract = c.router(
  {
    signup: {
      method: "POST",
      path: "/signup",
      responses: {
        201: z.object({
          id: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          email: z.string().email(),
          isEmailVerified: z.boolean(),
          isActive: z.boolean(),
        }),
        400: z.object({
          message: z.string(),
        }),
        500: z.object({
          message: z.string(),
        }),
      },
      body: z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
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
      summary: "Create a user account",
    },
    changeUserInfo: {
      method: "PUT",
      path: "",
      body: z.object({
        firstName: z.string(),
        lastName: z.string(),
      }),
      responses: {
        200: z.object({
          id: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          email: z.string(),
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
      description:
        "Endpoint to change user information. Meant for authenticated users.",
      summary: "Change user information",
    },
  },
  {
    pathPrefix: "user",
  },
);
