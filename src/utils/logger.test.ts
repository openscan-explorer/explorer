import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Logger", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe("in development environment", () => {
    beforeEach(() => {
      vi.doMock("./constants", () => ({ ENVIRONMENT: "development" }));
    });

    it("should log debug messages", async () => {
      const { logger } = await import("./logger");
      logger.debug("test debug");
      expect(consoleLogSpy).toHaveBeenCalledWith("[DEBUG]", "test debug");
    });

    it("should log info messages", async () => {
      const { logger } = await import("./logger");
      logger.info("test info");
      expect(consoleLogSpy).toHaveBeenCalledWith("[INFO]", "test info");
    });

    it("should log warn messages", async () => {
      const { logger } = await import("./logger");
      logger.warn("test warn");
      expect(consoleWarnSpy).toHaveBeenCalledWith("[WARN]", "test warn");
    });

    it("should log error messages", async () => {
      const { logger } = await import("./logger");
      logger.error("test error");
      expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR]", "test error");
    });

    it("should pass multiple arguments", async () => {
      const { logger } = await import("./logger");
      const testObj = { key: "value" };
      logger.debug("message", testObj, 123);
      expect(consoleLogSpy).toHaveBeenCalledWith("[DEBUG]", "message", testObj, 123);
    });
  });

  describe("in staging environment", () => {
    beforeEach(() => {
      vi.doMock("./constants", () => ({ ENVIRONMENT: "staging" }));
    });

    it("should NOT log debug messages", async () => {
      const { logger } = await import("./logger");
      logger.debug("test debug");
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("should log info messages", async () => {
      const { logger } = await import("./logger");
      logger.info("test info");
      expect(consoleLogSpy).toHaveBeenCalledWith("[INFO]", "test info");
    });

    it("should log warn messages", async () => {
      const { logger } = await import("./logger");
      logger.warn("test warn");
      expect(consoleWarnSpy).toHaveBeenCalledWith("[WARN]", "test warn");
    });

    it("should log error messages", async () => {
      const { logger } = await import("./logger");
      logger.error("test error");
      expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR]", "test error");
    });
  });

  describe("in production environment", () => {
    beforeEach(() => {
      vi.doMock("./constants", () => ({ ENVIRONMENT: "production" }));
    });

    it("should NOT log debug messages", async () => {
      const { logger } = await import("./logger");
      logger.debug("test debug");
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("should NOT log info messages", async () => {
      const { logger } = await import("./logger");
      logger.info("test info");
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("should log warn messages", async () => {
      const { logger } = await import("./logger");
      logger.warn("test warn");
      expect(consoleWarnSpy).toHaveBeenCalledWith("[WARN]", "test warn");
    });

    it("should log error messages", async () => {
      const { logger } = await import("./logger");
      logger.error("test error");
      expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR]", "test error");
    });
  });
});
