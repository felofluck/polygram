const axios = require('axios');

async function testApi() {
  try {
    // A known active wallet or just query trades with a limit to find one
    // Since I don't have a wallet, I'll try to find a recent trade from the clob or just guess
    // specific wallet address isn't needed if I can just hit the endpoint, but the endpoint requires 'user' param?
    // /trades?user=...
    
    // Let's try a random active wallet from a leaderboard if possible, or just use the one from the example in previous turns if any.
    // I recall 0x742d35Cc6634C0532925a3b8D4C9db96590c6C87 from the code comments (likely a placeholder).
    
    // Let's use a very generic address or try to find one.
    // Actually, I'll use the one the user might have used or a known Polymarket address.
    // 0x5e23... is a known whale?
    
    // Let's try to query without user param? No, likely required.
    // I will try to use the address from the user's previous context if possible, but I don't have it.
    // I'll use a hardcoded address that I suspect is active or just a random one.
    // I'll try a known polymarket proxy or something? No.
    
    // Let's search for "polymarket leaderboard wallet" on google? No web search.
    
    // I'll try to fetch markets, get a token ID, and see if I can find recent trades for that token?
    // The service has `getUserTrades`.
    
    // I'll just try the address from the prompt example: 0x742d35Cc6634C0532925a3b8D4C9db96590c6C87
    // It might be empty.
    
    const wallet = '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87'; 
    
    console.log(`Testing trades for ${wallet}...`);
    const response = await axios.get('https://data-api.polymarket.com/trades', {
      params: {
        user: wallet,
        limit: 5
      }
    });
    
    console.log('Response data sample:', JSON.stringify(response.data[0], null, 2));
    
    if (response.data.length > 0) {
      const trade = response.data[0];
      console.log('Timestamp:', trade.timestamp, 'Type:', typeof trade.timestamp);
      console.log('Parsed Date:', new Date(trade.timestamp * 1000));
    } else {
      console.log('No trades found for this wallet.');
    }
    
    // Also test gamma api
    console.log('Testing Gamma API...');
    const gammaResponse = await axios.get('https://gamma-api.polymarket.com/markets?limit=1');
    console.log('Gamma API status:', gammaResponse.status);

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.log('API Response:', error.response.data);
    }
  }
}

testApi();
