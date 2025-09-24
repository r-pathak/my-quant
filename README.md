# MyQuant - AI-Powered Portfolio Management Platform

A comprehensive, modern portfolio management platform built with Next.js, Convex, and AI integrations. Track your investments, get real-time market data, research stocks with AI, and receive personalized insights through voice interactions.

![MyQuant Dashboard](https://img.shields.io/badge/Status-Active-green) ![Next.js](https://img.shields.io/badge/Next.js-15.5.3-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![Convex](https://img.shields.io/badge/Convex-Backend-orange)

## 🚀 Features

### 📊 **Portfolio Management**
- **Real-time Portfolio Tracking**: Live price updates for all your holdings
- **Interactive Dashboard**: Beautiful, responsive portfolio overview with charts
- **P&L Analytics**: Track daily and all-time profit/loss with percentage changes
- **Holdings Management**: Add, edit, and manage your stock positions
- **Pie Chart Visualization**: Visual breakdown of your portfolio allocation
- **Auto-refresh**: Configurable automatic price updates every 5 minutes

### 🤖 **AI-Powered Research**
- **Stock Research Engine**: Deep dive into any stock with AI-powered analysis
- **News Aggregation**: Latest news and market updates for your holdings
- **Firecrawl Integration**: Web scraping for real-time market intelligence
- **Research Reports**: Comprehensive analysis with market impact insights

### 🎙️ **Voice Assistant (Vapi Integration)**
- **In-browser Voice Calls**: Talk to your AI portfolio assistant
- **Personalized Insights**: Assistant knows your specific holdings
- **Research on Demand**: Ask for research on any of your stocks
- **Conversational Interface**: Natural language interaction
- **Real-time Controls**: Mute, unmute, and end call controls

### 📈 **Market Data & Analytics**
- **Real-time Price Updates**: Live stock prices and daily changes
- **Portfolio Metrics**: Total value, P&L, position sizing
- **Performance Tracking**: Daily and historical performance analysis
- **Market News**: Curated news feed for your holdings

### 🔐 **Authentication & Security**
- **Google OAuth**: Secure authentication with Google accounts
- **User Sessions**: Persistent login with session management
- **Data Privacy**: Your portfolio data is private and secure

### 📱 **Modern UI/UX**
- **Responsive Design**: Works perfectly on desktop and mobile
- **Dark Theme**: Beautiful dark mode interface
- **Smooth Animations**: Polished interactions and transitions
- **Accessibility**: Built with accessibility best practices

## 🛠 Tech Stack

### **Frontend**
- **Next.js 15.5.3** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Recharts** - Interactive charts and visualizations
- **Radix UI** - Accessible component primitives

### **Backend & Database**
- **Convex** - Real-time backend with automatic sync
- **Convex Auth** - Authentication system
- **Cron Jobs** - Automated tasks and price updates

### **AI & Integrations**
- **Vapi** - Voice AI assistant
- **OpenAI GPT-4o** - AI-powered research and analysis
- **Firecrawl** - Web scraping for market data
- **Real-time APIs** - Stock price and market data

### **Development & Deployment**
- **ESLint** - Code linting and formatting
- **TypeScript** - Static type checking
- **Vercel** - Deployment and hosting

## 🚀 Getting Started

### Prerequisites

1. **Node.js 18+** installed
2. **Convex account** - [convex.dev](https://convex.dev)
3. **Vapi account** - [vapi.ai](https://vapi.ai)
4. **Firecrawl account** - [firecrawl.dev](https://firecrawl.dev)
5. **OpenAI API key** - [openai.com](https://openai.com)
6. **Google OAuth credentials** - [console.cloud.google.com](https://console.cloud.google.com)

### Environment Setup

#### 1. Frontend Environment Variables
Create a `.env.local` file in the root directory:

```bash
# Convex Configuration
CONVEX_DEPLOYMENT=your_convex_deployment
NEXT_PUBLIC_CONVEX_URL=your_convex_url

# Vapi Configuration
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key_here
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_vapi_assistant_id
```

Note: Your Vapi assistnat should have an MCP tool which is able to call the firecrawl remote MCP server; this is to give the assistant the ability to search the web when provided with the user holdings

#### 2. Convex Environment Variables
Set up your backend environment variables in the Convex dashboard:

```bash
# Authentication
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
BETTER_AUTH_SECRET=your_super_secret_key

# AI Services
OPENAI_API_KEY=your_openai_api_key
FIRECRAWL_API_KEY=your_firecrawl_api_key

# Email (Optional)
RESEND_API_KEY=your_resend_api_key
EMAIL_DOMAIN=your_email_domain
```

### Installation & Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd my-quant
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Set up Convex**
```bash
npx convex dev
```

4. **Run the development server**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. **Open the application**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage Guide

### Getting Started
1. **Sign in** with your Google account
2. **Add your first holding** using the "add holding" button
3. **Watch real-time updates** as prices refresh automatically
4. **Explore research** by clicking on any stock in your portfolio

### Voice Assistant
1. **Click "myquant update"** to start a voice call
2. **Grant microphone permissions** when prompted
3. **Ask about your holdings** - "Tell me about NVDA"
4. **Request research** - "Can you research my top holding?"
5. **Use call controls** to mute/unmute or end the call

### Portfolio Management
- **Add Holdings**: Click "add holding" and enter ticker, shares, and purchase price
- **View Analytics**: See your P&L, daily changes, and portfolio allocation
- **Track Performance**: Monitor real-time price updates and performance metrics
- **Research Stocks**: Click any holding to dive deep into research and news

## 🏗 Architecture

### Data Flow
```
User Interface (Next.js) 
    ↓
Convex Backend (Real-time sync)
    ↓
External APIs (Stock prices, AI services)
```

### Key Components
- **Portfolio Dashboard** - Main interface with holdings and analytics
- **Research Engine** - AI-powered stock analysis
- **Voice Assistant** - Vapi integration for voice interactions
- **Price Service** - Real-time stock price updates
- **Authentication** - Google OAuth with Convex Auth

## 🔧 Configuration

### Convex Functions
- **Holdings Management** - CRUD operations for portfolio
- **Price Updates** - Automated price fetching and updates
- **Research Actions** - AI-powered stock research
- **News Aggregation** - Market news and updates
- **Cron Jobs** - Scheduled tasks for data updates

### API Integrations
- **Stock Prices** - Real-time market data
- **Vapi** - Voice AI assistant
- **Firecrawl** - Web scraping for research
- **OpenAI** - AI analysis and insights

## 🚀 Deployment

### Vercel Deployment
1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy** - Override the deployment command with: npx convex deploy --cmd 'npm run build'. Set the environment variable 'CONVEX_DEPLOY_KEY' in Vercel from the Convex dashboard

### Convex Deployment
1. **Run** `npx convex deploy`
2. **Update environment variables** for production
3. **Verify** all functions are deployed correctly

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Convex** - For the amazing real-time backend
- **Vapi** - For voice AI capabilities
- **Next.js** - For the incredible React framework
- **Vercel** - For seamless deployment
- **OpenAI** - For AI-powered insights

---

Built with ❤️ for modern portfolio management
