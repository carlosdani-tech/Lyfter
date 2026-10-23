import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuthSession, SessionChangedError } from "../../src/context/authSession.js";

const credentials = { email: "ana@example.com", password: "test-only" };
function response(role = "client", id = 1) {
  return {
    access_token: `test-only-${id}`,
    user: { id, email: credentials.email, first_name: "Ana", role, is_active: true },
  };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
}
function expectAnonymous(store) {
  const state = store.getSnapshot();
  assert.equal(state.currentUser, null);
  assert.equal(Boolean(state.accessToken), false);
  assert.equal(state.isAuthenticated, false);
  assert.equal(state.isAdmin, false);
  assert.equal(state.isClient, false);
  assert.equal(state.authLoading, false);
}

test("logged-out state and role flags come only from accepted backend session data", async () => {
  const store = createAuthSession(async () => response("client"));
  expectAnonymous(store);
  await store.login({ ...credentials, role: "admin", isAdmin: true });
  assert.equal(store.getSnapshot().isClient, true);
  assert.equal(store.getSnapshot().isAdmin, false);
  assert.equal(Object.isFrozen(store.getSnapshot().currentUser), true);
  const admin = createAuthSession(async () => response("admin"));
  await admin.login(credentials);
  assert.equal(admin.getSnapshot().isAdmin, true);
  assert.equal(admin.getSnapshot().isClient, false);
});

test("failed login clears loading and shows only a sanitized Spanish message", async () => {
  for (const status of [401, 0, 500, 400]) {
    const store = createAuthSession(async () => { throw Object.assign(new Error("unsafe-provider-content"), { status }); });
    assert.equal(await store.login(credentials), null);
    expectAnonymous(store);
    assert.ok(store.getSnapshot().authError);
    assert.equal(store.getSnapshot().authError.includes("unsafe-provider-content"), false);
    store.clearAuthError();
    assert.equal(store.getSnapshot().authError, "");
  }
});

test("invalid credentials use correctly punctuated Spanish without exposing provider text", async () => {
  const store = createAuthSession(async () => { throw { status: 401, message: "unsafe-provider-content" }; });
  await store.login(credentials);
  assert.equal(store.getSnapshot().authError,
    "Las credenciales proporcionadas no son válidas. Por favor, verifica tu correo electrónico y tu contraseña.");
  expectAnonymous(store);
});

test("malformed, inactive, and unsupported backend sessions never authenticate", async () => {
  for (const invalid of [null, {}, { ...response(), access_token: "" },
    { ...response(), user: { role: "owner" } }, { ...response(), user: { role: "admin", is_active: false } }]) {
    const store = createAuthSession(async () => invalid);
    assert.equal(await store.login(credentials), null);
    expectAnonymous(store);
  }
});

test("logout wins even when an in-flight login ignores cancellation", async () => {
  const request = deferred();
  let signal;
  const store = createAuthSession((_, options) => { signal = options.signal; return request.promise; });
  const login = store.login(credentials);
  assert.equal(store.getSnapshot().authLoading, true);
  store.logout();
  assert.equal(signal.aborted, true);
  expectAnonymous(store);
  request.resolve(response("admin"));
  assert.equal(await login, null);
  expectAnonymous(store);
});

test("a late login failure cannot overwrite logout or a newer login", async () => {
  const oldRequest = deferred();
  let call = 0;
  const store = createAuthSession(() => ++call === 1 ? oldRequest.promise : Promise.resolve(response("client", 2)));
  const oldLogin = store.login(credentials);
  store.logout();
  await store.login(credentials);
  oldRequest.reject(Object.assign(new Error("old error"), { status: 401 }));
  assert.equal(await oldLogin, null);
  assert.equal(store.getSnapshot().currentUser.id, 2);
  assert.equal(store.getSnapshot().authError, "");
});

test("the latest login wins when responses arrive out of order", async () => {
  const older = deferred();
  const newer = deferred();
  let call = 0;
  const store = createAuthSession(() => ++call === 1 ? older.promise : newer.promise);
  const oldLogin = store.login(credentials);
  const newLogin = store.login(credentials);
  older.resolve(response("admin", 1));
  assert.equal(await oldLogin, null);
  assert.equal(store.getSnapshot().authLoading, true);
  newer.resolve(response("client", 2));
  await newLogin;
  assert.equal(store.getSnapshot().currentUser.id, 2);
  assert.equal(store.getSnapshot().isAdmin, false);
});

test("logout atomically clears session, loading, errors, and protected UI actions", async () => {
  let cleanupCount = 0;
  const store = createAuthSession(async () => response("admin"), () => { cleanupCount += 1; });
  await store.login(credentials);
  const snapshots = [];
  const unsubscribe = store.subscribe(() => snapshots.push(store.getSnapshot()));
  const previousCleanupCount = cleanupCount;
  store.logout();
  unsubscribe();
  assert.equal(snapshots.length, 1);
  expectAnonymous(store);
  assert.equal(snapshots[0].authError, "");
  assert.equal(cleanupCount, previousCleanupCount + 1);
});

test("expired or malformed tokens invalidate only the session that made the request", async () => {
  for (const status of [401, 422]) {
    const store = createAuthSession(async () => response("admin"));
    await store.login(credentials);
    const version = store.getSnapshot().sessionVersion;
    await assert.rejects(store.runProtectedRequest(async () => { throw { status }; }, version),
      (error) => error.status === 401);
    expectAnonymous(store);
    assert.match(store.getSnapshot().authError, /Tu sesión expiró/);
  }
});

test("late protected 401 does not invalidate a newly authenticated user", async () => {
  let id = 0;
  const store = createAuthSession(async () => response("admin", ++id));
  await store.login(credentials);
  const request = deferred();
  const work = store.runProtectedRequest(() => request.promise, store.getSnapshot().sessionVersion);
  store.logout();
  await store.login(credentials);
  request.reject({ status: 401 });
  await assert.rejects(work, SessionChangedError);
  assert.equal(store.getSnapshot().currentUser.id, 2);
  assert.equal(store.getSnapshot().authError, "");
});

test("late protected success cannot trigger a save redirect or success callback after logout", async () => {
  const store = createAuthSession(async () => response("admin"));
  await store.login(credentials);
  const request = deferred();
  let success = false;
  const work = store.runProtectedRequest(() => request.promise, store.getSnapshot().sessionVersion)
    .then(() => { success = true; });
  store.logout();
  request.resolve({ id: 1 });
  await assert.rejects(work, SessionChangedError);
  assert.equal(success, false);
});

test("old event handlers cannot issue requests using a new session", async () => {
  const store = createAuthSession(async () => response("admin"));
  await store.login(credentials);
  const version = store.getSnapshot().sessionVersion;
  store.logout();
  await store.login(credentials);
  let requested = false;
  await assert.rejects(store.runProtectedRequest(async () => { requested = true; }, version), SessionChangedError);
  assert.equal(requested, false);
});

test("forbidden responses preserve the session and logout invalidates login redirect eligibility", async () => {
  const store = createAuthSession(async () => response("client"));
  const result = await store.login(credentials);
  assert.equal(result.isCurrent(), true);
  await assert.rejects(store.runProtectedRequest(async () => { throw { status: 403 }; }, store.getSnapshot().sessionVersion),
    (error) => error.status === 403);
  assert.equal(store.getSnapshot().isAuthenticated, true);
  store.logout();
  assert.equal(result.isCurrent(), false);
});

test("session invalidation during login prevents its response restoring authentication", async () => {
  const request = deferred();
  const store = createAuthSession(() => request.promise);
  const login = store.login(credentials);
  store.invalidateSession();
  request.resolve(response("admin"));
  assert.equal(await login, null);
  expectAnonymous(store);
  assert.match(store.getSnapshot().authError, /Tu sesión expiró/);
});

test("session checks reject UI continuations when logout happens just after a request resolves", async () => {
  const store = createAuthSession(async () => response("admin"));
  await store.login(credentials);
  const version = store.getSnapshot().sessionVersion;
  const work = store.runProtectedRequest(async () => ({ id: 1 }), version);
  queueMicrotask(() => store.logout());
  await work;
  assert.equal(store.isCurrentSession(version), false);
});
