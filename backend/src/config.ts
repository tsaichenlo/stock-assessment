// All environment-driven settings in one place, with safe local defaults.

export const config = {
  /** Port the API listens on. */
  port: Number(process.env.PORT ?? 3000),
  /** Browser origin allowed to call this API (the frontend dev server). */
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};
