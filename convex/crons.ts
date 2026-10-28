import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval("import Drive gallery photos", { minutes: 2 }, internal.gallerySync.poll, {});
export default crons;
