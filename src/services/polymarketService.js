const axios = require('axios');

class PolymarketService {
  constructor() {
    this.gammaApi = axios.create({
      baseURL: 'https://gamma-api.polymarket.com',
      timeout: 10000,
    });

    this.dataApi = axios.create({
      baseURL: 'https://data-api.polymarket.com',
      timeout: 10000,
    });

    this.clobApi = axios.create({
      baseURL: 'https://clob.polymarket.com',
      timeout: 10000,
    });
  }

  /**
   * Get user positions from Polymarket
   * @param {string} walletAddress - User's wallet address
   * @returns {Promise<Array>} Array of user positions
   */
  async getUserPositions(walletAddress) {
    try {
      console.log(`Fetching positions for wallet: ${walletAddress}`);
      
      // Get user's positions from the Data API
      const response = await this.dataApi.get(`/positions`, {
        params: {
          user: walletAddress.toLowerCase(),
          limit: 100
        }
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }
      
      const positions = response.data;
      const formattedPositions = [];
      
      for (const position of positions) {
        try {
          const formattedPosition = {
            id: position.conditionId,
            market: position.title || 'Unknown Market',
            marketId: position.conditionId,
            tokenId: position.asset,
            side: position.outcome || 'Unknown',
            amount: parseFloat(position.size || 0),
            avgPrice: parseFloat(position.avgPrice || 0),
            currentPrice: parseFloat(position.curPrice || 0),
            value: parseFloat(position.currentValue || 0),
            initialValue: parseFloat(position.initialValue || 0),
            pnl: parseFloat(position.cashPnl || 0),
            percentPnl: parseFloat(position.percentPnl || 0),
            status: 'ACTIVE',
            redeemable: position.redeemable || false,
            mergeable: position.mergeable || false
          };
          
          formattedPositions.push(formattedPosition);
        } catch (error) {
          console.error(`Error processing position ${position.conditionId}:`, error);
        }
      }
      
      return formattedPositions;
      
    } catch (error) {
      console.error('Error fetching user positions:', error);
      throw new Error('Failed to fetch user positions');
    }
  }

  /**
   * Calculate user's total PNL
   * @param {string} walletAddress - User's wallet address
   * @returns {Promise<Object>} PNL summary object
   */
  async getUserPNL(walletAddress) {
    try {
      console.log(`Calculating PNL for wallet: ${walletAddress}`);
      
      const positions = await this.getUserPositions(walletAddress);
      const trades = await this.getUserTrades(walletAddress);
      
      let totalPnl = 0;
      let realizedPnl = 0;
      let unrealizedPnl = 0;
      let totalVolume = 0;
      let winningTrades = 0;
      
      // Calculate from positions (unrealized PNL)
      positions.forEach(position => {
        unrealizedPnl += position.pnl;
        totalPnl += position.pnl;
      });
      
      // Calculate from trades (realized PNL and volume)
      trades.forEach(trade => {
        totalVolume += trade.volume;
        if (trade.pnl > 0) {
          winningTrades++;
        }
        realizedPnl += trade.pnl;
      });
      
      totalPnl += realizedPnl;
      
      const winRate = trades.length > 0 ? (winningTrades / trades.length * 100).toFixed(1) : 0;
      const activeSince = this.getActiveSince(trades);
      
      return {
        totalPnl: parseFloat(totalPnl.toFixed(2)),
        realizedPnl: parseFloat(realizedPnl.toFixed(2)),
        unrealizedPnl: parseFloat(unrealizedPnl.toFixed(2)),
        totalVolume: parseFloat(totalVolume.toFixed(2)),
        totalTrades: trades.length,
        winRate: parseFloat(winRate),
        activeSince
      };
      
    } catch (error) {
      console.error('Error calculating user PNL:', error);
      throw new Error('Failed to calculate PNL');
    }
  }

  /**
   * Get user's trading history
   * @param {string} walletAddress - User's wallet address
   * @returns {Promise<Array>} Array of trades
   */
  async getUserTrades(walletAddress, limit = 50) {
    try {
      const response = await this.dataApi.get(`/trades`, {
        params: {
          user: walletAddress.toLowerCase(),
          limit: limit,
          t: Date.now() // Cache busting
        }
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }
      
      return response.data.map(trade => {
        // Ensure timestamp is a valid number before converting
        const timestampVal = Number(trade.timestamp);
        const timestamp = !isNaN(timestampVal) ? new Date(timestampVal * 1000) : new Date();

        return {
          id: trade.conditionId || trade.id || 'unknown',
          market: trade.title || 'Unknown Market',
          side: trade.side || 'UNKNOWN',
          size: parseFloat(trade.size || 0),
          price: parseFloat(trade.price || 0),
          volume: parseFloat(trade.size || 0) * parseFloat(trade.price || 0),
          timestamp: timestamp,
          pnl: 0,
          transactionHash: trade.transactionHash || `pending-${Date.now()}`,
          outcome: trade.outcome,
          conditionId: trade.conditionId,
          asset: trade.asset
        };
      });
      
    } catch (error) {
      console.error('Error fetching user trades:', error.message);
      return [];
    }
  }

  /**
   * Get market statistics for a wallet
   * @param {string} walletAddress 
   * @returns {Promise<Array>} Aggregated stats
   */
  async getMarketStats(walletAddress) {
    const trades = await this.getUserTrades(walletAddress, 1000);
    const positions = await this.getUserPositions(walletAddress);
    const stats = {};

    // Helper to normalize side
    const isYes = (side) => ['YES', 'UP'].includes(side?.toUpperCase());
    const isNo = (side) => ['NO', 'DOWN'].includes(side?.toUpperCase());

    // 1. Aggregate Trades for Activity Stats
    for (const trade of trades) {
      if (!stats[trade.market]) {
        stats[trade.market] = {
          market: trade.market,
          trades: 0,
          firstTrade: trade, 
          timestamps: [],
          // Position data will be filled from positions
          yesShares: 0,
          yesAvg: 0,
          noShares: 0,
          noAvg: 0
        };
      }
      
      const marketStats = stats[trade.market];
      marketStats.trades++;
      marketStats.timestamps.push(trade.timestamp.getTime());
      
      // Track oldest trade
      if (trade.timestamp < marketStats.firstTrade.timestamp) {
        marketStats.firstTrade = trade;
      }
    }
    
    // 2. Map Positions to Markets
    for (const position of positions) {
      // Find matching market in stats (or create if only position exists but no recent trades?)
      // Usually if there is a position, there must be trades. 
      // But if trades > 1000, maybe we missed them. 
      // For now, only map to existing stats or create new entry.
      
      if (!stats[position.market]) {
         // Create entry if position exists but no trades in last 1000
         stats[position.market] = {
            market: position.market,
            trades: 0,
            firstTrade: { 
                side: position.side, 
                price: position.avgPrice, 
                size: position.amount, 
                timestamp: new Date() // Unknown
            },
            timestamps: [],
            yesShares: 0,
            yesAvg: 0,
            noShares: 0,
            noAvg: 0
         };
      }

      const marketStats = stats[position.market];
      
      if (isYes(position.side)) {
        marketStats.yesShares = position.amount;
        marketStats.yesAvg = position.avgPrice;
      } else if (isNo(position.side)) {
        marketStats.noShares = position.amount;
        marketStats.noAvg = position.avgPrice;
      }
    }

    // Finalize calculations
    return Object.values(stats).map(s => {
      const duration = s.timestamps.length > 1 
        ? (Math.max(...s.timestamps) - Math.min(...s.timestamps)) 
        : 0;
      const avgTimeMs = s.trades > 1 ? duration / (s.trades - 1) : 0;
      
      return {
        market: s.market,
        trades: s.trades,
        firstTrade: {
          side: s.firstTrade.side,
          price: s.firstTrade.price,
          size: s.firstTrade.size,
          timestamp: s.firstTrade.timestamp
        },
        yesAvg: s.yesAvg,
        noAvg: s.noAvg,
        yesShares: s.yesShares,
        yesVolume: s.yesShares * s.yesAvg, // Approximate value
        noShares: s.noShares,
        noVolume: s.noShares * s.noAvg, // Approximate value
        avgTime: avgTimeMs / 1000 // seconds
      };
    }).sort((a, b) => b.trades - a.trades); // Sort by most active
  }

  /**
   * Get active markets from Polymarket
   * @returns {Promise<Array>} Array of active markets
   */
  async getActiveMarkets() {
    try {
      const response = await this.gammaApi.get('/markets', {
        params: {
          limit: 20,
          active: true,
          order: 'volume24hr',
          ascending: false
        }
      });
      
      if (!response.data || !response.data.data) {
        return [];
      }
      
      return response.data.data.map(market => ({
        id: market.id,
        question: market.question,
        description: market.description,
        volume: parseFloat(market.volume24hr || 0),
        yesPrice: parseFloat(market.tokens?.[0]?.price || 0) * 100, // Convert to cents
        noPrice: parseFloat(market.tokens?.[1]?.price || 0) * 100,
        endDate: new Date(market.end_date_iso),
        category: market.category,
        image: market.image
      }));
      
    } catch (error) {
      console.error('Error fetching active markets:', error);
      throw new Error('Failed to fetch market data');
    }
  }

  /**
   * Get market details by ID
   * @param {string} marketId - Market ID
   * @returns {Promise<Object>} Market details
   */
  async getMarketById(marketId) {
    try {
      const response = await this.gammaApi.get(`/markets/${marketId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching market ${marketId}:`, error);
      return null;
    }
  }

  /**
   * Get current price for a token
   * @param {string} tokenId - Token ID
   * @returns {Promise<number>} Current price
   */
  async getCurrentPrice(tokenId) {
    try {
      const response = await this.clobApi.get(`/price`, {
        params: {
          token_id: tokenId
        }
      });
      
      return parseFloat(response.data?.price || 0);
    } catch (error) {
      console.error(`Error fetching price for token ${tokenId}:`, error);
      return 0;
    }
  }

  /**
   * Calculate PNL for a position
   * @param {Object} position - Position object
   * @returns {number} PNL value
   */
  calculatePositionPNL(position) {
    // This is a simplified calculation
    // In reality, you'd need current market prices and more complex logic
    const avgPrice = parseFloat(position.avg_price || 0);
    const size = parseFloat(position.size || 0);
    const currentPrice = 0.5; // Placeholder - should get real current price
    
    if (position.side === 'BUY') {
      return (currentPrice - avgPrice) * size;
    } else {
      return (avgPrice - currentPrice) * size;
    }
  }

  /**
   * Calculate PNL for a trade (placeholder)
   * @param {Object} trade - Trade object
   * @returns {number} PNL value
   */
  calculateTradePNL(trade) {
    // Placeholder implementation
    // Real implementation would require more complex logic
    return 0;
  }

  /**
   * Get the date when user became active
   * @param {Array} trades - Array of trades
   * @returns {string} Formatted date string
   */
  getActiveSince(trades) {
    if (trades.length === 0) {
      return 'No trading history';
    }
    
    const oldestTrade = trades.reduce((oldest, trade) => {
      return trade.timestamp < oldest.timestamp ? trade : oldest;
    });
    
    return oldestTrade.timestamp.toLocaleDateString();
  }

  /**
   * Validate wallet address format
   * @param {string} address - Wallet address
   * @returns {boolean} Is valid address
   */
  isValidWalletAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

module.exports = new PolymarketService();