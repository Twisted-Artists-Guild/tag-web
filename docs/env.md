# Environment Variables Reference

This document lists all environment variables used by the application. **Do not include actual secrets or passwords in this file.**

---

## NextAuth
- `NEXTAUTH_URL` — Base URL for NextAuth (e.g., http://localhost:3000)
- `NEXTAUTH_SECRET` — Secret for NextAuth session encryption (required)

### Azure Credentials for NextAuth
- `AZURE_AD_CLIENT_ID` — Azure AD Application (client) ID
- `AZURE_AD_CLIENT_SECRET` — Azure AD Application secret
- `AZURE_AD_TENANT_ID` — Azure AD Tenant ID

## Google OAuth
- `GOOGLE_ID` — Google OAuth client ID
- `GOOGLE_SECRET` — Google OAuth client secret

## Stripe
- `STRIPE_PUBLIC_KEY` — Stripe publishable key
- `STRIPE_SECRET_KEY` — Stripe secret key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret

## Postgres Auth DB
- `DATABASE_HOST` — Database host (e.g., tag-dev-flexdb.postgres.database.azure.com)
- `DATABASE_NAME` — Database name
- `DATABASE_USER` — Database user
- `DATABASE_PASSWORD` — Database password

## Azure Storage
- `AZURE_STORAGE_CONNECTION_STRING` — Azure Storage account connection string

## Azure Communication Services
- `AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING` — Azure Communication Services connection string
- `AZURE_COMMUNICATION_SERVICES_SENDER_ADDRESS` — Verified sender address for Azure Communication Email, including NextAuth email sign-in links

## Miscellaneous
- `SHIPPOTOKEN` — (purpose TBD)
- `NEXT_PUBLIC_TAG_API_URL` — API base URL for frontend (e.g., http://localhost:5000/api/)
- `NEXT_PUBLIC_APPINSIGHTS` — Application Insights instrumentation key

---

**Note:**
- All secrets and sensitive values must be set in your local `.env` file or in your deployment environment. Never commit actual secret values to version control.
- If you add new environment variables, update this file and the README accordingly.
