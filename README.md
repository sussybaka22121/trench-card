# TrenchCard - Solana Wallet PNL Tracker

A web application that allows users to generate shareable PNL (Profit and Loss) cards based on their Solana wallet address.

## Features

- Input a Solana wallet address to generate a PNL card
- View your Solana wallet balance, profit/loss metrics, and recent transactions
- Download the generated card as an image
- Share your PNL card directly to Twitter

## Technologies Used

- Node.js with Express
- Solana Web3.js for blockchain integration
- HTML/CSS/JavaScript for frontend
- Bootstrap for responsive design
- node-html-to-image for generating shareable cards

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
```
git clone <repository-url>
cd trenchcard
```

2. Install dependencies
```
npm install
```

3. Set up environment variables (optional)
Copy the `.env.example` file to `.env` and modify as needed.

4. Start the development server
```
npm run dev
```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Enter your Solana wallet address in the input field
2. Click "Generate PNL Card"
3. Once generated, you can view your PNL card with wallet metrics
4. Download the image or share it directly to Twitter

## License

ISC

## Acknowledgements

- Solana Blockchain
- Solana Web3.js library
- Bootstrap framework 