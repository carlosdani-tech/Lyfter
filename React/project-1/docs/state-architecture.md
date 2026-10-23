# Cart and checkout state architecture audit

## Scope and baseline

Root and frontend AGENTS.md and the PawStore integration skill apply. The working
tree already included checkout contract, single-string address, header and unrelated
edits. This refactor changes only frontend state orchestration, optional cancellation
options in JavaScript helpers, tests and these docs. No HTTP request/response,
authentication, role, route, backend or email contract changes.

Before refactoring, 117 focused auth/cart/checkout/routing/product-navigation tests
passed. Added mounted characterization tests passed before each provider changed:
StrictMode cart loading, late unmount response, and one checkout request/navigation.
Previously most race tests instantiated external stores; those scenarios now mount
actual providers and preserve behavior assertions. Freeze-implementation assertions
were replaced with response-copy isolation checks, retaining the mutation test.

## Mechanism decisions

| Previous mechanism | Purpose and risk if removed | Decision and replacement |
| --- | --- | --- |
| Manual subscribe/listeners/publish | Notify React of external mutations | Replaced by provider useReducer and normal context renders |
| useSyncExternalStore in both providers | Subscribe to custom snapshots | Removed from cart/checkout; AuthProvider is deliberately unchanged |
| Cart revision counter | Ignore work after reset/session/unmount | Replaced by auth session identity, active lifecycle and per-request membership; abort also fences ignored-abort transports |
| Cart write-fence counter | Discard queued intents after recovery fails | Replaced by removing queued request identities, aborting handles and requiring a fresh read |
| Cart FIFO promise tail | Serialize whole-cart responses and relative quantities | Required and retained privately; rapid increments and distinct-item tests demonstrate its purpose |
| Refresh and adjacent-intent deduplication | Avoid redundant reads/adds/removals/absolute assignments | Required and retained as promise identities; relative increments remain separate |
| Mutable per-item/product count maps | Drive row-specific pending UI | Removed; pending IDs and loading derive from reducer job descriptors |
| cartVersion | Require review after known rejection and identify new attempts | Required and retained as reducer data; not a global request revision |
| Checkout lock and release identity | Block cart edits during purchase and ignore obsolete releases | Required; private lock token plus reducer UI flag |
| Checkout revision | Fence late results/reset/session changes | Replaced by session and request identities plus abort |
| Checkout locked boolean plus in-flight promise | Close the pre-render double-click window | Promise/request handle retained; redundant boolean removed |
| Mutable checkout attempt | Stable key/body across uncertain results | Required; reducer owns attempt, async callback captures that immutable value |
| Separate release/completed-cart variables | Release lock and distinguish later purchases | Unlock belongs to request handle; completed-cart ID belongs to reducer |
| Frozen drafts/errors/cart snapshots | Defensive state isolation | Runtime freezing removed from providers/helpers; immutable replacement and copied responses suffice |
| API payload/projection freezing | Preserve allowlisted request and verified display snapshots | Existing boundary behavior retained; independent of provider state ownership |
| Last navigation ref | Suppress repeated success navigation | Required and retained; mounted StrictMode test verifies one navigation |
| Initial-load microtask flag | Suppress StrictMode's simulated initial duplicate GET | Required and retained in effect; it never starts checkout |
| Route-scoped feedback identity | Prevent old cleanup from erasing a newer denial | Required; reducer compares expected feedback object and origin location key |

Six external-store concepts are removed: subscriptions, manual publication,
external snapshot ownership, provider external-store hooks, revision/fence counters,
and pervasive provider runtime freezing. React does not replace mutation ordering,
idempotency, same-event locks, or session-bound response acceptance.

## Reducers and imperative refs

Cart reducer owns the authoritative cart, availability metadata, job descriptors,
errors/feedback/status, checkout UI lock and cartVersion. Actions queue/finish/discard
work, accept a response, update availability, report recovery/errors, lock/unlock,
set/clear feedback and reset on session changes. Selectors derive items, quantity
sum, exact server totals/display totals, loading, pending IDs and checkout readiness.
Reducers never call APIs, navigate, toast or mutate previous state.

Cart has three refs: committed view (stable synchronous reader), latest normalized
server cart (relative queued operations before React commit), and imperative
queue/request/abort/lock handles. The cart ref points to the same authoritative
response used by the reducer, not an independently updated cart. A session change
starts a fresh queue after invalidation; an explicit same-session clear waits for
the previous transport, since abort cannot undo a server write.

Checkout reducer owns draft, field errors, phase, attempt, confirmation ID,
completed-cart identity and review version. Actions edit one field, report local
validation, begin/resolve/reject an attempt, cancel a known draft, and reset.
Checkout has three refs: latest committed state (stable callback reads, never a
second transition engine), in-flight/lifecycle/abort handles, and last navigation.
The attempt/key/payload is not independently mirrored in a mutable request store.
Uncertain retries reuse reducer attempt data. Known snapshot conflicts release the
cart lock, refresh, and require explicit confirmation with a new key.

Public cart/checkout context names remain compatible. Actions are useCallback
functions and context values useMemo. Session-bound actions intentionally change
identity when the session changes, so saved old actions cannot read, mutate or
clear the new owner's cart. Session reset does not remount page children or lose
catalog UI state. The string shipping address, items and canonical total are intact.

## Testing and limits

Existing tests now drive actual providers through a small provider-only host using
installed React, ReactDOM createRoot and act. The host renders only a null Probe;
its minimal document is not a browser/DOM layout simulator. It exercises real
hooks, batching, effects, StrictMode, callbacks, navigation and unmount behavior.
Tests cover queues, recovery, response isolation, logout/expiry, same-mounted user
switches, ignored aborts, stale saved callbacks, stable retries, double clicks,
field error cleanup and single navigation. SSR markup tests remain separate.

Optional signal options are forwarded to fetch for cart, checkout and public
product reads. Session/unmount cleanup aborts them. Existing auth handles 401/422;
there is no token refresh or new credential lifecycle. Cancellation never implies
that a submitted purchase did not commit: retain/reconcile uncertain attempts.
No cross-tab/device coordination, persistence or automatic POST retry is added.
Manual browser/live Flask verification remains separate from these mounted tests.

Both cartSession.js and checkoutSession.js are still used as pure helper modules.
Neither is an unused deletion candidate. No file was deleted.
