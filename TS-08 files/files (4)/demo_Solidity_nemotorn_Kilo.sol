// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title SecureTransactionSystem
 * @dev Production-grade transaction system with:
 * - ERC-20 test token (MockDAI) with permit (EIP-2612)
 * - Multisig wallet (M-of-N) with timelock
 * - Role-based access control (RBAC)
 * - Reentrancy protection
 * - Emergency pause
 * - EIP-712 typed data signing for gasless transactions
 */
contract SecureTransactionSystem is
    ERC20,
    ERC20Permit,
    Ownable,
    AccessControl,
    ReentrancyGuard,
    Pausable
{
    using EnumerableSet for EnumerableSet.AddressSet;

    // ============================================================
    // CONSTANTS & IMMUTABLES
    // ============================================================
    bytes32 public constant TRANSACTION_ROLE = keccak256("TRANSACTION_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public constant MIN_TIMELOCK_DELAY = 1 hours;
    uint256 public constant MAX_TIMELOCK_DELAY = 30 days;
    uint256 public constant MIN_SIGNATURES = 1;
    uint256 public constant MAX_SIGNATURES = 20;

    // ============================================================
    // STATE VARIABLES
    // ============================================================
    address[] public owners;
    uint256 public requiredSignatures;
    uint256 public timelockDelay;

    uint256 public transactionCount;
    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmations;
    mapping(uint256 => uint256) public confirmationCount;
    EnumerableSet.AddressSet public pendingTransactions;

    mapping(uint256 => uint256) public executionTime;
    mapping(uint256 => bool) public executed;
    mapping(uint256 => bool) public cancelled;

    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public immutable TRANSACTION_TYPEHASH;
    bytes32 public immutable CONFIRMATION_TYPEHASH;

    mapping(address => uint256) public nonces;

    // ============================================================
    // STRUCTS & EVENTS
    // ============================================================
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        uint8 operation; // 0 = CALL, 1 = DELEGATECALL
        uint256 nonce;
        address proposer;
        uint256 createdAt;
    }

    event TransactionCreated(
        uint256 indexed transactionId,
        address indexed proposer,
        address indexed to,
        uint256 value,
        bytes data,
        uint8 operation,
        uint256 timelockExecutionTime
    );

    event TransactionConfirmed(
        uint256 indexed transactionId,
        address indexed confirmer,
        uint256 currentConfirmations,
        uint256 requiredConfirmations
    );

    event TransactionExecuted(
        uint256 indexed transactionId,
        address indexed executor,
        bool success,
        bytes returnData
    );

    event TransactionCancelled(
        uint256 indexed transactionId,
        address indexed canceller
    );

    event OwnersChanged(
        address[] newOwners,
        uint256 newRequiredSignatures
    );

    event TimelockDelayChanged(uint256 oldDelay, uint256 newDelay);

    event EmergencyPause(address indexed by);
    event EmergencyUnpause(address indexed by);

    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    constructor(
        address[] memory _owners,
        uint256 _requiredSignatures,
        uint256 _timelockDelay
    ) 
        ERC20("MockDAI", "mDAI")
        ERC20Permit("MockDAI")
        Ownable(msg.sender)
    {
        require(_owners.length >= MIN_SIGNATURES && _owners.length <= MAX_SIGNATURES, "Invalid owners length");
        require(_requiredSignatures >= MIN_SIGNATURES && _requiredSignatures <= _owners.length, "Invalid required signatures");
        require(_timelockDelay >= MIN_TIMELOCK_DELAY && _timelockDelay <= MAX_TIMELOCK_DELAY, "Invalid timelock delay");

        for (uint256 i = 0; i < _owners.length; i++) {
            require(_owners[i] != address(0), "Zero address owner");
            for (uint256 j = i + 1; j < _owners.length; j++) {
                require(_owners[i] != _owners[j], "Duplicate owner");
            }
        }

        for (uint256 i = 0; i < _owners.length; i++) {
            owners.push(_owners[i]);
            _grantRole(TRANSACTION_ROLE, _owners[i]);
        }
        requiredSignatures = _requiredSignatures;
        timelockDelay = _timelockDelay;

        _grantRole(EMERGENCY_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

        _mint(msg.sender, 1_000_000 * 10**18);

        DOMAIN_SEPARATOR = _buildDomainSeparator();
        TRANSACTION_TYPEHASH = keccak256(
            "Transaction(address to,uint256 value,bytes data,uint8 operation,uint256 nonce,uint256 deadline)"
        );
        CONFIRMATION_TYPEHASH = keccak256(
            "Confirmation(uint256 transactionId,address confirmer,uint256 nonce,uint256 deadline)"
        );
    }

    // ============================================================
    // EIP-712 HELPERS
    // ============================================================
    function _buildDomainSeparator() internal view returns (bytes32) {
        return keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("SecureTransactionSystem")),
            keccak256(bytes("1")),
            block.chainid,
            address(this)
        ));
    }

    function _hashTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            keccak256(abi.encode(
                TRANSACTION_TYPEHASH,
                to,
                value,
                keccak256(data),
                operation,
                nonce,
                deadline
            ))
        ));
    }

    function _hashConfirmation(
        uint256 transactionId,
        address confirmer,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            keccak256(abi.encode(
                CONFIRMATION_TYPEHASH,
                transactionId,
                confirmer,
                nonce,
                deadline
            ))
        ));
    }

    // ============================================================
    // CORE FUNCTIONS - TRANSACTION LIFECYCLE
    // ============================================================

    function proposeTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation
    ) external onlyRole(TRANSACTION_ROLE) whenNotPaused nonReentrant returns (uint256) {
        require(to != address(0), "Zero address");
        require(operation <= 1, "Invalid operation");

        uint256 transactionId = transactionCount++;
        Transaction storage tx = transactions[transactionId];
        tx.to = to;
        tx.value = value;
        tx.data = data;
        tx.operation = operation;
        tx.nonce = transactionId;
        tx.proposer = msg.sender;
        tx.createdAt = block.timestamp;

        executionTime[transactionId] = block.timestamp + timelockDelay;
        pendingTransactions.add(address(uint160(transactionId)));

        emit TransactionCreated(
            transactionId,
            msg.sender,
            to,
            value,
            data,
            operation,
            executionTime[transactionId]
        );

        _confirmTransaction(transactionId, msg.sender);
        return transactionId;
    }

    function proposeTransactionWithSig(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation,
        uint256 deadline,
        bytes calldata signature
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(block.timestamp <= deadline, "Expired signature");
        require(operation <= 1, "Invalid operation");

        bytes32 txHash = _hashTransaction(to, value, data, operation, transactionCount, deadline);
        address signer = ECDSA.recover(txHash, signature);
        require(_isOwner(signer), "Invalid signer");
        require(hasRole(TRANSACTION_ROLE, signer), "Not authorized");

        uint256 transactionId = transactionCount++;
        Transaction storage tx = transactions[transactionId];
        tx.to = to;
        tx.value = value;
        tx.data = data;
        tx.operation = operation;
        tx.nonce = transactionId;
        tx.proposer = signer;
        tx.createdAt = block.timestamp;

        executionTime[transactionId] = block.timestamp + timelockDelay;
        pendingTransactions.add(address(uint160(transactionId)));

        emit TransactionCreated(
            transactionId,
            signer,
            to,
            value,
            data,
            operation,
            executionTime[transactionId]
        );

        _confirmTransaction(transactionId, signer);
        return transactionId;
    }

    function confirmTransaction(uint256 transactionId)
        external
        onlyRole(TRANSACTION_ROLE)
        whenNotPaused
        nonReentrant
    {
        _confirmTransaction(transactionId, msg.sender);
    }

    function _confirmTransaction(uint256 transactionId, address confirmer) internal {
        require(pendingTransactions.contains(address(uint160(transactionId))), "Transaction not pending");
        require(!confirmations[transactionId][confirmer], "Already confirmed");
        require(!executed[transactionId], "Already executed");
        require(!cancelled[transactionId], "Cancelled");

        confirmations[transactionId][confirmer] = true;
        confirmationCount[transactionId]++;

        emit TransactionConfirmed(
            transactionId,
            confirmer,
            confirmationCount[transactionId],
            requiredSignatures
        );
    }

    function confirmTransactionWithSig(
        uint256 transactionId,
        uint256 deadline,
        bytes calldata signature
    ) external whenNotPaused nonReentrant {
        require(block.timestamp <= deadline, "Expired signature");
        require(pendingTransactions.contains(address(uint160(transactionId))), "Not pending");
        require(!executed[transactionId], "Executed");
        require(!cancelled[transactionId], "Cancelled");

        bytes32 confirmHash = _hashConfirmation(transactionId, msg.sender, nonces[msg.sender]++, deadline);
        address signer = ECDSA.recover(confirmHash, signature);
        require(_isOwner(signer), "Invalid signer");
        require(hasRole(TRANSACTION_ROLE, signer), "Not authorized");
        require(!confirmations[transactionId][signer], "Already confirmed");

        _confirmTransaction(transactionId, signer);
    }

    function executeTransaction(uint256 transactionId)
        external
        whenNotPaused
        nonReentrant
        returns (bool success, bytes memory returnData)
    {
        require(pendingTransactions.contains(address(uint160(transactionId))), "Not pending");
        require(!executed[transactionId], "Already executed");
        require(!cancelled[transactionId], "Cancelled");
        require(block.timestamp >= executionTime[transactionId], "Timelock not passed");
        require(confirmationCount[transactionId] >= requiredSignatures, "Insufficient confirmations");

        Transaction storage tx = transactions[transactionId];
        executed[transactionId] = true;
        pendingTransactions.remove(address(uint160(transactionId)));

        (success, returnData) = _executeCall(tx.to, tx.value, tx.data, tx.operation);

        emit TransactionExecuted(transactionId, msg.sender, success, returnData);

        return (success, returnData);
    }

    function _executeCall(
        address to,
        uint256 value,
        bytes memory data,
        uint8 operation
    ) internal returns (bool, bytes memory) {
        if (operation == 0) {
            (bool success, bytes memory ret) = to.call{value: value}(data);
            return (success, ret);
        } else {
            (bool success, bytes memory ret) = address(this).delegatecall(data);
            return (success, ret);
        }
    }

    function cancelTransaction(uint256 transactionId)
        external
        whenNotPaused
        nonReentrant
    {
        require(pendingTransactions.contains(address(uint160(transactionId))), "Not pending");
        require(!executed[transactionId], "Executed");
        require(!cancelled[transactionId], "Already cancelled");

        Transaction storage tx = transactions[transactionId];
        require(tx.proposer == msg.sender || hasRole(EMERGENCY_ROLE, msg.sender), "Not authorized");

        cancelled[transactionId] = true;
        pendingTransactions.remove(address(uint160(transactionId)));

        emit TransactionCancelled(transactionId, msg.sender);
    }

    // ============================================================
    // ADMIN FUNCTIONS
    // ============================================================

    function updateOwners(
        address[] calldata _newOwners,
        uint256 _newRequiredSignatures
    ) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        require(_newOwners.length >= MIN_SIGNATURES && _newOwners.length <= MAX_SIGNATURES, "Invalid length");
        require(_newRequiredSignatures >= MIN_SIGNATURES && _newRequiredSignatures <= _newOwners.length, "Invalid threshold");

        for (uint256 i = 0; i < owners.length; i++) {
            _revokeRole(TRANSACTION_ROLE, owners[i]);
        }

        for (uint256 i = 0; i < _newOwners.length; i++) {
            require(_newOwners[i] != address(0), "Zero address");
            for (uint256 j = i + 1; j < _newOwners.length; j++) {
                require(_newOwners[i] != _newOwners[j], "Duplicate");
            }
        }

        owners = _newOwners;
        requiredSignatures = _newRequiredSignatures;

        for (uint256 i = 0; i < owners.length; i++) {
            _grantRole(TRANSACTION_ROLE, owners[i]);
        }

        emit OwnersChanged(owners, requiredSignatures);
    }

    function updateTimelockDelay(uint256 _newDelay) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        require(_newDelay >= MIN_TIMELOCK_DELAY && _newDelay <= MAX_TIMELOCK_DELAY, "Invalid delay");
        uint256 oldDelay = timelockDelay;
        timelockDelay = _newDelay;
        emit TimelockDelayChanged(oldDelay, _newDelay);
    }

    // ============================================================
    // EMERGENCY FUNCTIONS
    // ============================================================

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
        emit EmergencyPause(msg.sender);
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
        emit EmergencyUnpause(msg.sender);
    }

    function emergencyWithdrawERC20(address token, address to, uint256 amount)
        external
        onlyRole(EMERGENCY_ROLE)
    {
        IERC20(token).safeTransfer(to, amount);
    }

    function emergencyWithdrawETH(address payable to, uint256 amount)
        external
        onlyRole(EMERGENCY_ROLE)
    {
        require(address(this).balance >= amount, "Insufficient balance");
        to.transfer(amount);
    }

    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================

    function getTransaction(uint256 transactionId) external view returns (
        address to,
        uint256 value,
        bytes memory data,
        uint8 operation,
        uint256 nonce,
        address proposer,
        uint256 createdAt,
        uint256 execTime,
        bool isExecuted,
        bool isCancelled,
        uint256 confirmationsCount
    ) {
        Transaction storage tx = transactions[transactionId];
        return (
            tx.to, tx.value, tx.data, tx.operation, tx.nonce,
            tx.proposer, tx.createdAt,
            executionTime[transactionId],
            executed[transactionId],
            cancelled[transactionId],
            confirmationCount[transactionId]
        );
    }

    function getPendingTransactions() external view returns (uint256[] memory) {
        uint256 count = pendingTransactions.length();
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = uint256(uint160(pendingTransactions.at(i)));
        }
        return result;
    }

    function getConfirmations(uint256 transactionId) external view returns (address[] memory) {
        address[] memory result = new address[](owners.length);
        uint256 count = 0;
        for (uint256 i = 0; i < owners.length; i++) {
            if (confirmations[transactionId][owners[i]]) {
                result[count] = owners[i];
                count++;
            }
        }
        return result;
    }

    function isOwner(address account) external view returns (bool) {
        return _isOwner(account);
    }

    function _isOwner(address account) internal view returns (bool) {
        return hasRole(TRANSACTION_ROLE, account);
    }

    // ============================================================
    // TOKEN FUNCTIONS
    // ============================================================

    function mint(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    // ============================================================
    // RECEIVE / FALLBACK
    // ============================================================

    receive() external payable {}

    fallback() external payable {}

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20)
        returns (bool)
    {
        return super._update(from, to, value);
    }
}

interface IERC20 {
    function safeTransfer(address to, uint256 value) external;
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}