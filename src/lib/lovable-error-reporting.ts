/**
 * Generic client-side error reporter.
 * Logs to console in development; can be wired to Sentry or similar in production.
 */
export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  console.error("[AppError]", error, context);
}
