import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Send weekly digest every Friday at 4:30 PM ET (market close + 30 minutes)
// US market closes at 4:00 PM ET, so we send at 4:30 PM ET
// Using cron syntax: "30 21 * * 5" = 21:30 UTC every Friday (day 5)
// This accounts for EST (UTC-5), so 21:30 UTC = 4:30 PM ET
crons.cron(
  "myquant weekly digest",
  "30 21 * * 5", // Every Friday at 21:30 UTC (4:30 PM ET)
  internal.weeklyDigestEngine.sendWeeklyDigests
);

export default crons;