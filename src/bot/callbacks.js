const walletStorage = require('../services/walletStorage');
const polymarketService = require('../services/polymarketService');
const monitorService = require('../services/monitorService');

function setupBotCallbacks(bot) {
  // Handle callback queries from inline keyboards
  bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = message.chat.id;
    const messageId = message.message_id;

    try {
      if (data.startsWith('stop_track_')) {
        const walletAddress = data.replace('stop_track_', '');
        await handleStopTrack(bot, chatId, walletAddress);
        // Refresh the list if possible, or just notify
        // bot.answerCallbackQuery(callbackQuery.id, { text: 'Stopped tracking' });
        // Maybe go back to list?
        await handleListTrackedWallets(bot, chatId, messageId); 
        return;
      }

      switch (data) {
        case 'connect_wallet':
        case 'back_to_connect':
          await handleConnectWallet(bot, chatId, messageId);
          break;

        case 'enter_wallet':
          await handleEnterWallet(bot, chatId, messageId);
          break;
          
        case 'wallet_help':
          await handleWalletHelp(bot, chatId, messageId);
          break;
          
        case 'track_wallet_menu':
          await handleTrackWalletMenu(bot, chatId, messageId);
          break;

        case 'enter_track_wallet':
          await handleEnterTrackWallet(bot, chatId, messageId);
          break;

        case 'list_tracked_wallets':
          await handleListTrackedWallets(bot, chatId, messageId);
          break;

        case 'view_positions':
          await handleViewPositions(bot, chatId);
          break;


        case 'check_pnl':
          await handleCheckPnl(bot, chatId);
          break;

        case 'browse_markets':
          await handleBrowseMarkets(bot, chatId);
          break;

        case 'get_help':
          await handleGetHelp(bot, chatId, messageId);
          break;

        case 'main_menu':
          await handleMainMenu(bot, chatId, messageId);
          break;
          
        default:
          console.log('Unknown callback data:', data);
      }
      
      // Answer the callback query to remove loading state
      bot.answerCallbackQuery(callbackQuery.id);
      
    } catch (error) {
      console.error('Error handling callback query:', error);
      bot.answerCallbackQuery(callbackQuery.id, {
        text: 'An error occurred. Please try again.',
        show_alert: true
      });
    }
  });
}

async function handleMainMenu(bot, chatId, messageId) {
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

  await bot.editMessageText(welcomeMessage, {
    chat_id: chatId,
    message_id: messageId,
    ...options
  });
}

async function handleConnectWallet(bot, chatId, messageId) {
  const message = `
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
        [{ text: '❓ What is my wallet address?', callback_data: 'wallet_help' }],
        [{ text: '🔙 Main Menu', callback_data: 'main_menu' }]
      ]
    }
  };
  
  await bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    ...options
  });
}

async function handleEnterWallet(bot, chatId, messageId) {
  // Set user state to expect wallet address input
  walletStorage.setUserState(chatId, 'awaiting_wallet');
  
  const message = `
📝 *Enter Your Wallet Address*

Please send me your Ethereum/Polygon wallet address.

*Format:* 0x followed by 40 hexadecimal characters
*Example:* 0x742d35Cc6634C0532925a3b8D4C9db96590c6C87

⚠️ *Important:*
• Only send your PUBLIC wallet address
• Never share private keys or seed phrases
• Make sure it's the address you use with Polymarket

Just type or paste your wallet address in the next message.
  `;
  
  const options = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Back to Connect Options', callback_data: 'back_to_connect' }]
      ]
    }
  };
  
  await bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    ...options
  });
}

async function handleWalletHelp(bot, chatId, messageId) {
  const message = `
❓ *What is my wallet address?*

Your wallet address is your public Ethereum/Polygon address that you use with Polymarket.

*Where to find it:*

🦊 *MetaMask:*
1. Open MetaMask extension
2. Click on your account name at the top
3. Your address will be displayed (starts with 0x)
4. Click to copy

🔗 *Other wallets:*
• Look for "Receive" or "Account" section
• Your address should start with 0x
• It's safe to share (it's public information)

💡 *On Polymarket:*
• Go to your profile/account section
• Your connected wallet address should be visible

*Example format:*
0x742d35Cc6634C0532925a3b8D4C9db96590c6C87

Remember: This is your PUBLIC address, not your private key!
  `;
  
  const options = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📝 I found my address', callback_data: 'enter_wallet' }],
        [{ text: '🔙 Back to Connect Options', callback_data: 'back_to_connect' }]
      ]
    }
  };
  
  await bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    ...options
  });
}

async function handleTrackWalletMenu(bot, chatId, messageId) {
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
        [{ text: '📋 List Tracked Wallets', callback_data: 'list_tracked_wallets' }],
        [{ text: '🔙 Main Menu', callback_data: 'main_menu' }]
      ]
    }
  };
  
  await bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    ...options
  });
}

async function handleEnterTrackWallet(bot, chatId, messageId) {
  walletStorage.setUserState(chatId, 'awaiting_track_wallet');
  
  const message = `
📝 *Enter Wallet to Track*

Please send the wallet address you want to monitor.

*Example:* 0x742d35Cc6634C0532925a3b8D4C9db96590c6C87

You will receive alerts for new transactions made by this wallet.
  `;
  
  const options = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Back', callback_data: 'track_wallet_menu' }]
      ]
    }
  };
  
  await bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    ...options
  });
}

async function handleListTrackedWallets(bot, chatId, messageId) {
  const trackedWallets = monitorService.getTrackedWallets(chatId);
  
  if (trackedWallets.length === 0) {
    const message = `
📋 *Tracked Wallets*

You are not tracking any wallets yet.

Use the "Enter Wallet to Track" button to start monitoring a wallet.
    `;
    
    const options = {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📝 Enter Wallet to Track', callback_data: 'enter_track_wallet' }],
          [{ text: '🔙 Back', callback_data: 'track_wallet_menu' }]
        ]
      }
    };
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      ...options
    });
    return;
  }
  
  let message = '📋 *Tracked Wallets*\n\nSelect a wallet to stop tracking:\n\n';
  
  const keyboard = trackedWallets.map(wallet => ([
    { text: `🛑 Stop ${wallet.slice(0, 6)}...${wallet.slice(-4)}`, callback_data: `stop_track_${wallet}` }
  ]));
  
  keyboard.push([{ text: '🔙 Back', callback_data: 'track_wallet_menu' }]);
  
  const options = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: keyboard
    }
  };
  
  await bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    ...options
  });
}

async function handleStopTrack(bot, chatId, walletAddress) {
  if (monitorService.untrackWallet(chatId, walletAddress)) {
    await bot.sendMessage(chatId, `✅ *Stopped Tracking*\n\nRemoved wallet: \`${walletAddress}\``, { parse_mode: 'Markdown' });
  } else {
    await bot.sendMessage(chatId, `❌ *Error*\n\nYou are not tracking this wallet.`, { parse_mode: 'Markdown' });
  }
}

async function handleViewPositions(bot, chatId) {
  try {
    const walletAddress = walletStorage.getWallet(chatId);
    
    if (!walletAddress) {
      bot.sendMessage(chatId, '❌ No wallet connected. Use /connect to link your wallet first.', {
        reply_markup: {
          inline_keyboard: [[{ text: '🔗 Connect Wallet', callback_data: 'connect_wallet' }]]
        }
      });
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
}

async function handleCheckPnl(bot, chatId) {
  try {
    const walletAddress = walletStorage.getWallet(chatId);
    
    if (!walletAddress) {
      bot.sendMessage(chatId, '❌ No wallet connected. Use /connect to link your wallet first.', {
        reply_markup: {
          inline_keyboard: [[{ text: '🔗 Connect Wallet', callback_data: 'connect_wallet' }]]
        }
      });
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
}

async function handleBrowseMarkets(bot, chatId) {
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
}

async function handleGetHelp(bot, chatId, messageId) {
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
  
  await bot.editMessageText(helpMessage, {
    chat_id: chatId,
    message_id: messageId,
    ...options
  });
}

module.exports = { setupBotCallbacks };
