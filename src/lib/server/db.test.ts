import { afterAll, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@libsql/client", () => ({ createClient: mocks.createClient }));
import { getDatabase } from "./db";

afterAll(() => vi.unstubAllEnvs());

it("closes a failed initialization and permits a clean retry", async () => {
  vi.stubEnv("DATABASE_URL", "file::memory:");
  const failure = new Error("initialization failed");
  const broken = { batch: vi.fn().mockRejectedValue(failure), close: vi.fn() };
  const healthy = { batch: vi.fn().mockResolvedValue([]), close: vi.fn() };
  mocks.createClient.mockReturnValueOnce(broken).mockReturnValueOnce(healthy);
  await expect(getDatabase()).rejects.toBe(failure);
  expect(broken.close).toHaveBeenCalledOnce();
  await expect(getDatabase()).resolves.toBe(healthy);
  await expect(getDatabase()).resolves.toBe(healthy);
  expect(mocks.createClient).toHaveBeenCalledTimes(2);
  expect(healthy.batch).toHaveBeenCalledOnce();
});
