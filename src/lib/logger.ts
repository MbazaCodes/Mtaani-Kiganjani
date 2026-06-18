export const logger = {
  info(message: string, data?: unknown) {
    console.info("[INFO]", message, data);
  },

  warn(message: string, data?: unknown) {
    console.warn("[WARN]", message, data);
  },

  error(message: string, data?: unknown) {
    console.error("[ERROR]", message, data);
  },

  audit(action: string, userId?: string) {
    console.info("[AUDIT]", {
      action,
      userId,
      timestamp: new Date().toISOString(),
    });
  },
};
