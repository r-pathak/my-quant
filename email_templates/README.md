# Email Templates

This folder contains React Email templates for automated email sending.

## Templates

### `weekly-digest.tsx`

Weekly digest email sent every Friday at market close (4:30 PM ET) containing:

- Portfolio overview with total value and weekly change
- Top 10 holdings analysis with AI-generated buy/sell/hold recommendations
- Research watchlist with up to 10 stocks and analysis
- Consistent branding with the main app (JetBrains Mono font, purple gradients, glassy effects)

## Environment Variables Required

Add these to your Convex environment:

```bash
RESEND_API_KEY=your_resend_api_key
OPENAI_API_KEY=your_openai_api_key
FIRECRAWL_API_KEY=your_firecrawl_api_key
EMAIL_DOMAIN=yourdomain.com  # Or use a service like Resend's default domain
NEXT_PUBLIC_APP_URL=https://my-quant.vercel.app  # Your Vercel domain
```

## Setup Instructions

1. **Configure Resend**:
   - Sign up at [resend.com](https://resend.com)
   - You can use Resend's default domain (no DNS setup needed) or add your own domain
   - Get your API key and add to Convex environment

2. **Configure OpenAI**:
   - Get API key from [OpenAI](https://openai.com)
   - Add to Convex environment

3. **Deploy Cron Job**:
   - The cron job is automatically deployed with your Convex functions
   - It will run every Friday at 4:30 PM ET

4. **Test Email Template**:
   - Use `example.tsx` to preview the email design
   - Run with React Email CLI: `npx react-email dev`

## Cron Job Schedule

The weekly digest is automatically sent via Convex cron job:

- **Frequency**: Every Friday
- **Time**: 4:30 PM ET (21:30 UTC)
- **Target**: All users with holdings or research stocks

## Email Features

- Responsive design optimized for email clients
- Dark theme matching the app
- Logo and branding consistency
- AI-powered stock analysis and recommendations
- News-based insights from the past week
- Portfolio performance metrics
