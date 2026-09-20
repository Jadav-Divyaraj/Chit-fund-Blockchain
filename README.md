# SmartChit — Blockchain Chit Fund

> A blockchain-based chit-fund prototype designed to reduce reliance on a centralized organizer through smart-contract-controlled fund flows.

![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=flat&logo=solidity)
![Polygon](https://img.shields.io/badge/Polygon-Amoy%20Testnet-8247E5?style=flat&logo=polygon)
![Hardhat](https://img.shields.io/badge/Hardhat-2.19-FFDB1C?style=flat&logo=hardhat)
![License](https://img.shields.io/badge/License-MIT-green)

**Live Demo:** [https://chit-fund-blockchain.vercel.app](https://chit-fund-blockchain.vercel.app)

---

## Overview

India's ₹50,000 Crore chit fund industry operates on trust — organizers manage pooled money with no transparency. SmartChit replaces the human organizer with a Solidity smart contract on Polygon, where:

- Members join and pay contributions on-chain
- Auctions run automatically with time-limited bidding
- Fund distribution happens programmatically — no manual approval
- All transactions are publicly verifiable on Polygonscan

---

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    MONTHLY CYCLE                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. JOIN          2. PAY           3. AUCTION           │
│  ────────         ──────           ─────────            │
│  Members join     Each pays        If all 5 pay,        │
│  the fund (max    1 POL monthly    auction opens        │
│  5 members)       to contract      with countdown       │
│                                                         │
│  4. BID           5. WIN           6. REPEAT            │
│  ─────            ──────           ───────              │
│  Members bid      Lowest bidder    Winner gets pot,     │
│  discounts on     wins the pot     cycle repeats        │
│  the pot          minus discount   for next month       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Step-by-Step

1. **Connect MetaMask** → Polygon Amoy Testnet (chain ID: 80002)
2. **Join Fund** → Call `join()` on the smart contract (gas only)
3. **Pay Contribution** → Send 1 POL monthly via `pay()`
4. **Auction Opens** → When all 5 members pay, auction starts with 5-minute timer
5. **Place Bids** → Members bid discount amounts (e.g., 0.1 POL)
6. **Winner Declared** → Lowest bidder wins the pot minus their discount
7. **Verify Everything** → All transactions visible on Polygonscan

---

## Smart Contract

**Deployed Address:** `0x96539E626DB6b5cE21F2E39F9BDa46d1bD9DbB54`

### Key Functions

| Function | Description |
|----------|-------------|
| `join()` | Join the chit fund (max 5 members) |
| `pay()` | Pay monthly contribution (1 POL) |
| `placeBid(discountAmount)` | Place bid for auction discount |
| `endAuction()` | End auction & distribute funds |
| `getMembers()` | List all members |
| `hasPaid(address)` | Check if member paid this month |
| `totalPot()` | Get current pot balance |
| `auctionActive()` | Check if auction is running |

### Events

| Event | Emitted When |
|-------|-------------|
| `Joined` | New member joins |
| `Paid` | Member pays contribution |
| `BidPlaced` | Member places auction bid |
| `WinnerSelected` | Auction winner declared |
| `DividendPaid` | Dividend distributed to members |

### Security Properties

| Property | Implementation |
|----------|---------------|
| No owner withdrawal | Contract has no `withdraw()` function |
| Immutable code | Deployed contract cannot be modified |
| Public ledger | All transactions on Polygonscan |
| Automatic distribution | Funds sent programmatically to winner |
| Time-bound auctions | 5-minute auction window enforced on-chain |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Smart Contract** | Solidity 0.8.20 |
| **Blockchain** | Polygon Amoy Testnet |
| **Development** | Hardhat |
| **Frontend** | HTML5, CSS3, Vanilla JS |
| **Wallet** | MetaMask (ethers.js v6) |
| **Price Feed** | CoinGecko API (POL/INR) |
| **Deployment** | Vercel |

---

## Project Structure

```
Chit-fund-Blockchain/
├── contracts/
│   └── SmartChit.sol        # Chit fund smart contract
├── scripts/
│   └── deploy.js            # Deployment script
├── test/
│   └── SmartChit.test.js    # 27 unit tests
├── screenshots/             # Demo screenshots
│   ├── 06-live-polygon.png
│   └── 07-transaction-demo.png
├── index.html               # Main UI — hero, dashboard, auction
├── app.js                   # Blockchain interaction & wallet logic
├── style.css                # Dark theme with gold accents
├── hardhat.config.js        # Hardhat configuration
├── vercel.json              # Vercel deployment config
├── package.json             # Node dependencies
├── .gitignore               # Git ignore rules
├── LICENSE                  # MIT License
└── README.md                # This file
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v16+
- [MetaMask](https://metamask.io/) browser extension
- Polygon Amoy Testnet tokens ([faucet](https://faucet.polygon.technology/))

### Installation

```bash
# Clone the repository
git clone https://github.com/Jadav-Divyaraj/Chit-fund-Blockchain.git
cd Chit-fund-Blockchain

# Install dependencies
npm install

# Run tests
npx hardhat test

# Compile contracts
npx hardhat compile
```

### Run Frontend Locally

```bash
# Using Python
python -m http.server 3000

# Or using Node.js
npx serve .

# Then open http://localhost:3000
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

Or connect your GitHub repo to [vercel.com](https://vercel.com) for automatic deployments.

### Deploy Contract

```bash
# Deploy to Polygon Amoy Testnet
npx hardhat run scripts/deploy.js --network amoy
```

---

## Frontend Features

- **Live POL Price** — Real-time POL/INR conversion via CoinGecko API
- **Wallet Integration** — Connect MetaMask, show balance & address
- **Dashboard** — Members count, current month, total pot, user status
- **Auction UI** — Countdown timer, bid input, live bid list
- **Security Demo** — Simulate CEO theft attempt (it fails!)
- **Responsive Design** — Works on desktop and mobile
- **Toast Notifications** — Real-time transaction feedback

---

## Tests

```bash
npx hardhat test
```

```
SmartChit
  Deployment
    ✔ sets owner correctly
    ✔ sets monthly amount correctly
    ✔ starts with 0 members
    ✔ starts with 0 total pot
    ✔ auction not active initially
  Join
    ✔ allows new members to join
    ✔ emits Joined event
    ✔ prevents duplicate membership
    ✔ prevents joining after 5 members
  Pay
    ✔ allows member to pay
    ✔ emits Paid event
    ✔ rejects non-member payment
    ✔ rejects wrong amount
    ✔ rejects double payment
  Auction
    ✔ starts auction when all pay
    ✔ allows members to place bids
    ✔ emits BidPlaced event
    ✔ rejects bid from non-member
    ✔ rejects invalid bid amount (zero)
    ✔ rejects bid >= total pot
    ✔ getCurrentBids returns all bids
  End Auction
    ✔ cannot end auction before time
    ✔ ends auction and pays winner
    ✔ resets for next month after auction
    ✔ carries pot to next month if no bids
  View Functions
    ✔ getMembers returns all members
    ✔ getBalance returns contract balance

27 passing
```

---

## Useful Links

- [Live Demo](https://chit-fund-blockchain.vercel.app)
- [Polygonscan (Contract)](https://amoy.polygonscan.com/address/0x96539E626DB6b5cE21F2E39F9BDa46d1bD9DbB54)
- [Polygon Amoy Faucet](https://faucet.polygon.technology/)
- [MetaMask Download](https://metamask.io/)
- [Hardhat Docs](https://hardhat.org/docs)

---

## License

MIT License — feel free to use and modify.
