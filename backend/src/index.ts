import http from "node:http";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";
import { initSocket } from "./lib/socket";
import { uploadsDir } from "./lib/uploads";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { districtsRouter } from "./modules/districts/districts.routes";
import { tournamentsRouter } from "./modules/tournaments/tournaments.routes";
import { categoriesRouter, tournamentCategoriesRouter } from "./modules/categories/categories.routes";
import { teamsRouter, tournamentTeamsRouter } from "./modules/teams/teams.routes";
import { districtPlayersRouter, playersRouter } from "./modules/players/players.routes";
import { categoryEntriesRouter, entriesRouter } from "./modules/entries/entries.routes";
import { categoryDrawRouter } from "./modules/draws/draws.routes";
import { matchesRouter, tournamentMatchesRouter } from "./modules/matches/matches.routes";
import { registrationsRouter, tournamentRegistrationsRouter } from "./modules/registrations/registrations.routes";
import { scoringRouter } from "./modules/scoring/scoring.routes";
import { courtsRouter, tournamentCourtsRouter } from "./modules/courts/courts.routes";
import { refereesRouter, tournamentRefereesRouter } from "./modules/referees/referees.routes";
import { categoryRankingsRouter, rankingsRouter, tournamentRankingsRouter } from "./modules/rankings/rankings.routes";
import { usersRouter } from "./modules/users/users.routes";
import { pairsRouter } from "./modules/pairs/pairs.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { publicRouter } from "./modules/public/public.routes";
import { opsRouter } from "./modules/ops/ops.routes";
import {
  categoryCertificatesRouter,
  tournamentCertificatesRouter,
} from "./modules/certificates/certificates.routes";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors());
app.use(express.json());
app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
app.use("/uploads", express.static(uploadsDir));

app.get("/health", async (_req, res) => {
  const checks = { database: false, redis: false };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  try {
    const pong = await Promise.race([
      redis.ping(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
    ]);
    checks.redis = pong === "PONG";
  } catch {
    checks.redis = false;
  }

  // Database is required; Redis is optional (used for future caching / health only).
  const ok = checks.database;
  res.status(ok ? 200 : 503).json({
    status: ok ? (checks.redis ? "ok" : "degraded") : "down",
    checks,
  });
});

app.use("/api/auth", authRouter);
app.use("/api/districts", districtsRouter);
app.use("/api/tournaments", tournamentsRouter);
app.use("/api/tournaments/:tournamentId/categories", tournamentCategoriesRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/tournaments/:tournamentId/teams", tournamentTeamsRouter);
app.use("/api/teams", teamsRouter);
app.use("/api/districts/:districtId/players", districtPlayersRouter);
app.use("/api/players", playersRouter);
app.use("/api/categories/:categoryId/entries", categoryEntriesRouter);
app.use("/api/entries", entriesRouter);
app.use("/api/categories/:categoryId/draw", categoryDrawRouter);
app.use("/api/tournaments/:tournamentId/matches", tournamentMatchesRouter);
app.use("/api/matches", matchesRouter);
app.use("/api/tournaments/:tournamentId/registrations", tournamentRegistrationsRouter);
app.use("/api/registrations", registrationsRouter);
app.use("/api/matches/:id/scoring", scoringRouter);
app.use("/api/tournaments/:tournamentId/courts", tournamentCourtsRouter);
app.use("/api/courts", courtsRouter);
app.use("/api/tournaments/:tournamentId/referees", tournamentRefereesRouter);
app.use("/api/referees", refereesRouter);
app.use("/api/categories/:categoryId/rankings", categoryRankingsRouter);
app.use("/api/tournaments/:tournamentId/rankings", tournamentRankingsRouter);
app.use("/api/rankings", rankingsRouter);
app.use("/api/users", usersRouter);
app.use("/api/pairs", pairsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/public", publicRouter);
app.use("/api/ops", opsRouter);
app.use("/api/categories/:categoryId/certificates", categoryCertificatesRouter);
app.use("/api/tournaments/:tournamentId/certificates", tournamentCertificatesRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`Backend listening on http://localhost:${env.PORT}`);
});
