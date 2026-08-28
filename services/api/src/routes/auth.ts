import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { signToken } from "../lib/jwt.js";
import { generateVantaIdCandidate } from "../lib/vanta-id.js";

const registerBodySchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores"),
  displayName: z.string().trim().min(1).max(64),
  email: z.string().trim().email(),
  password: z.string().min(10).max(256),
});

const loginBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(256),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/register", async (request, reply) => {
    const parseResult = registerBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ error: "Invalid request body", details: parseResult.error.flatten() });
    }
    const { username, displayName, email, password } = parseResult.data;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { id: true },
    });
    if (existing) {
      return reply.code(409).send({ error: "A user with that email or username already exists" });
    }

    const passwordHash = await hashPassword(password);

    // Retry a handful of times on the astronomically unlikely chance
    // of a Vanta ID collision, rather than trusting uniqueness blindly.
    let user;
    for (let attempt = 0; attempt < 5; attempt++) {
      const vantaId = generateVantaIdCandidate();
      try {
        user = await prisma.user.create({
          data: { username, displayName, email, passwordHash, vantaId, roles: ["PILOT"] },
        });
        break;
      } catch (error) {
        const isUniqueViolation =
          typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
        if (!isUniqueViolation) throw error;
      }
    }

    if (!user) {
      app.log.error("Failed to allocate a unique Vanta ID after 5 attempts");
      return reply.code(500).send({ error: "Could not create account, please try again" });
    }

    app.log.info({ userId: user.id }, "New user registered");

    const token = signToken({ sub: user.id, vantaId: user.vantaId, roles: user.roles });
    return reply.code(201).send({
      token,
      user: {
        id: user.id,
        vantaId: user.vantaId,
        username: user.username,
        displayName: user.displayName,
        roles: user.roles,
      },
    });
  });

  app.post("/auth/login", async (request, reply) => {
    const parseResult = loginBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ error: "Invalid request body" });
    }
    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({ where: { email } });

    // Deliberately return the same generic error whether the email
    // doesn't exist or the password is wrong, so login responses
    // can't be used to enumerate registered accounts.
    if (!user) {
      await prisma.networkEvent.create({
        data: { type: "AUTH_FAILURE", detail: { email, reason: "no such user" } },
      });
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    if (user.moderationStatus === "BANNED" || user.moderationStatus === "SUSPENDED") {
      return reply.code(403).send({ error: "This account is not permitted to log in" });
    }

    const validPassword = await verifyPassword(user.passwordHash, password);
    if (!validPassword) {
      await prisma.networkEvent.create({
        data: { userId: user.id, type: "AUTH_FAILURE", detail: { reason: "bad password" } },
      });
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    const token = signToken({ sub: user.id, vantaId: user.vantaId, roles: user.roles });
    return reply.send({
      token,
      user: {
        id: user.id,
        vantaId: user.vantaId,
        username: user.username,
        displayName: user.displayName,
        roles: user.roles,
      },
    });
  });
}
