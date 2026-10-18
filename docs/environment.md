# Site environment

For local development, copy `.env.example` to `.env`, fill in
`VITE_POSTHOG_PROJECT_TOKEN` (public project key) and `VITE_POSTHOG_HOST` (ingestion host)
from your PostHog project settings. Restart `npm run dev` after editing.
The host must match your project's region or self-hosted installation.
Local `.env` files are ignored by Git.

Read the values in the tracker integration through
`import.meta.env.VITE_POSTHOG_PROJECT_TOKEN` and `import.meta.env.VITE_POSTHOG_HOST`.
These settings do not initialize PostHog or send events by themselves.

## Deployment

In GitHub repository **Settings → Secrets and variables → Actions → Variables**,
add repository variables `VITE_POSTHOG_PROJECT_TOKEN` and `VITE_POSTHOG_HOST` with the
production values. No additional GitHub secrets are required.

The workflow passes these variables to the build on the existing self-hosted
`anmi-hub` runner on the VPS. Missing or empty values stop deployment.
The existing rsync step publishes the resulting `dist/` directory.

Vite embeds referenced `VITE_*` values into browser JavaScript during the build.
Do not store personal API keys or private credentials in these variables.
The deployed assets contain the settings; `.env` should not be copied into
the public website directory.

After updating GitHub variables, rerun **Deploy ANMI Hub** manually or push to
`main`. Updating a `.env` file after building does not change deployed assets.
