const express = require('express');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const nodeHtmlToImage = require('node-html-to-image');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const puppeteerConfig = require('../puppeteer-config');

const router = express.Router();

// Connect to Solana mainnet
const connection = new Connection('https://api.mainnet-beta.solana.com', {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
  fetch: async (url, options) => {
    const response = await fetch(url, options);
    if (response.status === 429) {
      console.log('Rate limited by Solana API, waiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetch(url, options);
    }
    return response;
  }
});

// Add fallback endpoints in case the main one fails
const FALLBACK_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-mainnet.g.alchemy.com/v2/demo',
  'https://solana-api.projectserum.com'
];

// SPL Token Program ID
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// Helper function to get wallet data with retry and fallback logic
async function getWalletData(walletAddress) {
  try {
    const publicKey = new PublicKey(walletAddress);
    
    // Try to get wallet data with retries and fallbacks
    let balance = 0;
    let tokenAccounts = { value: [] };
    let signatures = [];
    let error = null;
    
    // Try each endpoint until one works
    for (const endpoint of FALLBACK_ENDPOINTS) {
      try {
        const tempConnection = new Connection(endpoint, 'confirmed');
        
        // Get wallet SOL balance
        balance = await tempConnection.getBalance(publicKey);
        
        // Get token accounts
        tokenAccounts = await tempConnection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_PROGRAM_ID }
        );
        
        // Get recent transactions
        signatures = await tempConnection.getSignaturesForAddress(publicKey, { limit: 10 });
        
        // If we get here, the endpoint worked
        error = null;
        break;
      } catch (err) {
        error = err;
        console.error(`Error with endpoint ${endpoint}:`, err);
        // Wait a bit before trying the next endpoint
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // If all endpoints failed, throw the last error
    if (error) {
      throw error;
    }
    
    const solBalance = balance / LAMPORTS_PER_SOL; // Convert lamports to SOL
    
    // Get token prices from CoinGecko
    const tokenPrices = await getTokenPrices();
    
    // Process token accounts to get actual balances
    const tokens = [];
    let totalValue = solBalance * tokenPrices.solana?.usd || 0;
    
    // Add SOL balance
    tokens.push({
      name: 'Solana',
      symbol: 'SOL',
      amount: solBalance.toFixed(4),
      value: (solBalance * (tokenPrices.solana?.usd || 0)).toFixed(2),
      priceChange24h: tokenPrices.solana?.usd_24h_change || 0
    });
    
    // Process other tokens
    for (const account of tokenAccounts.value) {
      const parsedInfo = account.account.data.parsed.info;
      const tokenAmount = parsedInfo.tokenAmount;
      
      // Skip tokens with 0 balance
      if (tokenAmount.amount === '0') continue;
      
      // Get token info
      const mintAddress = parsedInfo.mint;
      const tokenInfo = await getTokenInfo(mintAddress);
      
      if (tokenInfo) {
        const decimals = tokenAmount.decimals;
        const amount = parseFloat(tokenAmount.amount) / Math.pow(10, decimals);
        
        // Find price for this token
        const priceInfo = findTokenPrice(tokenInfo, tokenPrices);
        if (priceInfo) {
          const value = amount * priceInfo.price;
          totalValue += value;
          
          tokens.push({
            name: tokenInfo.name || 'Unknown Token',
            symbol: tokenInfo.symbol || '???',
            amount: amount.toFixed(4),
            value: value.toFixed(2),
            priceChange24h: priceInfo.priceChange24h || 0
          });
        }
      }
    }
    
    // Sort tokens by value (descending)
    tokens.sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
    
    // Calculate daily gains/losses based on 24h price changes
    let dailyGains = 0;
    for (const token of tokens) {
      const tokenValue = parseFloat(token.value);
      const percentChange = token.priceChange24h || 0;
      const dayChange = tokenValue * percentChange / 100;
      dailyGains += dayChange;
    }
    
    return {
      totalBalance: totalValue.toFixed(2),
      totalGains: dailyGains.toFixed(2),
      percentageChange: (dailyGains / (totalValue - dailyGains) * 100).toFixed(2),
      topAssets: tokens.slice(0, 5), // Get top 5 assets
      recentTransactions: signatures.slice(0, 5).map(sig => ({
        signature: sig.signature.substring(0, 12) + '...',
        timestamp: new Date(sig.blockTime * 1000).toLocaleString(),
        status: sig.confirmationStatus
      }))
    };
  } catch (error) {
    console.error('Error fetching wallet data:', error);
    throw new Error('Failed to fetch wallet data');
  }
}

// Helper to get token prices from CoinGecko with retry logic
async function getTokenPrices() {
  const maxRetries = 3;
  let retries = 0;
  
  // Fallback price data in case API calls fail
  const fallbackPrices = {
    solana: { usd: 150, usd_24h_change: 2.5 },
    'usd-coin': { usd: 1, usd_24h_change: 0 },
    raydium: { usd: 0.5, usd_24h_change: 1.2 },
    serum: { usd: 0.3, usd_24h_change: 1.5 },
  };
  
  while (retries < maxRetries) {
    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: {
            ids: 'solana,usd-coin,raydium,serum,oxygen,maps,step-finance,bonfida,mango-markets',
            vs_currencies: 'usd',
            include_24hr_change: true
          },
          timeout: 5000 // 5 second timeout
        }
      );
      
      if (response.status === 200) {
        return response.data;
      }
      
      if (response.status === 429) {
        console.log('Rate limited by CoinGecko, retrying after delay...');
        await new Promise(resolve => setTimeout(resolve, 2000 * (retries + 1)));
        retries++;
      } else {
        console.error('CoinGecko API error:', response.status);
        break;
      }
    } catch (error) {
      console.error('Error fetching token prices:', error.message);
      retries++;
      
      if (retries < maxRetries) {
        const delay = 2000 * retries;
        console.log(`Retrying after ${delay}ms (attempt ${retries} of ${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.log('Using fallback price data after failed API calls');
  return fallbackPrices; // Return fallback data if all retries fail
}

// Helper to get token information
async function getTokenInfo(mintAddress) {
  try {
    // This would typically query a token registry or metadata service
    // For simplicity, we'll map some known tokens
    const knownTokens = {
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
        name: 'USD Coin',
        symbol: 'USDC',
        coingeckoId: 'usd-coin'
      },
      '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': {
        name: 'Raydium',
        symbol: 'RAY',
        coingeckoId: 'raydium'
      },
      'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt': {
        name: 'Serum',
        symbol: 'SRM',
        coingeckoId: 'serum'
      },
      // Add more tokens as needed
    };
    
    return knownTokens[mintAddress.toString()] || null;
  } catch (error) {
    console.error('Error fetching token info:', error);
    return null;
  }
}

// Helper to find token price in CoinGecko response
function findTokenPrice(tokenInfo, prices) {
  if (!tokenInfo || !tokenInfo.coingeckoId || !prices) return null;
  
  const priceInfo = prices[tokenInfo.coingeckoId];
  if (priceInfo) {
    return {
      price: priceInfo.usd,
      priceChange24h: priceInfo.usd_24h_change
    };
  }
  
  return null;
}

// Generate PNL card image HTML
function generateCardHtml(walletData, walletAddress, hideBalance) {
  const totalGainColor = parseFloat(walletData.totalGains) >= 0 ? '#00ff66' : '#ff0044';
  const percentChangeColor = parseFloat(walletData.percentageChange) >= 0 ? '#00ff66' : '#ff0044';
  const percentChangeSymbol = parseFloat(walletData.percentageChange) >= 0 ? '+' : '';
  
  // Function to mask values if hideBalance is true
  const maskValue = (value) => hideBalance ? '***' : value;
  
  return `
    <html>
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
      <style>
        @font-face {
          font-family: 'Press Start 2P';
          src: url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        }
        
        body {
          font-family: 'Press Start 2P', cursive;
          margin: 0;
          padding: 0;
          background: #222;
          color: white;
          line-height: 1.5;
        }
        .card {
          height: 800px;
          background: #121212;
          color: white;
          padding: 30px;
          box-shadow: 8px 8px 0 rgba(0,0,0,0.5);
          border: 4px solid white;
          position: relative;
          overflow: hidden;
          image-rendering: pixelated;
        }
        .logo-container {
          position: absolute;
          top: 20px;
          right: 20px;
          bottom: 20px;
          width: 120px;
          height: 120px;
          overflow: hidden;
          border: 2px solid white;
        }
        .logo {
          width: 100%;
          height: auto;
        }
        .title {
          font-size: 24px;
          margin-bottom: 10px;
          font-weight: bold;
          color: #4169e1;
          text-shadow: 2px 2px 0 #000;
        }
        .privacy-badge {
          position: absolute;
          top: 20px;
          left: 20px;
          background: #333;
          color: #aaa;
          font-size: 8px;
          padding: 5px 10px;
          border: 2px solid white;
        }
        .wallet-address {
          font-size: 10px;
          margin-bottom: 30px;
          color: #aaa;
          word-break: break-all;
        }
        .stats {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          margin-top: 100px;
        }
        .stat-box {
          background: #333;
          padding: 15px;
          width: 30%;
          border: 3px solid white;
        }
        .stat-title {
          font-size: 10px;
          color: #aaa;
          margin-bottom: 10px;
        }
        .stat-value {
          font-size: 16px;
          font-weight: bold;
        }
        .section-title {
          font-size: 16px;
          margin: 30px 0 15px 0;
          border-bottom: 3px solid rgba(255,255,255,0.5);
          padding-bottom: 10px;
          color: #4169e1;
        }
        .asset-list {
          margin-bottom: 30px;
        }
        .asset {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 3px solid rgba(255,255,255,0.2);
        }
        .asset-name {
          font-weight: bold;
          font-size: 12px;
        }
        .asset-amount, .asset-value {
          font-size: 12px;
        }
        .token-symbol {
          font-size: 8px;
          color: #aaa;
          margin-left: 5px;
        }
        .tx-list {
          font-size: 12px;
        }
        .tx {
          padding: 10px 0;
          border-bottom: 3px solid rgba(255,255,255,0.2);
        }
        .tx-signature {
          color: #aaa;
          font-size: 10px;
        }
        .tx-time {
          font-size: 10px;
          margin-top: 5px;
        }
        .footer {
          position: absolute;
          bottom: 20px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 10px;
          color: #aaa;
        }
        .price-change {
          font-size: 8px;
          margin-top: 2px;
        }
        .positive { color: #00ff66; }
        .negative { color: #ff0044; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo-container">
          <img src="data:image/png;base64,${fs.readFileSync(path.join(__dirname, '../public/img/logo-base64.txt'), 'utf8')}" class="logo" />
        </div>
        ${hideBalance ? '' : ''}
        <div class="title">Solana Wallet PNL</div>
        <div class="wallet-address">${walletAddress}</div>
        
        <div class="stats">
          <div class="stat-box">
            <div class="stat-title">Total Value</div>
            <div class="stat-value">$${maskValue(walletData.totalBalance)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-title">24h Gains/Loss</div>
            <div class="stat-value" style="color: ${totalGainColor}">$${walletData.totalGains}</div>
          </div>
          <div class="stat-box">
            <div class="stat-title">24h Change %</div>
            <div class="stat-value" style="color: ${percentChangeColor}">${percentChangeSymbol}${walletData.percentageChange}%</div>
          </div>
        </div>
        
        <div class="section-title">Top Assets</div>
        <div class="asset-list">
          ${walletData.topAssets.map(asset => {
            const priceChangeClass = asset.priceChange24h >= 0 ? 'positive' : 'negative';
            const priceChangeSymbol = asset.priceChange24h >= 0 ? '+' : '';
            return `
              <div class="asset">
                <div class="asset-name">
                  ${asset.name}
                  <span class="token-symbol">${asset.symbol}</span>
                </div>
                <div class="asset-amount">${maskValue(asset.amount)}</div>
                <div class="asset-value">
                  $${maskValue(asset.value)}
                  <div class="price-change ${priceChangeClass}">
                    ${priceChangeSymbol}${asset.priceChange24h?.toFixed(2) || '0.00'}%
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div class="section-title">Recent Transactions</div>
        <div class="tx-list">
          ${walletData.recentTransactions.map(tx => `
            <div class="tx">
              <div class="tx-signature">${tx.signature}</div>
              <div class="tx-time">${tx.timestamp}</div>
            </div>
          `).join('')}
        </div>
        
        <div class="footer">Generated by TrenchCard | ${new Date().toLocaleString()}</div>
      </div>
    </body>
    </html>
  `;
}

// API route to get wallet PNL data
router.get('/wallet/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    const walletData = await getWalletData(address);
    res.json(walletData);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet data' });
  }
});

// API route to generate and return PNL card image
router.get('/generate/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const hideBalance = req.query.hideBalance === 'true';
    
    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    const walletData = await getWalletData(address);
    const html = generateCardHtml(walletData, address, hideBalance);
    
    const image = await nodeHtmlToImage({
      html,
      quality: 100,
      type: 'png',
      puppeteerArgs: puppeteerConfig
    });
    
    res.set('Content-Type', 'image/png');
    res.send(image);
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: 'Failed to generate PNL card image' });
  }
});

module.exports = router; 