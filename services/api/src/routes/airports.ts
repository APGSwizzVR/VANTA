import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const listQuerySchema = z.object({
  country: z.string().trim().length(2).optional(),
  search: z.string().trim().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export async function airportRoutes(app: FastifyInstance): Promise<void> {
  app.get("/airports", async (request, reply) => {
    const parseResult = listQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.code(400).send({ error: "Invalid query parameters" });
    }
    const { country, search, limit } = parseResult.data;

    const airports = await prisma.airport.findMany({
      where: {
        ...(country ? { country } : {}),
        ...(search
          ? {
              OR: [
                { icao: { contains: search.toUpperCase() } },
                { iata: { contains: search.toUpperCase() } },
                { name: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      take: limit,
      orderBy: { icao: "asc" },
    });

    return reply.send({ airports });
  });

  app.get<{ Params: { icao: string } }>("/airports/:icao", async (request, reply) => {
    const icao = request.params.icao.toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(icao)) {
      return reply.code(400).send({ error: "Invalid ICAO code" });
    }

    const airport = await prisma.airport.findUnique({
      where: { icao },
      include: { runways: true, frequencies: true, atcPositions: true },
    });

    if (!airport) {
      return reply.code(404).send({ error: "Airport not found" });
    }

    return reply.send(airport);
  });
}
