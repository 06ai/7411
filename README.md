# Baggee — Luxury Handbag Price Guide

A Next.js app for tracking luxury handbag prices, built with Supabase.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Edit `.env.local` and add your Supabase anon key:

```
NEXT_PUBLIC_SUPABASE_URL=https://kcljmrldynczlvcqlzgv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Get your anon key from: **Supabase Dashboard → Project Settings → API → anon public**

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your site!

## Project Structure

```
baggee-app/
├── app/
│   ├── globals.css      # Global styles + Tailwind
│   ├── layout.tsx       # Main layout with nav/footer
│   ├── page.tsx         # Home page
│   ├── browse/
│   │   └── page.tsx     # Browse/search bags
│   ├── bag/
│   │   └── [id]/
│   │       └── page.tsx # Individual bag detail
│   └── trends/
│       └── page.tsx     # Price charts
├── lib/
│   └── supabase.ts      # Supabase client + types
├── .env.local           # Environment variables
├── tailwind.config.ts   # Custom colors/fonts
└── package.json
```

## Deploying to Vercel

1. Push this code to your GitHub repo
2. Go to [vercel.com](https://vercel.com)
3. Import your repo
4. Add environment variables in Vercel dashboard
5. Deploy!

## Next Steps

- [ ] Add user authentication (Supabase Auth)
- [ ] Build the portfolio/closet feature
- [ ] Add image upload for bags
- [ ] Create admin panel for data entry
- [ ] Build the fair value calculator
