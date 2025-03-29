document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const walletForm = document.getElementById('wallet-form');
  const walletAddressInput = document.getElementById('wallet-address');
  const hideBalanceCheckbox = document.getElementById('hide-balance');
  const generateBtn = document.getElementById('generate-btn');
  const normalState = generateBtn.querySelector('.normal-state');
  const loadingState = generateBtn.querySelector('.loading-state');
  const resultSection = document.getElementById('result-section');
  const pnlCard = document.getElementById('pnl-card');
  const downloadBtn = document.getElementById('download-btn');
  const tweetBtn = document.getElementById('tweet-btn');
  const errorMessage = document.getElementById('error-message');

  // Handle form submission
  walletForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const walletAddress = walletAddressInput.value.trim();
    const hideBalance = hideBalanceCheckbox.checked;
    
    if (!walletAddress) {
      showError('Please enter a Solana wallet address');
      return;
    }
    
    // Show loading state
    setLoading(true);
    
    try {
      // Make sure any previous error is hidden
      hideError();
      
      // First fetch wallet data to include in the tweet
      const walletDataResponse = await fetch(`/api/wallet/${walletAddress}`);
      const walletData = await walletDataResponse.json();
      
      // Generate the image URL with hideBalance parameter
      const imageUrl = `/api/generate/${walletAddress}?hideBalance=${hideBalance}`;
      
      // Load the image
      await loadImage(imageUrl);
      
      // Set the image source
      pnlCard.src = imageUrl;
      
      // Show the result section
      resultSection.classList.remove('d-none');
      
      // Set up download button
      downloadBtn.href = imageUrl;
      downloadBtn.download = `trenchcard-${walletAddress.substring(0, 8)}${hideBalance ? '-private' : ''}.png`;
      
      // Set up tweet button with real data
      const dailyChange = parseFloat(walletData.percentageChange);
      const dailyChangeEmoji = dailyChange >= 0 ? '📈' : '📉';
      let tweetText;
      
      if (hideBalance) {
        tweetText = encodeURIComponent(`My Solana wallet is ${dailyChangeEmoji} ${dailyChange >= 0 ? 'up' : 'down'} ${Math.abs(dailyChange).toFixed(2)}% in the last 24h! #Solana #TrenchCard`);
      } else {
        tweetText = encodeURIComponent(`My Solana wallet is ${dailyChangeEmoji} ${dailyChange >= 0 ? 'up' : 'down'} ${Math.abs(dailyChange).toFixed(2)}% in the last 24h! Check out my PNL card created with TrenchCard 🚀 #Solana #TrenchCard`);
      }
      
      tweetBtn.href = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(window.location.href)}`;
      
      // Scroll to result section
      resultSection.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Error generating PNL card:', error);
      showError('Failed to generate PNL card. Please check the wallet address and try again.');
      resultSection.classList.add('d-none');
    } finally {
      // Hide loading state
      setLoading(false);
    }
  });

  // Function to show loading state
  function setLoading(isLoading) {
    if (isLoading) {
      normalState.classList.add('d-none');
      loadingState.classList.remove('d-none');
      generateBtn.disabled = true;
    } else {
      normalState.classList.remove('d-none');
      loadingState.classList.add('d-none');
      generateBtn.disabled = false;
    }
  }

  // Function to load an image and return a promise
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

  // Function to show error message
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('d-none');
  }

  // Function to hide error message
  function hideError() {
    errorMessage.classList.add('d-none');
    errorMessage.textContent = '';
  }

  // Basic Solana address validation
  walletAddressInput.addEventListener('input', () => {
    const address = walletAddressInput.value.trim();
    if (address && (address.length < 32 || address.length > 44)) {
      walletAddressInput.classList.add('is-invalid');
    } else {
      walletAddressInput.classList.remove('is-invalid');
      hideError();
    }
  });
}); 