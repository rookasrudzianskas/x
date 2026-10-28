import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@libsql/client", () => ({ createClient: mocks.createClient }));
beforeEach(() => {
  vi.resetModules();
  mocks.createClient.mockReset();
  for (const name of [
    "DATABASE_URL",
    "DATABASE_AUTH_TOKEN",
    "TURSO_DATABASE_URL",
    "TURSO_AUTH_TOKEN",
  ])
    vi.stubEnv(name, "");
});
afterEach(() => vi.unstubAllEnvs());

it("closes a failed initialization and permits a clean retry", async () => {
  const { getDatabase } = await import("./db");
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

it.each([
  {
    url: "libsql://primary.example",
    token: "primary-token",
    selectedUrl: "libsql://primary.example",
    selectedToken: "primary-token",
  },
  {
    url: "",
    token: "unrelated-primary-token",
    selectedUrl: "libsql://marketplace.example",
    selectedToken: "marketplace-token",
  },
  {
    url: "libsql://primary.example",
    token: "",
    selectedUrl: "libsql://primary.example",
    selectedToken: undefined,
  },
])(
  "passes only the selected database pair to libSQL: $selectedUrl / $selectedToken",
  async ({ url, token, selectedUrl, selectedToken }) => {
    vi.stubEnv("DATABASE_URL", url);
    vi.stubEnv("DATABASE_AUTH_TOKEN", token);
    vi.stubEnv("TURSO_DATABASE_URL", "libsql://marketplace.example");
    vi.stubEnv("TURSO_AUTH_TOKEN", "marketplace-token");
    const healthy = { batch: vi.fn().mockResolvedValue([]), close: vi.fn() };
    mocks.createClient.mockReturnValue(healthy);
    const { getDatabase } = await import("./db");
    await expect(getDatabase()).resolves.toBe(healthy);
    expect(mocks.createClient).toHaveBeenCalledExactlyOnceWith({
      url: selectedUrl,
      authToken: selectedToken,
    });
    expect(healthy.batch).toHaveBeenCalledOnce();
  },
);
