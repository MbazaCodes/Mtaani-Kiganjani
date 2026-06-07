import { describe, expect, it } from "vitest";
import { logger } from "../lib/logger";

describe("Logger", () => {

  it("should expose logging methods", () => {

    expect(logger.info).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.audit).toBeDefined();

  });

});
