# Resend: lead confirmation emails

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | Yes | API key from [Resend Dashboard → API Keys](https://resend.com/api-keys) |
| `RESEND_FROM_EMAIL` | **Yes for production** | Sender, e.g. `Rayan Yusuf <hello@yourdomain.com>` — domain must be **verified** in Resend |

Add both to **`.env.local`** locally and to your host (**Vercel → Settings → Environment Variables**). Redeploy after changing env on Vercel.

## Why emails might not arrive

1. **No verified domain**  
   The default `onboarding@resend.dev` is for testing only. Resend often **only delivers** to the email address you used to **sign up for Resend**, not to random Gmail addresses.

2. **Fix:** In Resend, add and verify your domain (DNS), then set:
   ```env
   RESEND_FROM_EMAIL=Rayan Yusuf <noreply@yourdomain.com>
   ```

3. **Wrong env on production**  
   If `RESEND_API_KEY` is only in `.env.local`, production won’t have it—add it in the hosting dashboard.

4. **Spam folder**  
   Check junk/spam for the first sends.

## Debugging

- Submit the form again and read the **browser console** — failed sends log `[lead] confirmation email failed: ...`
- Read **server logs** (terminal in dev, or Vercel logs) for `[leads/notify] Resend error:`
