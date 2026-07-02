# Willow Web Solutions

A minimal, white-background portfolio built with Next.js. Perfect for linking from Instagram and LinkedIn.

## Pages

- **Home** — intro and links to your work
- **Projects** — web apps, UI design, and development
- **Photography** — photo gallery (placeholders ready for your images)
- **Art** — painting and sketching gallery
- **Contact** — form that emails you when someone reaches out

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3010](http://localhost:3010). (Port 3010 avoids conflicts with other apps on 3000/3001.)

## Customize placeholders

Edit `lib/site.ts` to update your name, bio, email, LinkedIn, and Instagram links.

Replace project cards in `app/projects/page.tsx`, and swap gallery placeholders on the photography and art pages when you have images.

## Contact form notifications

The contact form sends you an email via [Resend](https://resend.com) when someone submits it.

1. Create a free account at [resend.com](https://resend.com)
2. Copy `.env.example` to `.env.local`
3. Add your `RESEND_API_KEY`, `CONTACT_NOTIFICATION_EMAIL` (your inbox), and `CONTACT_FROM_EMAIL`

For testing, Resend allows `onboarding@resend.dev` as the sender. For production, verify your own domain in Resend.

## Deploy

Deploy to [Vercel](https://vercel.com) (recommended for Next.js). Add the same environment variables in your project settings.
