// ============================================================================
// Secure Transaction System — Frontend Controller
// ============================================================================
const CONFIG = {
    CONTRACT_ADDRESS: "YOUR_CONTRACT_ADDRESS_HERE", // paste deployed address
    RPC_URL: "https://sepolia.infura.io/v3/YOUR_KEY",
    CHAIN_ID: 11155111,
    NETWORK_NAME: "Sepolia",
};

const ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address,uint256) returns (bool)",
    "function mint(address,uint256)",
    "function burn(uint256)",
    "function owners(uint256) view returns (address)",
    "function requiredSignatures() view returns (uint256)",
    "function timelockDelay() view returns (uint256)",
    "function transactionCount() view returns (uint256)",
    "function transactions(uint256) view returns (address,uint256,bytes,uint8,uint256,address,uint256)",
    "function confirmationCount(uint256) view returns (uint256)",
    "function executionTime(uint256) view returns (uint256)",
    "function executed(uint256) view returns (bool)",
    "function cancelled(uint256) view returns (bool)",
    "function getPendingTransactions() view returns (uint256[])",
    "function getTransaction(uint256) view returns (address,uint256,bytes,uint8,uint256,address,uint256,uint256,bool,bool,uint256)",
    "function proposeTransaction(address,uint256,bytes,uint8) returns (uint256)",
    "function proposeTransactionWithSig(address,uint256,bytes,uint8,uint256,bytes) returns (uint256)",
    "function confirmTransaction(uint256)",
    "function executeTransaction(uint256) returns (bool,bytes)",
    "function cancelTransaction(uint256)",
    "function isOwner(address) view returns (bool)",
    "function hasRole(bytes32,address) view returns (bool)",
    "function paused() view returns (bool)",
];

let provider, signer, contract, account, roles = [];

// ---------------------------------------------------------------- helpers
const $ = (id) => document.getElementById(id);
const short = (a) => (a ? a.slice(0, 6) + "…" + a.slice(-4) : "—");
const fmt = (wei, d = 18) => (wei == null ? "0" : (Number(wei) / 10 ** d).toLocaleString(undefined, { maximumFractionDigits: 4 }));
const toWei = (v) => ethers.parseUnits(v.toString(), 18);
const fmtDur = (s) => { const h = Math.floor(s/3600), m = Math.floor((s%3600)/60); return h ? `${h}h ${m}m` : `${m}m`; };
const isAddr = (a) => /^0x[a-fA-F0-9]{40}$/.test(a);

function log(msg, type = "info") {
    const c = $("console");
    const el = document.createElement("div");
    el.className = "log " + type;
    el.innerHTML = `<span class="t">${new Date().toLocaleTimeString()}</span>${msg}`;
    c.prepend(el);
}
function toast(title, msg, type = "info") {
    const t = document.createElement("div");
    t.className = "toast " + type;
    t.innerHTML = `<div class="bar"></div><div class="msg"><b>${title}</b>${msg || ""}</div>`;
    $("toasts").appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 4200);
}
function spin(btn, on) {
    if (on) { btn.dataset.txt = btn.textContent; btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> ${btn.dataset.txt}`; }
    else { btn.disabled = false; btn.textContent = btn.dataset.txt || btn.textContent; }
}

// ---------------------------------------------------------------- theme
function initTheme() {
    const saved = localStorage.getItem("sts-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    syncThemeIcon();
    $("themeToggle").onclick = () => {
        const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("sts-theme", next);
        syncThemeIcon();
    };
}
function syncThemeIcon() {
    $("themeIcon").textContent = document.documentElement.getAttribute("data-theme") === "light" ? "☾" : "☀";
}

// ---------------------------------------------------------------- wallet
async function connect() {
    if (!window.ethereum) { toast("MetaMask required", "Install MetaMask to continue", "error"); return; }
    try {
        $("connectBtn").disabled = true;
        await window.ethereum.request({ method: "eth_requestAccounts" });
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        account = await signer.getAddress();
        contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, ABI, signer);

        const net = await provider.getNetwork();
        if (Number(net.chainId) !== CONFIG.CHAIN_ID) {
            try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x" + CONFIG.CHAIN_ID.toString(16) }] }); }
            catch { toast("Wrong network", `Switch to ${CONFIG.NETWORK_NAME}`, "warn"); }
        }

        $("connectBtn").textContent = short(account);
        $("networkBadge").textContent = CONFIG.NETWORK_NAME;
        $("networkBadge").classList.add("on");
        $("networkLine").textContent = `${CONFIG.NETWORK_NAME} · ${short(account)}`;
        $("sidebarStatus").textContent = "Online";
        $("walletCard").style.display = "block";
        $("walletAvatar").textContent = account.slice(2, 4).toUpperCase();
        $("walletAddress").textContent = account;
        await refreshAll();
        log(`Connected as ${account}`, "success");
    } catch (e) {
        log("Connect failed: " + e.message, "error");
        toast("Connection failed", e.message, "error");
    } finally {
        $("connectBtn").disabled = false;
    }
}

async function refreshAll() {
    await Promise.all([loadWallet(), loadStats(), loadPending(), loadHistory()]);
    updatePermissions();
}

async function loadWallet() {
    const [eth, mDAI, owner, isAdmin] = await Promise.all([
        provider.getBalance(account),
        contract.balanceOf(account),
        contract.isOwner(account),
        (async () => { try { const o = await contract.owner?.(); return o?.toLowerCase() === account.toLowerCase(); } catch { return false; } })(),
    ]);
    $("ethBalance").textContent = fmt(eth, 18);
    $("mDAIBalance").textContent = fmt(mDAI, 18);
    const tags = [];
    if (owner) tags.push(`<span class="pill confirmed">Owner</span>`);
    if (isAdmin) tags.push(`<span class="pill confirmed">Admin</span>`);
    $("walletRoles").innerHTML = tags.join("") || `<span class="muted">No roles</span>`;
}

async function loadStats() {
    try {
        let owners = 0;
        while (true) { try { await contract.owners(owners); owners++; } catch { break; } }
        const [req, lock, count, paused, bal] = await Promise.all([
            contract.requiredSignatures(), contract.timelockDelay(),
            contract.transactionCount(), contract.paused(),
            provider.getBalance(CONFIG.CONTRACT_ADDRESS),
        ]);
        $("statOwners").textContent = owners;
        $("statReq").textContent = req.toString();
        $("statTimelock").textContent = fmtDur(Number(lock));
        $("statTx").textContent = count.toString();
        $("statPaused").textContent = paused ? "Paused" : "Live";
        $("statPaused").style.color = paused ? "var(--warning)" : "var(--success)";
        $("statContractEth").textContent = fmt(bal, 18);
    } catch (e) { log("Stats error: " + e.message, "error"); }
}

function updatePermissions() {
    const type = $("txType").value;
    const admin = type === "updateOwners" || type === "updateTimelock";
    const ok = !admin || roles.includes("ADMIN");
    $("proposeBtn").disabled = !ok;
    $("proposeSigBtn").disabled = !ok;
    if (!ok) log("Propose disabled: admin role required", "warn");
}

// ---------------------------------------------------------------- token ops
async function guard() {
    if (!contract) { toast("Not connected", "Connect wallet first", "warn"); return false; }
    if (CONFIG.CONTRACT_ADDRESS.includes("YOUR_")) {
        toast("Demo mode", "Set CONTRACT_ADDRESS in app.js to use live calls", "warn"); return false;
    }
    return true;
}

async function mint() {
    const to = $("mintTo").value.trim(), amt = $("mintAmount").value;
    if (!isAddr(to)) return toast("Invalid address", "Check recipient", "error");
    if (!(amt > 0)) return toast("Invalid amount", "Amount must be > 0", "error");
    if (!(await guard())) return;
    const btn = $("mintBtn"); spin(btn, true);
    try {
        const tx = await contract.mint(to, toWei(amt));
        log(`Mint tx: ${tx.hash}`, "info");
        await tx.wait();
        toast("Minted", `${amt} mDAI → ${short(to)}`, "success");
        await loadWallet();
    } catch (e) { toast("Mint failed", e.message, "error"); }
    finally { spin(btn, false); }
}

async function transfer() {
    const to = $("transferTo").value.trim(), amt = $("transferAmount").value;
    if (!isAddr(to)) return toast("Invalid address", "Check recipient", "error");
    if (!(amt > 0)) return toast("Invalid amount", "Amount must be > 0", "error");
    if (!(await guard())) return;
    const btn = $("transferBtn"); spin(btn, true);
    try {
        const tx = await contract.transfer(to, toWei(amt));
        await tx.wait();
        toast("Transferred", `${amt} mDAI → ${short(to)}`, "success");
        await loadWallet();
    } catch (e) { toast("Transfer failed", e.message, "error"); }
    finally { spin(btn, false); }
}

async function burn() {
    const amt = $("burnAmount").value;
    if (!(amt > 0)) return toast("Invalid amount", "Amount must be > 0", "error");
    if (!(await guard())) return;
    const btn = $("burnBtn"); spin(btn, true);
    try {
        const tx = await contract.burn(toWei(amt));
        await tx.wait();
        toast("Burned", `${amt} mDAI`, "success");
        await loadWallet();
    } catch (e) { toast("Burn failed", e.message, "error"); }
    finally { spin(btn, false); }
}

// ---------------------------------------------------------------- multisig builder
const TX_FORMS = {
    transfer: `
        <label class="field"><span>Recipient</span><input id="f_to" placeholder="0x…"></label>
        <label class="field"><span>Amount (mDAI)</span><input id="f_val" type="number" min="0" step="0.01" placeholder="100"></label>`,
    transferEth: `
        <label class="field"><span>Recipient</span><input id="f_to" placeholder="0x…"></label>
        <label class="field"><span>Amount (ETH)</span><input id="f_val" type="number" min="0" step="0.0001" placeholder="0.1"></label>`,
    contractCall: `
        <label class="field"><span>Target contract</span><input id="f_to" placeholder="0x…"></label>
        <label class="field"><span>ETH value</span><input id="f_val" type="number" min="0" step="0.0001" value="0"></label>
        <label class="field" style="grid-column:1/-1"><span>Calldata (hex)</span><textarea id="f_data" placeholder="0x…"></textarea></label>
        <label class="field"><span>Operation</span><select id="f_op"><option value="0">CALL</option><option value="1">DELEGATECALL</option></select></label>`,
    updateOwners: `
        <label class="field" style="grid-column:1/-1"><span>Owners (comma separated)</span><textarea id="f_owners" placeholder="0x…,0x…,0x…"></textarea></label>
        <label class="field"><span>Required signatures</span><input id="f_req" type="number" min="1" value="2"></label>`,
    updateTimelock: `
        <label class="field"><span>Timelock (seconds)</span><input id="f_lock" type="number" min="3600" max="2592000" value="3600"></label>
        <span class="muted" style="align-self:end">Min 1h, max 30d</span>`,
};

function renderForm() {
    const type = $("txType").value;
    $("txForm").innerHTML = TX_FORMS[type] || "";
    updatePermissions();
}

async function buildTx() {
    const type = $("txType").value;
    let to, value = 0n, data = "0x", op = 0;
    if (type === "transfer") {
        to = $("f_to").value.trim();
        const amt = $("f_val").value;
        if (!isAddr(to) || !(amt > 0)) throw new Error("Invalid recipient or amount");
        data = contract.interface.encodeFunctionData("transfer", [to, toWei(amt)]);
        to = CONFIG.CONTRACT_ADDRESS;
    } else if (type === "transferEth") {
        to = $("f_to").value.trim();
        const amt = $("f_val").value;
        if (!isAddr(to) || !(amt > 0)) throw new Error("Invalid recipient or amount");
        value = ethers.parseEther(amt);
    } else if (type === "contractCall") {
        to = $("f_to").value.trim();
        value = ethers.parseEther($("f_val").value || "0");
        data = $("f_data").value.trim() || "0x";
        op = Number($("f_op").value);
        if (!isAddr(to)) throw new Error("Invalid target");
    } else if (type === "updateOwners") {
        const owners = $("f_owners").value.split(",").map(s => s.trim()).filter(Boolean);
        const req = Number($("f_req").value);
        owners.forEach(o => { if (!isAddr(o)) throw new Error("Invalid owner " + o); });
        data = contract.interface.encodeFunctionData("updateOwners", [owners, req]);
        to = CONFIG.CONTRACT_ADDRESS;
    } else if (type === "updateTimelock") {
        const lock = Number($("f_lock").value);
        if (lock < 3600 || lock > 2592000) throw new Error("Timelock out of range");
        data = contract.interface.encodeFunctionData("updateTimelockDelay", [lock]);
        to = CONFIG.CONTRACT_ADDRESS;
    }
    return { to, value, data, op };
}

async function propose() {
    if (!(await guard())) return;
    try {
        const { to, value, data, op } = await buildTx();
        const btn = $("proposeBtn"); spin(btn, true);
        const tx = await contract.proposeTransaction(to, value, data, op);
        log(`Propose tx: ${tx.hash}`, "info");
        await tx.wait();
        toast("Proposed", "Transaction submitted for confirmation", "success");
        await loadPending();
    } catch (e) { toast("Propose failed", e.message, "error"); }
    finally { spin($("proposeBtn"), false); }
}

async function proposeSig() {
    if (!(await guard())) return;
    try {
        const { to, value, data, op } = await buildTx();
        const deadline = Math.floor(Date.now()/1000) + 3600;
        const nonce = await contract.transactionCount();
        const domain = { name: "SecureTransactionSystem", version: "1", chainId: CONFIG.CHAIN_ID, verifyingContract: CONFIG.CONTRACT_ADDRESS };
        const types = { Transaction: [
            { name: "to", type: "address" }, { name: "value", type: "uint256" },
            { name: "data", type: "bytes" }, { name: "operation", type: "uint8" },
            { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" } ] };
        const sig = await signer.signTypedData(domain, types, { to, value, data, operation: op, nonce, deadline });
        const btn = $("proposeSigBtn"); spin(btn, true);
        const tx = await contract.proposeTransactionWithSig(to, value, data, op, deadline, sig);
        await tx.wait();
        toast("Proposed (gasless)", "EIP-712 signature accepted", "success");
        await loadPending();
    } catch (e) { toast("Gasless propose failed", e.message, "error"); }
    finally { spin($("proposeSigBtn"), false); }
}

// ---------------------------------------------------------------- lists
async function loadPending() {
    const wrap = $("pendingList");
    if (!contract) { wrap.innerHTML = `<div class="empty">Connect wallet to view</div>`; return; }
    try {
        const ids = await contract.getPendingTransactions();
        if (!ids.length) { wrap.innerHTML = `<div class="empty">No pending transactions</div>`; return; }
        wrap.innerHTML = "";
        for (const id of ids) wrap.appendChild(await txCard(id, false));
    } catch (e) { wrap.innerHTML = `<div class="empty">Error: ${e.message}</div>`; }
}

async function loadHistory() {
    const wrap = $("historyList");
    if (!contract) { wrap.innerHTML = `<div class="empty">Connect wallet to view</div>`; return; }
    try {
        const count = Number(await contract.transactionCount());
        if (!count) { wrap.innerHTML = `<div class="empty">No history yet</div>`; return; }
        wrap.innerHTML = "";
        const start = Math.max(0, count - 15);
        for (let i = start; i < count; i++) {
            const [, , , , , , , , exec, canc] = await contract.getTransaction(i);
            if (exec || canc) wrap.appendChild(await txCard(i, true));
        }
        if (!wrap.children.length) wrap.innerHTML = `<div class="empty">No executed transactions yet</div>`;
    } catch (e) { wrap.innerHTML = `<div class="empty">Error: ${e.message}</div>`; }
}

async function txCard(id, isHistory) {
    const [to, value, data, op, , proposer, , execTime, exec, canc, conf] = await contract.getTransaction(id);
    const req = await contract.requiredSignatures();
    let status = "pending", label = "Pending";
    if (canc) { status = "cancelled"; label = "Cancelled"; }
    else if (exec) { status = "executed"; label = "Executed"; }
    else if (Number(conf) >= Number(req) && Date.now() >= Number(execTime) * 1000) { status = "ready"; label = "Ready"; }
    else if (Number(conf) >= Number(req)) { status = "confirmed"; label = "Confirmed"; }

    const el = document.createElement("div");
    el.className = "tx";
    el.innerHTML = `
        <div class="tx-top">
            <span class="tx-id">#${id}</span>
            <span class="pill ${status}">${label}</span>
        </div>
        <div class="tx-meta">
            <div><span>To</span><span>${short(to)}</span></div>
            <div><span>Value</span><span>${value > 0n ? ethers.formatEther(value) + " ETH" : "—"}</span></div>
            <div><span>Op</span><span>${op == 1 ? "DELEGATECALL" : "CALL"}</span></div>
            <div><span>Sigs</span><span>${conf}/${req}</span></div>
            <div><span>Proposer</span><span>${short(proposer)}</span></div>
            <div><span>Executes</span><span>${new Date(Number(execTime) * 1000).toLocaleString()}</span></div>
        </div>
        ${isHistory ? "" : `
        <div class="tx-actions">
            <button class="btn btn-sm btn-secondary" onclick="actConfirm(${id})">Confirm</button>
            <button class="btn btn-sm btn-primary" onclick="actExecute(${id})" ${status === "ready" ? "" : "disabled"}>Execute</button>
            <button class="btn btn-sm btn-ghost-danger" onclick="actCancel(${id})">Cancel</button>
        </div>`}
    `;
    return el;
}

async function actConfirm(id) {
    if (!(await guard())) return;
    try { const tx = await contract.confirmTransaction(id); await tx.wait(); toast("Confirmed", `#${id}`, "success"); await loadPending(); }
    catch (e) { toast("Confirm failed", e.message, "error"); }
}
async function actExecute(id) {
    if (!(await guard())) return;
    try { const tx = await contract.executeTransaction(id); const rc = await tx.wait(); toast("Executed", `#${id} · ${rc.status === 1 ? "ok" : "fail"}`, "success"); await loadPending(); await loadHistory(); }
    catch (e) { toast("Execute failed", e.message, "error"); }
}
async function actCancel(id) {
    if (!(await guard())) return;
    try { const tx = await contract.cancelTransaction(id); await tx.wait(); toast("Cancelled", `#${id}`, "warning"); await loadPending(); }
    catch (e) { toast("Cancel failed", e.message, "error"); }
}

// ---------------------------------------------------------------- init
function init() {
    initTheme();
    if (CONFIG.CONTRACT_ADDRESS.includes("YOUR_")) $("configAlert").style.display = "block";
    $("connectBtn").onclick = connect;
    $("mintBtn").onclick = mint;
    $("transferBtn").onclick = transfer;
    $("burnBtn").onclick = burn;
    $("txType").onchange = renderForm;
    $("proposeBtn").onclick = propose;
    $("proposeSigBtn").onclick = proposeSig;
    $("refreshPending").onclick = loadPending;
    $("refreshHistory").onclick = loadHistory;
    $("clearLogs").onclick = () => ($("console").innerHTML = "");
    renderForm();
    log("Console ready. Connect a wallet to begin.", "info");

    if (window.ethereum) {
        window.ethereum.on?.("accountsChanged", () => location.reload());
        window.ethereum.on?.("chainChanged", () => location.reload());
    }
}
document.addEventListener("DOMContentLoaded", init);