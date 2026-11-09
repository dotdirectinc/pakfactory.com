# PDP sticky configuration bar

| Change | What | Files |
|---|---|---|
| Overview gate | The sticky configuration bar (and the page's bottom padding) shows only after `#pdp-overview` leaves the viewport; it still requires a quantity. `overviewInView` defaults to true so the bar doesn't flash before the observer runs. | `components/product/product-pdp-shell.tsx` (`OrderablePdpBody`, `IntersectionObserver`) |
| Ease-in | On mount the bar fades and slides up (~300ms, ease-out); `motion-reduce:animate-none`. Exit is instant (unmount). | `components/product/product-configuration-bar.tsx` |

Source: POC commit `d149bb8` (pakfactory.com-poc). The POC's Quantity MOQ copy change from the same commit is not included.
