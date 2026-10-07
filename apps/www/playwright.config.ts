import {defineConfig, devices} from '@playwright/test';

/**
 * RFQ user-flow E2E (www rebuild).
 *
 * Two targets, picked by E2E_TARGET:
 *
 *   local   (default) — the dev server on :3003. Playwright starts it, or
 *                       reuses one that is already running.
 *   staging           — the deployed `www-new-release` build at
 *                       staging.pakfactory.com. It sits behind Vercel
 *                       Authentication, so VERCEL_AUTOMATION_BYPASS_SECRET is
 *                       required (Project → Settings → Deployment Protection →
 *                       Protection Bypass for Automation).
 *
 * E2E_BASE_URL overrides either target's URL (e.g. a branch preview).
 *
 * 🔴 Submitting a request is OPT-IN (E2E_SUBMIT=1). A submit goes through the
 * backend API into the staging database and on to the CRM, so by default each
 * flow stops at Review and asserts the Request a quote button is enabled.
 */
const target = process.env.E2E_TARGET === 'staging' ? 'staging' : 'local';

const LOCAL_URL = 'http://localhost:3003';
const STAGING_URL = 'https://staging.pakfactory.com';
const baseURL =
    process.env.E2E_BASE_URL || (target === 'staging' ? STAGING_URL : LOCAL_URL);

const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
if (target === 'staging' && !bypassSecret) {
    throw new Error(
        'E2E_TARGET=staging needs VERCEL_AUTOMATION_BYPASS_SECRET (staging is behind Vercel Authentication).',
    );
}

export default defineConfig({
    testDir: './e2e',
    outputDir: './e2e/.results',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    // The local dev server compiles each route on first hit; keep local runs gentle.
    workers: target === 'local' ? 2 : undefined,
    timeout: target === 'local' ? 180_000 : 90_000,
    expect: {timeout: target === 'local' ? 30_000 : 15_000},
    reporter: process.env.CI
        ? [['list'], ['html', {outputFolder: 'e2e/.report', open: 'never'}]]
        : [['list']],
    use: {
        baseURL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        navigationTimeout: target === 'local' ? 120_000 : 45_000,
        extraHTTPHeaders: bypassSecret
            ? {
                  'x-vercel-protection-bypass': bypassSecret,
                  'x-vercel-set-bypass-cookie': 'true',
              }
            : undefined,
    },
    projects: [
        {name: 'desktop-chrome', use: {...devices['Desktop Chrome'], viewport: {width: 1440, height: 900}}},
    ],
    webServer:
        target === 'local' && !process.env.E2E_BASE_URL
            ? {
                  command: 'pnpm dev',
                  url: LOCAL_URL,
                  reuseExistingServer: true,
                  timeout: 180_000,
              }
            : undefined,
});
