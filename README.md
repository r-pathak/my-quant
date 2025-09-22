# MyQuant - AI-Powered Portfolio Management

This is a [Next.js](https://nextjs.org) project with AI-powered portfolio management features including voice calls with a stock assistant.

## Features

- **Portfolio Management**: Track your stock holdings with real-time price updates
- **AI Voice Assistant**: Get instant market updates via voice calls using Vapi
- **Research Tools**: Deep dive into stock research and news
- **Real-time Data**: Live price updates and portfolio analytics

## Getting Started

### Prerequisites

1. Node.js 18+ installed
2. A Vapi account and public key

### Environment Setup

1. **Frontend Environment Variables** - Create a `.env.local` file in the root directory:
```bash
# Convex Configuration (already set up)
CONVEX_DEPLOYMENT=dev:fastidious-gnu-222
NEXT_PUBLIC_CONVEX_URL=https://fastidious-gnu-222.convex.cloud
```

2. **Convex Environment Variables** - Set up your Vapi private key in Convex:
   - Go to [Convex Dashboard](https://dashboard.convex.dev/d/fastidious-gnu-222)
   - Navigate to Settings > Environment Variables
   - Add `VAPI_API_KEY` with your Vapi private key from [vapi.ai](https://vapi.ai)

### Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Voice Assistant Setup

To use the **in-browser voice assistant** feature:

1. Sign up for a Vapi account at [vapi.ai](https://vapi.ai)
2. Get your **private API key** from the Vapi dashboard
3. Add it to your Convex environment variables as `VAPI_API_KEY` (see Environment Setup above)
4. Click the "myquant update" button in the portfolio view to start an **in-browser voice call**

**What happens:**
- Voice call starts directly in your browser (no phone calls)
- Assistant provides personalized market updates based on your current holdings
- You can mute/unmute and end the call using the on-screen controls
- All calls are handled securely through your Convex backend proxy

**Note:** This creates in-browser voice calls, not outbound phone calls. The assistant will speak through your computer's speakers and listen through your microphone.

**Architecture:** The app uses a secure proxy server pattern where:
- Frontend sends custom data (userId, assistantType, holdings) to Convex proxy
- Convex proxy uses your private Vapi API key to create calls
- All sensitive data and API keys stay on the server side

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
