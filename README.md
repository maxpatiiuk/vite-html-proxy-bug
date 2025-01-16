# Vitest fails on html-proxy

This is a Vite bug that affects Vitest.

Vite issue URL: https://github.com/vitejs/vite/issues/19213

## Reproduction

1. Clone this repository

   ```sh
   git clone https://github.com/maxpatiiuk/vite-html-proxy-bug
   ```

2. Install dependencies

   ```sh
   npm install
   ```

3. Run vitest browser mode:

   ```sh
   npx vitest
   ```

   See the following error message in the terminal:

```yaml
10:42:08 AM [vite] Pre-transform error: Failed to parse source for import analysis because the content contains invalid JS syntax. You may need to install appropriate plugins to handle the .js file format, or if it's an asset, add "**/*.js" to `assetsInclude` in your configuration.
10:42:08 AM [vite] Internal server error: Failed to parse source for import analysis because the content contains invalid JS syntax. You may need to install appropriate plugins to handle the .js file format, or if it's an asset, add "**/*.js" to `assetsInclude` in your configuration.
  Plugin: vite:import-analysis
  File: /Users/mak13180/site/esri/vite-html-proxy-bug/node_modules/@vitest/browser/dist/client/tester/tester.html?v=0aab3063&html-proxy&index=0.js:7:41
  5  |      <link rel="icon" href="{__VITEST_FAVICON__}" type="image/svg+xml">
  6  |      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  7  |      <title>Vitest Browser Tester</title>
     |                                          ^
  8  |      <script type="module" crossorigin src="/__vitest_browser__/tester-B8eJg1-s.js"></script>
  9  |      <link rel="modulepreload" crossorigin href="/__vitest_browser__/utils-CaCTRFti.js">
      at TransformPluginContext._formatError (file:///Users/mak13180/site/esri/vite-html-proxy-bug/node_modules/vite/dist/node/chunks/dep-CB_7IfJ-.js:49255:41)
      at TransformPluginContext.error (file:///Users/mak13180/site/esri/vite-html-proxy-bug/node_modules/vite/dist/node/chunks/dep-CB_7IfJ-.js:49250:16)
      at TransformPluginContext.transform (file:///Users/mak13180/site/esri/vite-html-proxy-bug/node_modules/vite/dist/node/chunks/dep-CB_7IfJ-.js:63993:14)
      at async PluginContainer.transform (file:///Users/mak13180/site/esri/vite-html-proxy-bug/node_modules/vite/dist/node/chunks/dep-CB_7IfJ-.js:49096:18)
      at async loadAndTransform (file:///Users/mak13180/site/esri/vite-html-proxy-bug/node_modules/vite/dist/node/chunks/dep-CB_7IfJ-.js:51929:27)
      at async viteTransformMiddleware (file:///Users/mak13180/site/esri/vite-html-proxy-bug/node_modules/vite/dist/node/chunks/dep-CB_7IfJ-.js:61881:24)
```

## Explanation

Starting with Vitest 2.1.5, Vitest browser mode calls transformIndexHtml.

If html contains module scripts, `preTransformRequest` will be called: https://github.com/vitejs/vite/blob/4f5845a3182fc950eb9cd76d7161698383113b18/packages/vite/src/node/server/middlewares/indexHtml.ts#L257

The request URL may look like `/Users/mak13180/site/esri/arcgis-dashboards/node_modules/@vitest/browser/dist/client/tester/tester.html?html-proxy&index=0.js`

Later, `ensureVersionQuery` is called to add version hash to query string: https://github.com/vitejs/vite/blob/4f5845a3182fc950eb9cd76d7161698383113b18/packages/vite/src/node/plugins/resolve.ts#L277

The updated URL: `/Users/mak13180/site/esri/arcgis-dashboards/node_modules/@vitest/browser/dist/client/tester/tester.html?v=12535af4&html-proxy&index=0.js`

Such URL is supposed to be resolved by the `vite:html-inline-proxy` plugin: https://github.com/vitejs/vite/blob/4f5845a3182fc950eb9cd76d7161698383113b18/packages/vite/src/node/plugins/html.ts#L96-L106, however, **that does not work**.

**Here is the bug**: the regex that checks for html-proxy URLs expects the URL to contain `?html-proxy`, where as the above URL contains `&html-proxy`: https://github.com/vitejs/vite/blob/4f5845a3182fc950eb9cd76d7161698383113b18/packages/vite/src/node/plugins/html.ts#L52-L53.

Because of that, `pluginContainer.load(id)` fails to resolve the file. In such cases, it falls back to reading the file from the file system: https://github.com/vitejs/vite/blob/4f5845a3182fc950eb9cd76d7161698383113b18/packages/vite/src/node/server/transformRequest.ts#L271-L274

`fs.readFile()` ignores the query string, reads the `tester.html` file, and serves it - however, the .js file was expected. This causes an error in the Pre-transform during import analysis.

## Solution

Vite should update the following regexes:

https://github.com/vitejs/vite/blob/4f5845a3182fc950eb9cd76d7161698383113b18/packages/vite/src/node/plugins/html.ts#L52-L54

Should replace `\?` by `[?&]`.

For reference, this is already correct in the `vite:css-post` plugin: https://github.com/vitejs/vite/blob/4f5845a3182fc950eb9cd76d7161698383113b18/packages/vite/src/node/plugins/css.ts#L227.

Also, the Vite team should evaluate whether this bug affects any other Vite plugins.

## Environment

```
  System:
    OS: macOS 15.2
    CPU: (10) arm64 Apple M1 Pro
    Memory: 702.52 MB / 32.00 GB
    Shell: 5.9 - /bin/zsh
  Binaries:
    Node: 22.12.0 - ~/.local/state/fnm_multishells/98022_1737052578656/bin/node
    Yarn: 1.22.19 - ~/.local/state/fnm_multishells/98022_1737052578656/bin/yarn
    npm: 10.9.0 - ~/.local/state/fnm_multishells/98022_1737052578656/bin/npm
    pnpm: 8.9.0 - ~/.local/state/fnm_multishells/98022_1737052578656/bin/pnpm
  Browsers:
    Chrome: 131.0.6778.265
    Safari: 18.2
  npmPackages:
    vite: ^5.2.0 => 5.4.11
```

Reproducible in `@vitest/browser` in 2.1.5 and above including 3.0.0 (related commit: https://github.com/vitest-dev/vitest/commit/169028f03abf5e80d77924f4ed9ae6107647c4c0). Not reproducible in 2.1.3 as transformIndexHtml wasn't called in that version.

Reproducible with Playwright and default provider in headless and headed mode in Chrome and Chromium.
