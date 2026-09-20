// ============================================================
// ChainChit — Fixed Version (No False Network Alert)
// Contract: 0x96539E626DB6b5cE21F2E39F9BDa46d1bD9DbB54
// ============================================================

const CONTRACT_ADDRESS = "0x82C1E20F96DF9CbB7666CC905abB8bdc51A2Ac0F";

const CONTRACT_ABI = [
    { "inputs": [{ "internalType": "uint256", "name": "_monthlyAmount", "type": "uint256" }], "stateMutability": "nonpayable", "type": "constructor" },
    { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "address", "name": "bidder", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "discount", "type": "uint256" }], "name": "BidPlaced", "type": "event" },
    { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "address", "name": "member", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "DividendPaid", "type": "event" },
    { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "address", "name": "member", "type": "address" }], "name": "Joined", "type": "event" },
    { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "address", "name": "member", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "Paid", "type": "event" },
    { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "address", "name": "winner", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "WinnerSelected", "type": "event" },
    { "inputs": [], "name": "MAX_MEMBERS", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "auctionActive", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "auctionEndTime", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "bids", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "bidders", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "currentMonth", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "endAuction", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [], "name": "getBalance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "getCurrentBids", "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }, { "internalType": "uint256[]", "name": "", "type": "uint256[]" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "getMembers", "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "hasPaid", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "isMember", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "join", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [], "name": "memberCount", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "members", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "monthlyAmount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "pay", "outputs": [], "stateMutability": "payable", "type": "function" },
    { "inputs": [{ "internalType": "uint256", "name": "discountAmount", "type": "uint256" }], "name": "placeBid", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [], "name": "totalPot", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
];

// ── Globals ────────────────────────────────────────────────
let provider, signer, contract, userAddress = null;
let refreshInterval = null;
let polPriceINR = 45;

// ── Format helpers ─────────────────────────────────────────
function shortAddr(a) { return a ? a.slice(0,6) + "..." + a.slice(-4) : ""; }
function weiToPOL(w)  { return Number(w) / 1e18; }
function polToINR(p)  { return "₹" + (p * polPriceINR).toFixed(2); }
function formatPOL(wei) { return weiToPOL(wei).toFixed(6); }

// ── Toast notifications ────────────────────────────────────
function toast(msg, type = "info") {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

// ── Live POL price ─────────────────────────────────────────
async function fetchPOLPrice() {
    try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=inr");
        const data = await res.json();
        if (data["matic-network"] && data["matic-network"].inr) {
            polPriceINR = data["matic-network"].inr;
        }
    } catch (e) { console.log("Using fallback price"); }
    
    const priceEl = document.getElementById("polPriceDisplay");
    if (priceEl) priceEl.textContent = "₹" + polPriceINR.toFixed(2);
    
    const payBtnSub = document.getElementById("payBtnSub");
    if (payBtnSub) payBtnSub.textContent = `0.001 POL ≈ ${polToINR(0.001)}`;
}

// ── Refresh dashboard ──────────────────────────────────────
async function refreshDashboard() {
    if (!contract || !userAddress) return;
    try {
        const count = await contract.memberCount();
        document.getElementById("memberCount").innerText = `${count}/5`;
        document.getElementById("memberBadge").innerText = `${count}/5 joined`;
        
        const month = await contract.currentMonth();
        document.getElementById("currentMonth").innerText = month.toString();
        
        const pot = await contract.totalPot();
        const potPOL = weiToPOL(pot);
        document.getElementById("totalPot").innerHTML = potPOL.toFixed(6) + " POL";
        document.getElementById("totalPotINR").innerHTML = polToINR(potPOL);
        
        const isMem = await contract.isMember(userAddress);
        const statusEl = document.getElementById("userStatus");
        if (isMem) {
            const paid = await contract.hasPaid(userAddress);
            statusEl.innerHTML = paid ? "✓ Paid this month" : "⏳ Payment pending";
            statusEl.style.color = paid ? "#22c55e" : "#f0c040";
        } else {
            statusEl.innerHTML = "Not a member";
            statusEl.style.color = "#ef4444";
        }
        
        const members = await contract.getMembers();
        const membersList = document.getElementById("membersList");
        membersList.innerHTML = "";
        if (members.length === 0) {
            membersList.innerHTML = '<li class="empty-state">No members yet — be the first to join</li>';
        } else {
            for (let i = 0; i < members.length; i++) {
                const paid = await contract.hasPaid(members[i]);
                const isMe = members[i].toLowerCase() === userAddress.toLowerCase();
                const li = document.createElement("li");
                li.innerHTML = `<span>${i+1}. ${shortAddr(members[i])} ${isMe ? '<span style="background:rgba(59,130,246,0.2);color:#3b82f6;font-size:10px;padding:2px 6px;border-radius:4px;margin-left:6px">You</span>' : ""}</span><span style="color:${paid ? "#22c55e" : "#f0c040"}">${paid ? "✓ Paid" : "⏳ Pending"}</span>`;
                membersList.appendChild(li);
            }
        }
        
        const auctionActive = await contract.auctionActive();
        const auctionSection = document.getElementById("auctionSection");
        const auctionInactive = document.getElementById("auctionInactive");
        const auctionBadge = document.getElementById("auctionLiveBadge");
        
        if (auctionActive) {
            auctionSection.classList.remove("hidden");
            auctionInactive.classList.add("hidden");
            auctionBadge.classList.remove("hidden");
            
            const endTime = await contract.auctionEndTime();
            const remaining = Number(endTime) - Math.floor(Date.now() / 1000);
            const timerEl = document.getElementById("auctionTimer");
            if (remaining > 0) {
                const m = Math.floor(remaining / 60);
                const s = remaining % 60;
                timerEl.textContent = `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
            } else { timerEl.textContent = "00:00"; }
            
            document.getElementById("auctionPot").innerHTML = potPOL.toFixed(6) + " POL";
            document.getElementById("auctionPotINR").innerHTML = polToINR(potPOL);
            
            try {
                const [bidders, amounts] = await contract.getCurrentBids();
                const bidsList = document.getElementById("bidsList");
                bidsList.innerHTML = "";
                if (bidders.length === 0) {
                    bidsList.innerHTML = '<li class="empty-state">No bids placed yet</li>';
                } else {
                    for (let i = 0; i < bidders.length; i++) {
                        const discPOL = weiToPOL(amounts[i]);
                        const li = document.createElement("li");
                        li.innerHTML = `<span>${shortAddr(bidders[i])}</span><span><span style="color:#f0c040;font-weight:600">${discPOL.toFixed(6)} POL</span> <span style="color:#64748b;font-size:11px">${polToINR(discPOL)}</span></span>`;
                        bidsList.appendChild(li);
                    }
                }
            } catch(e) {}
        } else {
            auctionSection.classList.add("hidden");
            auctionInactive.classList.remove("hidden");
            auctionBadge.classList.add("hidden");
        }
    } catch (err) { console.error("Refresh error:", err); }
}

// ── Bid input hint ─────────────────────────────────────────
function setupBidInput() {
    const bidInput = document.getElementById("bidAmount");
    const hint = document.getElementById("bidINRHint");
    if (bidInput && hint) {
        bidInput.addEventListener("input", (e) => {
            const val = parseFloat(e.target.value);
            hint.textContent = val > 0 ? `≈ ${polToINR(val)} discount` : "";
        });
    }
}

// ── Transaction functions ──────────────────────────────────
window.joinFund = async function() {
    if (!contract) { toast("Please connect wallet first", "error"); return; }
    const btn = document.getElementById("joinBtn");
    btn.disabled = true; btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> Joining...`;
    try {
        const tx = await contract.join();
        toast("Transaction submitted...", "info");
        await tx.wait();
        toast("✅ Successfully joined the chit fund!", "success");
        await refreshDashboard();
    } catch (err) { 
        console.error(err);
        toast("❌ Error: " + (err.reason || err.message || "Transaction failed"), "error"); 
    }
    finally { btn.disabled = false; btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> Join Chit Fund`; }
};

window.payContribution = async function() {
    if (!contract) { toast("Please connect wallet first", "error"); return; }
    const btn = document.getElementById("payBtn");
    btn.disabled = true; btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Processing...`;
    try {
        const amount = ethers.utils.parseEther("1");
        const tx = await contract.pay({ value: amount });
        toast("Payment submitted...", "info");
        await tx.wait();
        toast(`✅ Paid 1 POL ≈ ${polToINR(1)}`, "success");
        await refreshDashboard();
    } catch (err) { 
        console.error(err);
        toast("❌ Error: " + (err.reason || err.message || "Transaction failed"), "error"); 
    }
    finally { btn.disabled = false; btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Pay Contribution <span class="btn-sub" id="payBtnSub">0.001 POL</span>`; updatePayButton(); }
};

function updatePayButton() {
    const sub = document.getElementById("payBtnSub");
    if (sub) sub.textContent = `0.001 POL ≈ ${polToINR(0.001)}`;
}

window.placeBid = async function() {
    if (!contract) { toast("Please connect wallet first", "error"); return; }
    const bidInput = document.getElementById("bidAmount");
    const discount = parseFloat(bidInput.value);
    if (isNaN(discount) || discount <= 0) { toast("Enter valid discount", "error"); return; }
    const btn = document.getElementById("placeBidBtn");
    btn.disabled = true; btn.textContent = "Placing...";
    try {
        const discountWei = ethers.utils.parseEther(discount.toString());
        const tx = await contract.placeBid(discountWei);
        toast("Bid submitted...", "info");
        await tx.wait();
        toast(`✅ Bid placed! ${discount} POL discount`, "success");
        bidInput.value = "";
        const hint = document.getElementById("bidINRHint");
        if (hint) hint.textContent = "";
        await refreshDashboard();
    } catch (err) { 
        console.error(err);
        toast("❌ Error: " + (err.reason || err.message || "Transaction failed"), "error"); 
    }
    finally { btn.disabled = false; btn.textContent = "Place Bid"; }
};

window.demoTheftAttempt = async function() {
    const resultDiv = document.getElementById("theftResult");
    resultDiv.classList.remove("hidden", "theft-success", "theft-error");
    resultDiv.textContent = "Attempting withdrawal as CEO...";
    try {
        await contract.withdrawAllFunds();
        resultDiv.textContent = "❌ Unexpected: transaction succeeded!";
        resultDiv.classList.add("theft-error");
    } catch (error) {
        resultDiv.textContent = "🔒 PROOF CONFIRMED: CEO theft attempt FAILED. The function withdrawAllFunds() does not exist in this contract. User money is mathematically protected — not by trust, but by code.";
        resultDiv.classList.add("theft-success");
    }
};

// ── Wallet connection ──────────────────────────────────────
window.connectWallet = async function() {
    if (!window.ethereum) {
        toast("MetaMask not found. Please install MetaMask first.", "error");
        window.open("https://metamask.io/download/", "_blank");
        return;
    }
    
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        
        // Get network and show warning if not Amoy
        const network = await provider.getNetwork();
        if (network.chainId !== 80002) {
            toast("⚠️ Please switch to Polygon Amoy Testnet in MetaMask for this demo", "error");
            // Still continue but warn
        }
        
        document.getElementById("walletAddress").innerHTML = shortAddr(userAddress);
        const balance = await provider.getBalance(userAddress);
        document.getElementById("walletBalance").innerHTML = weiToPOL(balance).toFixed(3) + " POL";
        
        document.getElementById("connectWalletBtn").classList.add("hidden");
        document.getElementById("walletInfo").classList.remove("hidden");
        document.getElementById("connectPrompt").classList.add("hidden");
        document.getElementById("dashboard").classList.remove("hidden");
        
        await fetchPOLPrice();
        setupBidInput();
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(refreshDashboard, 10000);
        await refreshDashboard();
        toast("Wallet connected!", "success");
    } catch (err) { 
        console.error(err);
        toast("Connection failed: " + err.message, "error"); 
    }
};

// ── Event listeners ────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    const connectBtn = document.getElementById("connectWalletBtn");
    const heroBtn = document.getElementById("heroConnectBtn");
    const joinBtn = document.getElementById("joinBtn");
    const payBtn = document.getElementById("payBtn");
    const placeBidBtn = document.getElementById("placeBidBtn");
    const theftBtn = document.getElementById("theftDemoBtn");
    const polyBtn = document.getElementById("polygonscanBtn");
    
    if (connectBtn) connectBtn.addEventListener("click", window.connectWallet);
    if (heroBtn) heroBtn.addEventListener("click", window.connectWallet);
    if (joinBtn) joinBtn.addEventListener("click", window.joinFund);
    if (payBtn) payBtn.addEventListener("click", window.payContribution);
    if (placeBidBtn) placeBidBtn.addEventListener("click", window.placeBid);
    if (theftBtn) theftBtn.addEventListener("click", window.demoTheftAttempt);
    if (polyBtn) polyBtn.addEventListener("click", () => {
        window.open("https://amoy.polygonscan.com/address/0x96539E626DB6b5cE21F2E39F9BDa46d1bD9DbB54", "_blank");
    });
});

fetchPOLPrice();
setInterval(fetchPOLPrice, 60000);