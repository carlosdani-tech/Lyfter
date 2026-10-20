# Cart UI implementation and verification

`/carrito` renders `CartPage` inside the existing client/auth guards and shared
Header/Footer. The page owns no cart, quantity, price, total, or stock state.
Reads and mutations use `useCartContext`; refs manage focus and duplicate
button events. `ProductThumbnail` owns only failed-image presentation state.

## Layout and references

The three referenced wireframes were unavailable among conversation attachments
and workspace images/PDFs. The written layout requirements form the visual
specification; no comparison against the unavailable reference is claimed.

Content is centered at a maximum 75rem. Above 56.25rem the larger item column
sits beside a 20rem sticky summary. At 56.25rem and below the summary stacks under
the items and becomes static. At 35rem and below cards use 4rem thumbnails,
wrapped headings, and steppers above two money columns. Shrinkable grid tracks
and text wrapping avoid relying on hidden page overflow.

Cards reuse neutral borders, subtle shadows, rounded corners, indigo actions,
and Arial typography. Header/Footer components are reused; responsive CSS
allows session controls to wrap. Intentional specification-driven choices are
the exact `Ir al checkout` label, CRC currency, retained session/count behavior,
and absence of prototype empty-cart toggles. Paw image fallbacks, availability
warnings, retry feedback, and a stock-conflict quantity-adjustment action are
functional additions to the written wireframe description.

## Data and availability

Cart serializer fields remain unchanged. Context copies public `GET /products`
metadata (`stock`, `is_active`, `image_url`) after populated-cart responses.
The page never fetches products or derives totals from product prices.
Metadata is immutable and session-scoped, with stale-response checks and auth
cleanup. Empty carts skip the product request; opening the cart refreshes
through the existing deduplicated context action.

Context adds `productsById`, `productError`, `pendingItemIds`,
`pendingProductIds`, `notice`, and `canCheckout`. Known missing/inactive
products, stock zero, excessive quantity, unknown availability, stale data,
pending operations, and empty carts disable checkout. Ready carts get a Router
link; disabled states use a real disabled button with no destination.
Checkout is implemented by CheckoutProvider and CheckoutPage; see
[checkout and confirmation](checkout-ui.md).

The public cart serializer omits inactive products without deleting persisted
rows; checkout examines all stored rows and may reject a hidden inactive item.
The UI reports items disappearing on refresh and blocks visible invalid rows,
but a fresh frontend cannot discover rows omitted from the response. This
existing backend limitation requires separate review. No backend contract,
serializer, migration, or authorization was changed. Backend transaction-time
stock checks remain authoritative after any UI availability check.

## Accessibility and behavior

- Detail/catalog keep the exact `Agregar al carrito` label. Unavailable
  products show Spanish explanations and disabled buttons.
- Header's existing NavLink marks Carrito active and displays quantity sum.
- Item keys use cart-item IDs; product IDs are visibly labeled.
- Native `−` and `+` buttons have distinct Spanish product-specific names;
  quantity is read-only output. Decrement at one removes the item.
- Red `Eliminar` has a product-specific accessible name. Quantity conflicts
  offer a context action to use the known available amount.
- Only affected row/product controls disable for normal mutations. Unrelated
  rows/navigation remain usable. Stale global state blocks writes pending
  reconciliation. An immediate ref guard prevents repeated button events.
- Server unit prices, subtotals, and total use exact decimal-string CRC
  formatting. Previous totals remain visibly busy; confirmed replacements
  display immediately without optimistic money/stock changes.
- Spanish status/alert regions announce loading, updates, removals, and errors.
  The global error banner is suppressed on the cart to avoid duplication.
- Image dimensions stay stable; missing/broken sources use a paw fallback with
  an accessible product-specific description. Loaded images have alt text.
- Keyboard focus is visible and controls have 2.75rem minimum touch targets.
  Lost focus after removal returns to the heading, while another control the
  user already selected retains focus.

## Validation

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

Automated context/markup tests cover populated, empty, loading, error, stale,
unavailable, stock-conflicted, and unknown-availability states; labels/output;
row-specific disabling; checkout gating; header activity/count; missing-image
markup; exact add text; long/escaped names; metadata price isolation; removed
item notices; and the existing queue/session security cases. Visible-text
assertions normalize React hydration comments.

| Requested manual check | Session result |
| --- | --- |
| Approximately 1440px and wireframe comparison | Not run: no connected browser or available wireframe files |
| Approximately 900px | Not run: no browser; stacked breakpoint implemented |
| Approximately 375px / horizontal scrolling | Not run: no browser; wrapping/shrinkable tracks implemented |
| Keyboard, focus after removal, screen reader | Browser behavior unverified; semantic markup/focus handling implemented |
| Missing image | Fallback markup tested; visual result unverified |
| Broken image | Error-to-fallback handler implemented; browser event unverified |
| Long product name | Content/escaping tested; rendered geometry unverified |
| Rapid click | Queue/dedup/busy state tested; browser timing unverified |
| Stock change/deactivation/network conflict | Context/markup fixtures tested; live backend unverified |

Computer-use inventory returned no apps or browsers. No screenshot, pixel
comparison, manual viewport pass, or live purchase check is claimed. No
dependency, `.env`, migration, deletion, or commit is part of this work.
