# RedeCanais Ad Bypass

Userscript that removes the ad-gate and blocks popunders on RedeCanais, letting you watch videos without clicking on ads or being redirected.

## What it does

- **Ad-gate bypass** - Removes the SweetAlert2 popup that forces you to click 2 ads before watching. The video loads instantly.
- **Popunder blocking** - Prevents the site from opening new ad tabs when you click anywhere on the page.
- **DevTools unblock** - The site uses `disable-devtool` to block F12. This script neutralizes it.
- **Overlay removal** - Removes ad layers placed on top of the video player.
- **Redirect protection** - Prevents ad scripts from redirecting you to other sites.

## Install

1. Install [Violentmonkey](https://violentmonkey.github.io/), [Tampermonkey](https://www.tampermonkey.net/), or any userscript manager
2. Click below to install the script:

> **[Install from Greasy Fork](https://greasyfork.org/scripts/by-site/redecanais.ooo)** (recommended)

Or install directly from this repo:

> **[Install redecanais-bypass.user.js](https://raw.githubusercontent.com/japbcoelho/redecanais-adblock-bypass/main/redecanais-bypass.user.js)**

## Supported domains

`redecanais.ooo` `redecanais.cafe` `redecanais.gs` `redecanais.ms` `redecanais.ps` `redecanais.zip` `redecanais.africa` `redecanais.mov` `redecanais.la` `redecanais.dev` `redecanais.ac` `redecanais.dad` `redecanais.in` `redecanais.be` `redecanais.ph` `redecanais.pet`

If the site moves to a new domain, you can add a new `@match` in your userscript manager settings.

## How it works

RedeCanais uses SweetAlert2 to display popups that require clicking on ads to unlock the video player. The site stores a "snooze" timestamp in `localStorage` after the ad is clicked.

This script:

1. Intercepts `Swal.fire()` via `Object.defineProperty` on `window.Swal` - ad popups are auto-resolved as confirmed before they render
2. Fakes `window.open()` returns so the site thinks the ad tab was opened and visited
3. Sets future timestamps in `localStorage` for snooze keys so the site thinks ads were already clicked
4. Blocks the `disable-devtool` library from loading via `Node.prototype.appendChild` interception
5. Uses a `MutationObserver` to catch and remove any SweetAlert containers that slip through

## Compatibility

| Manager | Status |
|---------|--------|
| Violentmonkey | Tested |
| Tampermonkey | Should work |
| Greasemonkey | Should work |

## Contributing

Found a bug or the site changed its ad method? Open an [issue](https://github.com/japbcoelho/redecanais-adblock-bypass/issues).

Pull requests are welcome.

## License

[MIT](LICENSE)
