# VanAdhikar Chain — System Architecture (TS-08)

> Forest Rights Ledger on Polygon Amoy · 2026

A two-app web stack built on a single production-grade Solidity contract, demonstrating immutable community forest rights management for Gujarat.

---

## 🏛️ High-Level Architecture

```mermaid
flowchart TB
    %% Users
    subgraph USERS["👥 LAYER 0 · Stakeholders"]
        direction LR
        FAM["👨‍👩‍👧 Forest Families<br/>Gujarat · Claim holders"]
        DTDO["⚖️ DTDO Officials<br/>Tribal Dept · Adjudicators"]
        COOP["🏛️ Cooperative Admins<br/>Multisig co-signers"]
        TEST["🧑‍💻 Testers<br/>Demo / judges"]
    end

    %% Frontend - VanAdhikar
    subgraph VAN["📊 LAYER 1 · Frontend — VanAdhikar (Forest Rights Ledger)"]
        direction LR
        IDX["index.html<br/>📍 files (4)/<br/>9 pages · Main dashboard"]
        FAM2["family.html<br/>📱 Gujarati invoice view"]
        SEC["security.html<br/>🔒 Attack-scenario demo"]
        CSS["style.css<br/>🎨 Light theme · Gujarati fonts"]
        APP1["app.js<br/>⚙️ ethers v5.7.2<br/>📍 working files/files (6)/"]
        SPLIT["split_html.py<br/>🐍 Build tool"]
        MONO["forest-rights-ledger.html<br/>📦 96 KB monolith (source)"]
    end

    %% Frontend - Kilo
    subgraph KILO["🖥️ LAYER 2 · Frontend — SecureTx / Kilo (Transaction Console)"]
        direction LR
        KD["kilo_demo.html<br/>4 views · Dark theme"]
        KCSS["kilo_demo.css<br/>Console aesthetic"]
        APP2["app.js<br/>⚙️ ethers v6.11.1<br/>📍 files (4)/"]
    end

    %% Web3 bridge
    subgraph WEB3["🔗 LAYER 3 · Web3 Bridge"]
        direction LR
        MM["🦊 MetaMask<br/>window.ethereum"]
        RPC["📡 JSON-RPC<br/>eth_call / eth_sendTransaction"]
        ABI["📋 ABI Bindings<br/>26 functions exposed"]
    end

    %% Blockchain
    subgraph BC["🌐 LAYER 4 · Blockchain (Polygon Amoy · Chain ID 80002)"]
        direction LR
        SOL["📜 SecureTransactionSystem.sol<br/>mDAI · Multisig · RBAC<br/>EIP-712 · ReentrancyGuard · Pausable"]
        OZ["📦 OpenZeppelin v5.x<br/>ERC20 · Permit · AccessControl<br/>Ownable · ECDSA · EnumerableSet"]
        POLY["🟣 Polygon Amoy<br/>~2s blocks · Low gas<br/>Contract: 0x5a82…A47Ce"]
    end

    %% External
    subgraph EXT["🌍 LAYER 5 · External Services & CDNs"]
        direction LR
        ETHJS["📚 ethers.js<br/>v5.7.2 / v6.11.1"]
        QR["📱 QRCode.js 1.0.0"]
        GF["🔤 Google Fonts<br/>Tiro Devanagari · Space Grotesk<br/>JetBrains Mono"]
        PS["🔍 PolygonScan Amoy"]
    end

    %% Connections - Users to Frontend
    FAM -.->|View invoice| IDX
    FAM -.->|QR access| FAM2
    DTDO -.->|Review disputes| IDX
    COOP -.->|Manage payments| IDX
    TEST -.->|Attack scenarios| SEC
    TEST -.->|Console tour| KD

    %% Within VanAdhikar
    IDX --> APP1
    FAM2 --> APP1
    SEC --> APP1
    IDX --> CSS
    FAM2 --> CSS
    SEC --> CSS
    MONO --> SPLIT
    SPLIT -->|generates| IDX
    SPLIT -->|generates| CSS
    SPLIT -->|generates| APP1

    %% Within Kilo
    KD --> APP2
    KD --> KCSS

    %% Frontend to Web3
    APP1 -->|sign + send| MM
    APP2 -->|sign + send| MM
    MM --> RPC
    RPC --> ABI
    ABI --> SOL

    %% Blockchain internal
    SOL --> OZ
    OZ --> POLY
    SOL --> POLY

    %% External services
    APP1 -.->|CDN| ETHJS
    APP2 -.->|CDN| ETHJS
    FAM2 -.->|CDN| QR
    IDX -.->|CDN| GF
    FAM2 -.->|CDN| GF
    PS -.->|verify| POLY

    %% Styling
    classDef user fill:#1f2937,stroke:#94a3b8,color:#fff
    classDef van fill:#143524,stroke:#52b788,color:#fff
    classDef kilo fill:#3a2a08,stroke:#d4a017,color:#fff
    classDef web3 fill:#0c2440,stroke:#3b82f6,color:#fff
    classDef bc fill:#2a1740,stroke:#a855f7,color:#fff
    classDef ext fill:#3a1010,stroke:#ef4444,color:#fff

    class FAM,DTDO,COOP,TEST user
    class IDX,FAM2,SEC,CSS,APP1,SPLIT,MONO van
    class KD,KCSS,APP2 kilo
    class MM,RPC,ABI web3
    class SOL,OZ,POLY bc
    class ETHJS,QR,GF,PS ext
```

---

## 🔄 Data Flow — A Family's Payment Journey

```mermaid
sequenceDiagram
    autonumber
    actor F as 👨‍👩‍👧 Family
    actor C as 🏛️ Co-op Admin
    participant UI as 📊 VanAdhikar UI
    participant MM as 🦊 MetaMask
    participant BC as 📜 Contract
    participant PS as 🔍 PolygonScan

    F->>UI: Open family.html via QR
    UI->>MM: Connect wallet
    MM-->>UI: Address + POL balance
    UI->>BC: getEntitlement(familyId)
    BC-->>UI: 1000 POL entitled
    C->>UI: Record payment (800 POL)
    UI->>MM: Sign payment tx
    MM->>BC: recordPayment(family, 800)
    BC-->>MM: ✅ Tx hash 0xabc...
    MM-->>UI: Confirmation
    UI-->>F: Updated invoice (underpayment ⚠️)
    UI->>PS: Link to verify
    PS-->>F: On-chain proof
```

---

## 🔄 Data Flow — SecureTx Multisig Transaction

```mermaid
sequenceDiagram
    autonumber
    actor A1 as 👤 Owner 1
    actor A2 as 👤 Owner 2
    participant K as 🖥️ Kilo Console
    participant MM as 🦊 MetaMask
    participant BC as 📜 Multisig

    A1->>K: Build tx (transfer 100 mDAI)
    K->>MM: proposeTransaction(...)
    MM->>BC: proposeTransaction()
    BC-->>K: txId = 5
    A2->>K: Review pending
    K->>MM: confirmTransaction(5)
    MM->>BC: confirmTransaction(5)
    BC-->>K: 2/2 confirmations ✓
    Note over BC: Timelock active<br/>(1h–30d configurable)
    A1->>K: Execute tx 5
    K->>MM: executeTransaction(5)
    MM->>BC: executeTransaction(5)
    BC-->>K: ✅ Executed · 100 mDAI transferred
```

---

## 🧱 Smart Contract Inheritance Tree

```mermaid
classDiagram
    direction LR
    class SecureTransactionSystem {
        +owners[]
        +requiredSignatures
        +timelockDelay
        +transactionCount
        +proposeTransaction()
        +confirmTransaction()
        +executeTransaction()
        +cancelTransaction()
    }
    class ERC20 {
        +name
        +symbol
        +totalSupply
        +balanceOf()
        +transfer()
        +approve()
    }
    class ERC20Permit {
        +permit()
        +nonces
        +DOMAIN_SEPARATOR
    }
    class Ownable {
        +owner
        +renounceOwnership()
        +transferOwnership()
    }
    class AccessControl {
        +hasRole()
        +grantRole()
        +revokeRole()
    }
    class ReentrancyGuard {
        +nonReentrant modifier
    }
    class Pausable {
        +paused
        +pause()
        +unpause()
    }

    SecureTransactionSystem --|> ERC20
    SecureTransactionSystem --|> ERC20Permit
    SecureTransactionSystem --|> Ownable
    SecureTransactionSystem --|> AccessControl
    SecureTransactionSystem --|> ReentrancyGuard
    SecureTransactionSystem --|> Pausable
    ERC20Permit --|> ERC20
```

---

## 📂 Project Structure

```
TS-08 files/
│
├── architecture.html              ← 🌐 Interactive SVG diagram (open in browser)
├── ARCHITECTURE.md                ← 📝 This file (Mermaid diagrams)
│
├── .qodo/                         (Qodo AI agent config — empty)
│
└── files (4)/
    │
    ├── 🌳 VANADHIKAR (Forest Rights Ledger)
    │   ├── index.html              Main dashboard (9 pages)
    │   ├── family.html             Gujarati invoice view
    │   ├── security.html           Attack-scenario demo
    │   ├── style.css               Light theme · Gujarati fonts
    │   └── (app.js lives in working files/files (6)/)
    │
    ├── 🖥️ KILO / SECURETX (Transaction Console)
    │   ├── kilo_demo.html          Dark-theme console (4 views)
    │   ├── kilo_demo.css           Console aesthetic
    │   └── app.js                  ethers v6.11.1 controller
    │
    ├── 📜 SMART CONTRACT
    │   └── demo_Solidity_nemotorn_Kilo.sol
    │       SecureTransactionSystem (mDAI + Multisig + RBAC)
    │
    ├── 🛠️ BUILD TOOL
    │   └── split_html.py           Splits monolith → index/css/js
    │
    ├── 📦 SOURCE
    │   └── forest-rights-ledger (1).html
    │       96 KB monolithic source
    │
    └── 🗂️ ARCHIVES
        ├── files (4).zip
        └── working files/
            ├── .vscode/settings.json   (Live Server :5501)
            └── files (6)/              (earlier iteration)
                ├── app.js
                ├── family.html
                ├── index.html
                ├── security.html
                └── style.css
```

---

## 🔐 Security Properties (End-to-End)

| Layer | Protection |
|-------|------------|
| Frontend | Input validation, address regex, error toasts |
| Web3 | MetaMask confirmation, signed messages |
| Smart Contract | `ReentrancyGuard`, `Pausable`, `AccessControl` (4 roles), `ECDSA` (EIP-712) |
| Multisig | M-of-N, timelock 1h–30d, cancel-on-demand |
| Token | EIP-2612 permit (gasless approvals), role-gated mint/burn |
| Data | No DELETE / No EDIT functions → on-chain immutability |

---

## 🌐 Network Details

| Item | Value |
|------|-------|
| Network | Polygon Amoy Testnet |
| Chain ID | `80002` |
| Deployed Contract | `0x5a8249c23afCaFb14585f07948Fb9762379A47Ce` |
| RPC | Public Amoy endpoint |
| Explorer | https://amoy.polygonscan.com |
| Block time | ~2 seconds |
| Token | POL (native) + mDAI (ERC-20) |

---

*Generated for TS-08 · VanAdhikar Chain · 2026*
