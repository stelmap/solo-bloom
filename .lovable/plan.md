## Goal
Replace the Lovable-branded Google sign-in screen with one branded for your own app (your logo, your app name, your domain).

## Why the Lovable page appears
Your project currently uses **Lovable Cloud's managed Google OAuth credentials** (shared client ID owned by Lovable). Because the OAuth client belongs to Lovable, Google shows "Sign in to continue to Lovable" and the consent screen brand is Lovable's — not yours. This is the default for every new Lovable Cloud project and requires zero setup, but it cannot be re-branded.

The only way to show **your** brand on Google's consent screen is to create your own Google OAuth client in your own Google Cloud project and plug those credentials into Lovable Cloud.

## What you need to do in Google Cloud Console
1. Create (or open) a project at https://console.cloud.google.com
2. **OAuth consent screen**
   - App name: `Solo Bizz` (this is what users will see)
   - User support email + developer contact
   - App logo: upload your Solo Bizz logo
   - Authorized domains: add `solo-bizz.com` and `lovable.app`
   - Scopes: `userinfo.email`, `userinfo.profile`, `openid`
   - Publish the app (move from "Testing" to "In production") so all Google users can sign in without being on an allowlist
3. **Credentials → Create OAuth Client ID**
   - Application type: **Web application**
   - Name: `Solo Bizz Web`
   - Authorized redirect URI: copy the callback URL shown in Lovable Cloud → Users → Authentication Settings → Google provider section (it will look like `https://rxculneqqaziutulnocs.supabase.co/auth/v1/callback`)
4. Copy the generated **Client ID** and **Client Secret**

## What I'll do in the project
1. Open **Lovable Cloud → Users → Authentication Settings → Sign-in Methods → Google**
2. Toggle off "Use Lovable managed credentials"
3. Paste your Client ID and Client Secret, save
4. No code changes are required — `lovable.auth.signInWithOAuth("google", …)` keeps working, but Google will now show **your** app name and logo on the consent screen, and the intermediate Lovable-branded screen disappears

## Caveats
- The first time you switch, existing Google sessions will need to re-consent
- If you ever delete the OAuth client in Google Cloud, sign-in breaks until new credentials are added
- The Supabase callback URL (`…supabase.co/auth/v1/callback`) is visible to users in the browser address bar during the redirect. If you want that to also show your domain, you'd need a custom auth domain — that's a separate, larger change and not required to remove the Lovable branding

## Deliverable
After you complete the Google Cloud steps and paste the credentials in Cloud → Auth Settings, the Google sign-in popup will show "Sign in to continue to **Solo Bizz**" with your logo, and the Lovable-branded screen will no longer appear.
