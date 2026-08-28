import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { callsignSchema, icaoSchema } from "@vanta/protocol";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../plugins/authenticate.js";

const createFlightPlanSchema = z.object({
  callsign: callsignSchema,
  aircraftType: z.string().min(1).max(32),
  departureIcao: icaoSchema,
  destinationIcao: icaoSchema,
  alternateIcao: icaoSchema.nullable().optional(),
  route: z.string().max(2000),
  cruiseAltitudeFeet: z.number().int().min(0).max(60000),
  flightRules: z.enum(["VFR", "IFR"]),
  departureTimeUtc: z.string().datetime().nullable().optional(),
  remarks: z.string().max(500).nullable().optional(),
});

export async function flightPlanRoutes(app: FastifyInstance): Promise<void> {
  // Publicly readable — ATC and the radar need to see active flight
  // plans without every viewer needing an account.
  app.get("/flight-plans", async (_request, reply) => {
    const plans = await prisma.flightPlan.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return reply.send({ flightPlans: plans });
  });

  app.post("/flight-plans", { preHandler: authenticate }, async (request, reply) => {
    if (!request.vantaUser) return reply.code(401).send({ error: "Unauthorized" });

    const parseResult = createFlightPlanSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ error: "Invalid flight plan", details: parseResult.error.flatten() });
    }
    const data = parseResult.data;

    const plan = await prisma.flightPlan.create({
      data: {
        userId: request.vantaUser.id,
        callsign: data.callsign,
        aircraftType: data.aircraftType,
        departureIcao: data.departureIcao,
        destinationIcao: data.destinationIcao,
        alternateIcao: data.alternateIcao ?? null,
        route: data.route,
        cruiseAltitudeFeet: data.cruiseAltitudeFeet,
        flightRules: data.flightRules,
        departureTimeUtc: data.departureTimeUtc ? new Date(data.departureTimeUtc) : null,
        remarks: data.remarks ?? null,
      },
    });

    await prisma.networkEvent.create({
      data: {
        userId: request.vantaUser.id,
        type: "FLIGHT_PLAN_FILED",
        detail: { callsign: plan.callsign, departureIcao: plan.departureIcao, destinationIcao: plan.destinationIcao },
      },
    });

    return reply.code(201).send(plan);
  });

  app.delete<{ Params: { id: string } }>(
    "/flight-plans/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      if (!request.vantaUser) return reply.code(401).send({ error: "Unauthorized" });

      const plan = await prisma.flightPlan.findUnique({ where: { id: request.params.id } });
      if (!plan) return reply.code(404).send({ error: "Flight plan not found" });

      const isOwner = plan.userId === request.vantaUser.id;
      const isAdmin = request.vantaUser.roles.includes("ADMIN");
      if (!isOwner && !isAdmin) {
        return reply.code(403).send({ error: "You do not own this flight plan" });
      }

      await prisma.flightPlan.delete({ where: { id: plan.id } });
      return reply.code(204).send();
    }
  );
}
