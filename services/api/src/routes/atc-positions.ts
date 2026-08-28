import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { atcPositionTypeSchema, frequencyMhzSchema, icaoSchema } from "@vanta/protocol";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../plugins/authenticate.js";

const claimSchema = z.object({
  airportIcao: icaoSchema,
  positionType: atcPositionTypeSchema,
  frequencyMhz: frequencyMhzSchema,
});

export async function atcPositionRoutes(app: FastifyInstance): Promise<void> {
  app.get("/atc-positions", async (_request, reply) => {
    const positions = await prisma.atcPosition.findMany({
      where: { online: true },
      include: { controller: { select: { username: true, displayName: true } } },
    });
    return reply.send({ atcPositions: positions });
  });

  app.post(
    "/atc-positions/claim",
    { preHandler: [authenticate, requireRole("ATC", "ADMIN")] },
    async (request, reply) => {
      if (!request.vantaUser) return reply.code(401).send({ error: "Unauthorized" });

      const parseResult = claimSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({ error: "Invalid request", details: parseResult.error.flatten() });
      }
      const { airportIcao, positionType, frequencyMhz } = parseResult.data;

      const airport = await prisma.airport.findUnique({ where: { icao: airportIcao } });
      if (!airport) {
        return reply.code(404).send({ error: "Unknown airport" });
      }

      // Use a transaction so the "is it already taken" check and the
      // claim itself are atomic — two controllers racing to claim the
      // same position at the same instant must not both succeed.
      try {
        const position = await prisma.$transaction(async (tx) => {
          const existing = await tx.atcPosition.findUnique({
            where: { airportIcao_positionType: { airportIcao, positionType } },
          });

          if (existing?.online && existing.controllerId !== request.vantaUser!.id) {
            throw new Error("POSITION_TAKEN");
          }

          return tx.atcPosition.upsert({
            where: { airportIcao_positionType: { airportIcao, positionType } },
            create: {
              airportIcao,
              positionType,
              frequencyMhz,
              online: true,
              controllerId: request.vantaUser!.id,
              onlineSince: new Date(),
            },
            update: {
              frequencyMhz,
              online: true,
              controllerId: request.vantaUser!.id,
              onlineSince: new Date(),
            },
          });
        });

        await prisma.networkEvent.create({
          data: {
            userId: request.vantaUser.id,
            type: "ATC_POSITION_OPENED",
            detail: { airportIcao, positionType, frequencyMhz },
          },
        });

        return reply.send(position);
      } catch (error) {
        if (error instanceof Error && error.message === "POSITION_TAKEN") {
          return reply.code(409).send({ error: "This position is already staffed by another controller" });
        }
        throw error;
      }
    }
  );

  app.post(
    "/atc-positions/release",
    { preHandler: [authenticate, requireRole("ATC", "ADMIN")] },
    async (request, reply) => {
      if (!request.vantaUser) return reply.code(401).send({ error: "Unauthorized" });

      const bodySchema = z.object({ airportIcao: icaoSchema, positionType: atcPositionTypeSchema });
      const parseResult = bodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({ error: "Invalid request" });
      }
      const { airportIcao, positionType } = parseResult.data;

      const existing = await prisma.atcPosition.findUnique({
        where: { airportIcao_positionType: { airportIcao, positionType } },
      });

      if (!existing || !existing.online) {
        return reply.code(404).send({ error: "Position is not currently online" });
      }
      if (existing.controllerId !== request.vantaUser.id && !request.vantaUser.roles.includes("ADMIN")) {
        return reply.code(403).send({ error: "You do not control this position" });
      }

      await prisma.atcPosition.update({
        where: { airportIcao_positionType: { airportIcao, positionType } },
        data: { online: false, controllerId: null, onlineSince: null },
      });

      await prisma.networkEvent.create({
        data: {
          userId: request.vantaUser.id,
          type: "ATC_POSITION_CLOSED",
          detail: { airportIcao, positionType },
        },
      });

      return reply.code(204).send();
    }
  );
}
