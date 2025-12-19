# Polygram Bot 🎯

A Telegram bot that connects with Polymarket to provide real-time wallet tracking, position monitoring, and PNL calculations.

## Features 🚀

- **Wallet Integration**: Connect your Polymarket wallet securely
- **Position Tracking**: View all your active positions in real-time
- **PNL Monitoring**: Track profit and loss across all positions
- **Market Data**: Browse active Polymarket markets
- **Real-time Updates**: Get live data from Polymarket APIs

## Commands 📋

- `/start` - Welcome message and bot overview
- `/help` - Detailed help information
- `/connect` - Connect your Polymarket wallet
- `/positions` - View your current positions
- `/pnl` - Check your profit and loss
- `/markets` - Browse available markets
- `/status` - Check bot and connection status

## Setup 🛠️

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Telegram Bot Token (from @BotFather)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd polygram
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your configuration:
   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   POLYMARKET_API_URL=https://gamma-api.polymarket.com
   POLYMARKET_CLOB_API_URL=https://clob.polymarket.com
   PORT=3000
   NODE_ENV=development
   ```

4. **Start the bot**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## Getting a Telegram Bot Token 🤖

1. Open Telegram and search for @BotFather
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Copy the bot token and add it to your `.env` file

## How to Use 📱

1. **Start the bot**: Send `/start` to your bot in Telegram
2. **Connect wallet**: Use `/connect` and follow the instructions
3. **View positions**: Use `/positions` to see your active positions
4. **Check PNL**: Use `/pnl` to see your profit/loss summary
5. **Browse markets**: Use `/markets` to see active Polymarket markets

## API Integration 🔌

The bot integrates with:
- **Polymarket Gamma API**: For market data and general information
- **Polymarket CLOB API**: For user positions and trading data

## Security 🔒

- Only public wallet addresses are required
- No private keys or seed phrases are stored
- All data is read-only from public blockchain sources
- Environment variables for sensitive configuration

## Project Structure 📁

```
polygram/
├── src/
│   ├── bot/
│   │   ├── commands.js      # Telegram bot commands
│   │   └── callbacks.js     # Inline keyboard handlers
│   ├── services/
│   │   └── polymarketService.js  # Polymarket API integration
│   └── index.js             # Main application entry point
├── .env.example             # Environment variables template
├── .gitignore              # Git ignore rules
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

### Available Scripts

- `npm start` - Start the bot in production mode
- `npm run dev` - Start with nodemon for development
- `npm test` - Run tests (when implemented)

### Adding New Features

1. **New Commands**: Add to `src/bot/commands.js`
2. **API Integration**: Extend `src/services/polymarketService.js`
3. **Callbacks**: Add to `src/bot/callbacks.js`