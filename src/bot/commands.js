const polymarketService = require('../services/polymarketService');
const walletStorage = require('../services/walletStorage');
const monitorService = require('../services/monitorService');

function setupBotCommands(bot) {
  // Start command
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `
🎯 *Welcome to Polygram Bot!*

I'm your Polymarket companion bot. I can help you:

📊 *View your positions* - Get real-time data on your Polymarket positions
💰 *Check PNL* - See your profit and loss across all positions
📈 *Market charts* - View price charts and market data
🔗 *Connect wallet* - Link your wallet to access your data
👀 *Track wallet* - Monitor specific wallets for real-time transactions

*Choose an option below:*
    `;
    
    const options = {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔗 Connect Wallet', callback_data: 'connect_wallet' },
            { text: '👀 Track Wallet', callback_data: 'track_wallet_menu' }
          ],
          [
            { text: '📊 Positions', callback_data: 'view_positions' },
            { text: '💰 Check PNL', callback_data: 'check_pnl' }
          ],
          [
            { text: '📈 Markets', callback_data: 'browse_markets' },
            { text: 'ℹ️ Help', callback_data: 'get_help' }
          ]
        ]
      }
    };

    bot.sendMessage(chatId, welcomeMessage, options);
  });

  // Help command
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
🆘 *Polygram Bot Help*

*Commands:*
• /start - Welcome message and main menu
• /help - This help message
• /connect - Connect your Polymarket wallet
• /track - Track a specific wallet for real-time alerts
• /positions - View your current positions
• /pnl - Check profit and loss
• /markets - Browse markets
• /status - Check connection status
• /stop_track - Stop tracking a wallet

*How to connect your wallet:*
1. Use /connect command or button
2. Follow the instructions to link your wallet
3. Once connected, you can view positions and PNL

*How to track a wallet:*
1. Use /track command or button
2. Enter the wallet address you want to monitor
3. Receive real-time alerts for transactions

*Features:*
📊 Real-time position tracking
💰 PNL calculations
📈 Market data and charts
🔔 Real-time transaction alerts for tracked wallets

*Need more help?*
Contact support or check our documentation.
    `;
    
    const options = {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Main Menu', callback_data: 'main_menu' }]
        ]
      }
    };
    
    bot.sendMessage(chatId, helpMessage, options);
  });

  // Track wallet command
  bot.onText(/\/track/, async (msg) => {
    const chatId = msg.chat.id;
    const args = msg.text.split(' ');
    
    if (args.length > 1) {
      // User provided wallet address directly: /track 0x...
      const walletAddress = args[1];
      if (walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        monitorService.trackWallet(chatId, walletAddress);
        bot.sendMessage(chatId, `✅ *Tracking Started*\n\nNow monitoring wallet: \`${walletAddress}\`\n\nYou will receive alerts for new transactions.`, { parse_mode: 'Markdown' });
      } else {
        bot.sendMessage(chatId, `❌ *Invalid Wallet Address*\n\nPlease provide a valid Ethereum address starting with 0x.`, { parse_mode: 'Markdown' });
      }
    } else {
      // Show menu to enter wallet
      const message = `
👀 *Track Wallet*

Enter the wallet address you want to monitor for real-time transactions.

*Format:* 0x followed by 40 hexadecimal characters
      `;
      
      const options = {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📝 Enter Wallet to Track', callback_data: 'enter_track_wallet' }],
            [{ text: '� List Tracked Wallets', callback_data: 'list_tracked_wallets' }],
            [{ text: '� Main Menu', callback_data: 'main_menu' }]
          ]
        }
      };
      
      bot.sendMessage(chatId, message, options);
    }
  });

  // Stop Track command
  bot.onText(/\/stop_track/, (msg) => {
    const chatId = msg.chat.id;
    const args = msg.text.split(' ');
    
    if (args.length > 1) {
      const walletAddress = args[1];
      if (monitorService.untrackWallet(chatId, walletAddress)) {
        bot.sendMessage(chatId, `✅ *Stopped Tracking*\n\nRemoved wallet: \`${walletAddress}\``, { parse_mode: 'Markdown' });
      } else {
        bot.sendMessage(chatId, `❌ *Error*\n\nYou are not tracking this wallet.`, { parse_mode: 'Markdown' });
      }
    } else {
      // List wallets to stop
      const trackedWallets = monitorService.getTrackedWallets(chatId);
      
      if (trackedWallets.length === 0) {
        bot.sendMessage(chatId, '❌ You are not tracking any wallets.');
        return;
      }
      
      const keyboard = trackedWallets.map(wallet => ([
        { text: `🛑 Stop ${wallet.slice(0, 6)}...${wallet.slice(-4)}`, callback_data: `stop_track_${wallet}` }
      ]));
      
      keyboard.push([{ text: '🔙 Back', callback_data: 'track_wallet_menu' }]);
      
      bot.sendMessage(chatId, '🛑 *Select a wallet to stop tracking:*', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    }
  });

  // List Tracking command
  bot.onText(/\/tracking/, (msg) => {
    const chatId = msg.chat.id;
    const trackedWallets = monitorService.getTrackedWallets(chatId);
    
    if (trackedWallets.length === 0) {
      bot.sendMessage(chatId, 'You are not tracking any wallets.');
      return;
    }
    
    let message = '👀 *Currently Tracked Wallets:*\n\n';
    trackedWallets.forEach((wallet, index) => {
      message += `${index + 1}. \`${wallet}\`\n`;
    });
    
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  });

  // Connect wallet command
  bot.onText(/\/connect/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
      const connectMessage = `
🔗 *Connect Your Polymarket Wallet*

To connect your wallet, I need your wallet address.

*Option 1: Send your wallet address*
Simply send me your Ethereum/Polygon wallet address that you use with Polymarket.

*Option 2: Use inline keyboard*
Click the button below to enter your wallet address.

⚠️ *Security Note:*
• Only your public wallet address is needed
• Never share your private keys or seed phrase
• This bot only reads public blockchain data
      `;
      
      const options = {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📝 Enter Wallet Address', callback_data: 'enter_wallet' }],
            [{ text: '❓ What is my wallet address?', callback_data: 'wallet_help' }]
          ]
        }
      };
      
      bot.sendMessage(chatId, connectMessage, options);
    } catch (error) {
      console.error('Error in connect command:', error);
      bot.sendMessage(chatId, '❌ Error setting up wallet connection. Please try again.');
    }
  });

  // Positions command
  bot.onText(/\/positions/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
      // TODO: Get user's connected wallet from database/storage
      const walletAddress = getUserWallet(chatId);
      
      if (!walletAddress) {
        bot.sendMessage(chatId, '❌ No wallet connected. Use /connect to link your wallet first.');
        return;
      }
      
      bot.sendMessage(chatId, '🔄 Fetching your positions...');
      
      const positions = await polymarketService.getUserPositions(walletAddress);
      
      if (!positions || positions.length === 0) {
        bot.sendMessage(chatId, '📊 No active positions found.');
        return;
      }
      
      let positionsMessage = '📊 *Your Polymarket Positions:*\n\n';
      
      positions.forEach((position, index) => {
        positionsMessage += `${index + 1}. *${position.market}*\n`;
        positionsMessage += `   Position: ${position.side} ${position.amount}\n`;
        positionsMessage += `   Current Price: $${position.currentPrice}\n`;
        positionsMessage += `   PNL: ${position.pnl >= 0 ? '🟢' : '🔴'} $${position.pnl}\n\n`;
      });
      
      bot.sendMessage(chatId, positionsMessage, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Error fetching positions:', error);
      bot.sendMessage(chatId, '❌ Error fetching positions. Please try again later.');
    }
  });

  // PNL command
  bot.onText(/\/pnl/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
      const walletAddress = getUserWallet(chatId);
      
      if (!walletAddress) {
        bot.sendMessage(chatId, '❌ No wallet connected. Use /connect to link your wallet first.');
        return;
      }
      
      bot.sendMessage(chatId, '💰 Calculating your PNL...');
      
      const pnlData = await polymarketService.getUserPNL(walletAddress);
      
      const pnlMessage = `
💰 *Your Polymarket PNL Summary*

📈 *Total PNL:* ${pnlData.totalPnl >= 0 ? '🟢' : '🔴'} $${pnlData.totalPnl}
📊 *Total Volume:* $${pnlData.totalVolume}
🎯 *Win Rate:* ${pnlData.winRate}%
📅 *Active Since:* ${pnlData.activeSince}

*Breakdown:*
• Realized PNL: $${pnlData.realizedPnl}
• Unrealized PNL: $${pnlData.unrealizedPnl}
• Total Trades: ${pnlData.totalTrades}
      `;
      
      bot.sendMessage(chatId, pnlMessage, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Error fetching PNL:', error);
      bot.sendMessage(chatId, '❌ Error calculating PNL. Please try again later.');
    }
  });

  // Markets command
  bot.onText(/\/markets/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
      bot.sendMessage(chatId, '🔄 Fetching market data...');
      
      const markets = await polymarketService.getActiveMarkets();
      
      let marketsMessage = '🏪 *Active Polymarket Markets:*\n\n';
      
      markets.slice(0, 10).forEach((market, index) => {
        marketsMessage += `${index + 1}. *${market.question}*\n`;
        marketsMessage += `   Volume: $${market.volume}\n`;
        marketsMessage += `   Yes: ${market.yesPrice}¢ | No: ${market.noPrice}¢\n\n`;
      });
      
      marketsMessage += '\n💡 Use /connect to track your positions in these markets!';
      
      bot.sendMessage(chatId, marketsMessage, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Error fetching markets:', error);
      bot.sendMessage(chatId, '❌ Error fetching market data. Please try again later.');
    }
  });

  // Status command
  bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    const walletAddress = getUserWallet(chatId);
    
    const statusMessage = `
🔍 *Bot Status*

🤖 *Bot:* ✅ Online and operational
🔗 *Wallet:* ${walletAddress ? '✅ Connected' : '❌ Not connected'}
🌐 *Polymarket API:* ✅ Connected
📊 *Data:* ✅ Real-time updates active

${walletAddress ? `📍 *Connected Wallet:* \`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}\`` : ''}

${!walletAddress ? '💡 Use /connect to link your wallet and access all features!' : ''}
    `;
    
    bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
  });

  // Monitor Whale Command
  bot.onText(/\/monitor_whale/, (msg) => {
    const chatId = msg.chat.id;
    monitorService.addSubscriber(chatId);
    bot.sendMessage(chatId, '🐋 *Whale Monitoring Started*\n\nYou will receive alerts for new transactions from the target wallet.', { parse_mode: 'Markdown' });
  });

  // Stop Monitor Command
  bot.onText(/\/stop_monitor/, (msg) => {
    const chatId = msg.chat.id;
    monitorService.removeSubscriber(chatId);
    bot.sendMessage(chatId, '🔕 *Monitoring Stopped*', { parse_mode: 'Markdown' });
  });

  // Handle text messages (for wallet address input)
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    // Skip if it's a command (starts with /)
    if (text && text.startsWith('/')) {
      return;
    }
    
    // Check if user is in wallet input state
    const userState = walletStorage.getUserState(chatId);
    
    if (userState === 'awaiting_wallet') {
      // User is expected to send wallet address
      await handleWalletAddress(bot, chatId, text.trim());
    } else if (userState === 'awaiting_track_wallet') {
      // User is expected to send wallet address to track
      const walletAddress = text.trim();
      if (walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        monitorService.trackWallet(chatId, walletAddress);
        walletStorage.clearUserState(chatId);
        bot.sendMessage(chatId, `✅ *Tracking Started*\n\nNow monitoring wallet: \`${walletAddress}\`\n\nYou will receive alerts for new transactions.`, { parse_mode: 'Markdown' });
      } else {
        bot.sendMessage(chatId, `❌ *Invalid Wallet Address*\n\nPlease provide a valid Ethereum address starting with 0x.`);
      }
    } else if (text && text.match(/^0x[a-fA-F0-9]{40}$/)) {
      // User sent what looks like a wallet address without being prompted
      bot.sendMessage(chatId, `🔗 I detected a wallet address! 

Would you like to connect this wallet?

Use /connect to start the connection process, or send the address again if you want me to connect it directly.`);
    }
  });
}

// Helper function to get user's wallet
function getUserWallet(chatId) {
  return walletStorage.getWallet(chatId);
}

// Helper function to handle wallet address input
async function handleWalletAddress(bot, chatId, walletAddress) {
  try {
    bot.sendMessage(chatId, '🔄 Verifying wallet address...');
    
    // Validate wallet address format
    if (!polymarketService.isValidWalletAddress(walletAddress)) {
      bot.sendMessage(chatId, `❌ *Invalid wallet address format*

Please make sure your address:
• Starts with 0x
• Is exactly 42 characters long
• Contains only hexadecimal characters (0-9, a-f, A-F)

*Example:* 0x742d35Cc6634C0532925a3b8D4C9db96590c6C87

Please try again with a valid address.`, { parse_mode: 'Markdown' });
      return;
    }
    
    // Save wallet address
    walletStorage.saveWallet(chatId, walletAddress);
    walletStorage.clearUserState(chatId);
    
    const confirmMessage = `
✅ *Wallet Connected Successfully!*

📍 *Address:* \`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}\`

You can now use:
• /positions - View your positions
• /pnl - Check your profit/loss
• /status - Check connection status

🔄 Fetching your initial data...
    `;
    
    bot.sendMessage(chatId, confirmMessage, { parse_mode: 'Markdown' });
    
    // Try to fetch initial position data
    try {
      const positions = await polymarketService.getUserPositions(walletAddress);
      if (positions.length > 0) {
        bot.sendMessage(chatId, `🎉 Found ${positions.length} position(s) in your wallet! Use /positions to view them.`);
      } else {
        bot.sendMessage(chatId, `📊 No active positions found. Start trading on Polymarket to see your positions here!`);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      bot.sendMessage(chatId, `⚠️ Wallet connected but couldn't fetch initial data. You can still use all commands.`);
    }
    
  } catch (error) {
    console.error('Error handling wallet address:', error);
    bot.sendMessage(chatId, '❌ Error connecting wallet. Please try again.');
  }
}

module.exports = { setupBotCommands };