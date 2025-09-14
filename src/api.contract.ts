import { initContract } from "@ts-rest/core";
import { userContract } from "./users/contracts/users.contract";
import { authContract } from "./auth/contracts/auth.contract";
import { z } from "zod";

const c = initContract();

export const contract = c.router(
  { users: userContract, auth: authContract },
  {
    pathPrefix: "/api/",
    commonResponses: {
      500: z.object({
        message: z.string(),
      }),
    },
  },
);
