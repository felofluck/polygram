const polymarketService = require('./polymarketService');

class MonitorService {
  constructor() {
    // Map<chatId, Set<walletAddress>>
    this.trackedWallets = new Map();
    // Map<walletAddress, { lastTimestamp: number, processedSignatures: Set<string> }>
    this.walletStates = new Map();
    this.isMonitoring = false;
    this.checkInterval = 1000; // 1 second for faster alerts
    this.service = polymarketService;
  }

  trackWallet(chatId, walletAddress) {
    const normalizedWallet = walletAddress.toLowerCase();
    
    if (!this.trackedWallets.has(chatId)) {
      this.trackedWallets.set(chatId, new Set());
    }
    
    this.trackedWallets.get(chatId).add(normalizedWallet);
    console.log(`Added tracking for wallet ${normalizedWallet} by user ${chatId}`);
    
    // Initialize state for this wallet if not already tracked
    if (!this.walletStates.has(normalizedWallet)) {
      this.initializeWalletState(normalizedWallet);
    }
    
    return true;
  }

  // ... (untrackWallet and getTrackedWallets remain the same) ...
  untrackWallet(chatId, walletAddress) {
    const normalizedWallet = walletAddress.toLowerCase();
    
    if (this.trackedWallets.has(chatId)) {
      this.trackedWallets.get(chatId).delete(normalizedWallet);
      console.log(`Removed tracking for wallet ${normalizedWallet} by user ${chatId}`);
      return true;
    }
    return false;
  }
  
  getTrackedWallets(chatId) {
    if (this.trackedWallets.has(chatId)) {
      return Array.from(this.trackedWallets.get(chatId));
    }
    return [];
  }

  start(bot) {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log(`Starting monitoring service`);
    
    this.monitorLoop(bot);
  }

  async initializeWalletState(walletAddress) {
    try {
      const trades = await this.service.getUserTrades(walletAddress);
      const state = {
        lastTimestamp: 0,
        processedSignatures: new Set()
      };

      if (trades.length > 0) {
        // Sort by timestamp descending to get the latest
        trades.sort((a, b) => b.timestamp - a.timestamp);
        
        // We set the last timestamp to the latest trade's timestamp
        // And mark recent trades as processed to avoid duplicates if they have same timestamp
        state.lastTimestamp = trades[0].timestamp.getTime();
        
        // Add signatures of all trades with the same latest timestamp to processed set
        const latestTime = state.lastTimestamp;
        for (const trade of trades) {
          if (trade.timestamp.getTime() === latestTime) {
            state.processedSignatures.add(this.getTradeSignature(trade));
          } else {
            break; // Since sorted desc, we can stop once we hit older trades
          }
        }
        
        console.log(`Initialized state for ${walletAddress}. Last timestamp: ${state.lastTimestamp}`);
      }
      
      this.walletStates.set(walletAddress, state);
    } catch (error) {
      console.error(`Error initializing state for ${walletAddress}:`, error);
    }
  }
  
  getTradeSignature(trade) {
    // specific enough to distinguish trades within the same transaction/second
    return `${trade.transactionHash}-${trade.conditionId || trade.id}-${trade.side}-${trade.size}`;
  }

  async monitorLoop(bot) {
    if (!this.isMonitoring) return;

    try {
      // Get all unique wallets being tracked
      const allTrackedWallets = new Set();
      for (const wallets of this.trackedWallets.values()) {
        for (const wallet of wallets) {
          allTrackedWallets.add(wallet);
        }
      }

      // Check each wallet
      for (const walletAddress of allTrackedWallets) {
        await this.checkWallet(bot, walletAddress);
      }
      
    } catch (error) {
      console.error('Error in monitoring loop:', error);
    }

    // Schedule next check
    setTimeout(() => this.monitorLoop(bot), this.checkInterval);
  }

  async checkWallet(bot, walletAddress) {
    try {
      const trades = await this.service.getUserTrades(walletAddress);
      
      // Log for debugging
      console.log(`Checking ${walletAddress.slice(0, 6)}... Found ${trades.length} trades.`);

      if (trades.length > 0) {
        // Sort by timestamp descending
        trades.sort((a, b) => b.timestamp - a.timestamp);
        
        const state = this.walletStates.get(walletAddress) || { lastTimestamp: 0, processedSignatures: new Set() };
        
        // Debug current state
        if (state.lastTimestamp > 0) {
           console.log(`Current lastTimestamp: ${state.lastTimestamp} (${new Date(state.lastTimestamp).toISOString()})`);
           console.log(`Latest trade: ${trades[0].timestamp.getTime()} (${trades[0].timestamp.toISOString()})`);
        }

        const newTrades = [];
        let maxTimestamp = state.lastTimestamp;
        
        // Find new trades
        for (const trade of trades) {
          const tradeTime = trade.timestamp.getTime();
          
          if (tradeTime < state.lastTimestamp) {
            // Strictly older, ignore
            continue;
          }
          
          const signature = this.getTradeSignature(trade);
          
          if (tradeTime === state.lastTimestamp) {
            // Same time, check if already processed
            if (state.processedSignatures.has(signature)) {
              continue;
            }
          }
          
          // It is new (either newer time, or same time but not processed)
          newTrades.push(trade);
          if (tradeTime > maxTimestamp) {
            maxTimestamp = tradeTime;
          }
        }

        // Update state if we found new trades
        if (newTrades.length > 0) {
          console.log(`Found ${newTrades.length} new trades for ${walletAddress}`);
          
          // If time advanced, clear old signatures and start fresh for this new timestamp
          if (maxTimestamp > state.lastTimestamp) {
            state.lastTimestamp = maxTimestamp;
            state.processedSignatures.clear();
            
            // Add all trades from this new maxTimestamp to the set
            // (Note: we only need to track signatures for the current maxTimestamp to prevent duplicates in next poll)
            for (const trade of newTrades) {
              if (trade.timestamp.getTime() === maxTimestamp) {
                state.processedSignatures.add(this.getTradeSignature(trade));
              }
            }
            // Also need to add signatures from 'trades' that matched maxTimestamp but were already there? 
            // Actually, simply adding the new ones is enough if we assume we processed everything.
            // But wait: if we fetched 1000 trades, and some old ones (same second) were not in 'newTrades' because they were processed before?
            // If we clear set, we might re-process them next time if we don't re-add them?
            // "next time" check: if tradeTime == state.lastTimestamp (which is now maxTimestamp).
            // So we must ensure ALL trades with 'maxTimestamp' are in the set.
             
             // Safer approach: Re-scan 'trades' for the new maxTimestamp
             for (const trade of trades) {
                if (trade.timestamp.getTime() === maxTimestamp) {
                    state.processedSignatures.add(this.getTradeSignature(trade));
                }
             }
          } else {
            // Timestamp didn't change (just found more trades in same second?), just add new signatures
            for (const trade of newTrades) {
               state.processedSignatures.add(this.getTradeSignature(trade));
            }
          }
          
          this.walletStates.set(walletAddress, state);
          
          // Process new trades (reverse to send oldest first if multiple)
          for (const trade of newTrades.reverse()) {
            await this.notifySubscribers(bot, walletAddress, trade);
          }
        }
      }
    } catch (error) {
      console.error(`Error checking wallet ${walletAddress}:`, error);
    }
  }

  async notifySubscribers(bot, walletAddress, trade) {
    // Find all users tracking this wallet
    for (const [chatId, wallets] of this.trackedWallets.entries()) {
      if (wallets.has(walletAddress)) {
        const message = this.formatAlertMessage(trade, walletAddress);
        try {
          await bot.sendMessage(chatId, message, { parse_mode: 'Markdown', disable_web_page_preview: true });
        } catch (error) {
          console.error(`Failed to send alert to ${chatId}:`, error);
        }
      }
    }
  }

  formatAlertMessage(trade, walletAddress) {
    const sideEmoji = trade.side === 'BUY' ? '🟢' : '🔴';
    const outcomeEmoji = trade.outcome === 'YES' ? '👍' : '👎';
    
    // Format timestamp with timezone (using UTC for consistency, or just ISO string)
    const date = new Date(trade.timestamp);
    const timeString = date.toLocaleString('en-US', { 
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });

    return `
🚨 *New Transaction Detected*

👛 *Wallet:* \`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}\`
${sideEmoji} *Side:* ${trade.side}
📊 *Market:* ${trade.market}
🎲 *Outcome:* ${outcomeEmoji} ${trade.outcome}
💰 *Size:* ${trade.size.toFixed(2)}
💵 *Price:* $${trade.price.toFixed(2)}
💲 *Value:* $${trade.volume.toFixed(2)}
⏰ *Time:* ${timeString}

🔗 [View Transaction](https://polygonscan.com/tx/${trade.transactionHash})
    `;
  }
}

const monitorService = new MonitorService();
module.exports = monitorService;
