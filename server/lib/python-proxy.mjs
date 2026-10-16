export function createPythonProxy(pythonBase) {
  return async function proxyToPython(c, pythonPath) {
    const qs = c.req.query();
    const search = new URLSearchParams(qs).toString();
    const url = `${pythonBase}${pythonPath}${search ? `?${search}` : ""}`;
    const init = { method: c.req.method, headers: {} };
    const uid = c.req.header("X-User-UID");
    if (uid) init.headers["X-User-UID"] = uid;
    if (!["GET", "HEAD"].includes(c.req.method)) {
      init.headers["Content-Type"] = "application/json";
      init.body = await c.req.text();
    }
    try {
      const res = await fetch(url, init);
      const text = await res.text();
      return c.body(text, res.status, { "Content-Type": res.headers.get("content-type") || "application/json" });
    } catch (err) {
      return c.json({ ok: false, error: "fitness_api_unreachable", details: String(err?.message || err) }, 502);
    }
  };
}

// No domain routes or prefix rewriting here: Python receives /api unchanged.
export function registerPythonApi(app, pythonBase) {
  const proxy = createPythonProxy(pythonBase);
  app.all("/api/*", (c) => proxy(c, c.req.path));
}
