const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // ⚠️ Update after every redeploy

const abi = [
  "constructor(address _token)",
  "function createProposal(string memory _title, string memory _desc, uint duration) public",
  "function vote(uint index, bool support) public",
  "function getProposals() public view returns (tuple(string title, string description, uint forVotes, uint againstVotes, uint deadline)[])",
  "function proposalCount() public view returns (uint)",
  "function isActive(uint index) public view returns (bool)",
  "function hasVoted(uint, address) public view returns (bool)",
  "function governanceToken() public view returns (address)",
  "event ProposalCreated(uint indexed id, string title, uint deadline)",
  "event Voted(uint indexed id, address voter, bool support, uint weight)"
];

const tokenAbi = [
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function symbol() public view returns (string)",
  "function name() public view returns (string)"
];

let provider;
let signer;
let contract;
let tokenContract;
let isConnecting = false;
let currentFilter = "active";
let proposalCache = [];
let currentBalance = 0;
let currentAddress = "";
let isFallbackWallet = false;
const myVotes = new Set();
const demoWallets = [
  "0x742d35Cc6634C0532925a3b844Bc9e7595f44bac",
  "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
  "0x1234567890123456789012345678901234567890",
  "0x47ac0Fb4F2D84898b60Bf26Cb27071758fccF0F0"
];

const walletBtn = document.getElementById("walletBtn");
const walletStatus = document.getElementById("walletStatus");
const walletMeta = document.getElementById("walletMeta");
const tokenBalanceLabel = document.getElementById("tokenBalance");
const walletAddressDisplay = document.getElementById("walletAddressDisplay");
const walletAddressButton = document.getElementById("walletAddressButton");
const optionsAddress = document.getElementById("optionsAddress");
const optionsBalance = document.getElementById("optionsBalance");
const switchWalletBtn = document.getElementById("switchWalletBtn");
const walletOptionsBack = document.getElementById("walletOptionsBack");
const disconnectWalletBtn = document.getElementById("disconnectWalletBtn");
const createBtn = document.getElementById("createBtn");
const createSubmit = document.getElementById("createSubmit");
const closeCreate = document.getElementById("closeCreate");
const createModal = document.getElementById("createModal");
const walletModal = document.getElementById("walletModal");
const walletOptionsModal = document.getElementById("walletOptionsModal");
const walletBack = document.getElementById("walletBack");
const walletOptions = Array.from(document.querySelectorAll("[data-wallet]"));
const titleInput = document.getElementById("title");
const descInput = document.getElementById("desc");
const proposalsContainer = document.getElementById("proposals");
const toastStack = document.getElementById("toastStack");
const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));

// ─── Init ────────────────────────────────────────────────────────────────────

window.addEventListener("load", async () => {
  bindUi();
  initializeIcons();
  setWalletState(null);

  if (!window.ethereum) {
    renderEmptyState("MetaMask required", "Install MetaMask to create proposals and cast votes.");
    showToast("Wallet unavailable", "MetaMask is required for on-chain actions.", "error");
    return;
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  bindWalletEvents();
  await initializeFromExistingWallet();
});

// ─── UI Bindings ─────────────────────────────────────────────────────────────

function bindUi() {
  if (walletBtn) walletBtn.addEventListener("click", openWalletModal);

  if (walletAddressButton) {
    walletAddressButton.addEventListener("click", () => {
      if (!currentAddress) {
        openWalletModal();
        return;
      }
      openWalletOptionsModal();
    });
  }

  if (createBtn) createBtn.addEventListener("click", handleCreateClick);
  if (createSubmit) createSubmit.addEventListener("click", createProposal);
  if (closeCreate) closeCreate.addEventListener("click", closeCreateModal);
  if (walletBack) walletBack.addEventListener("click", closeWalletModal);

  if (switchWalletBtn) {
    switchWalletBtn.addEventListener("click", () => {
      closeWalletOptionsModal();
      openWalletModal();
    });
  }

  if (walletOptionsBack) walletOptionsBack.addEventListener("click", closeWalletOptionsModal);
  if (disconnectWalletBtn) disconnectWalletBtn.addEventListener("click", disconnectWallet);

  if (walletModal) {
    walletModal.addEventListener("click", (e) => {
      if (e.target === walletModal) closeWalletModal();
    });
  }

  if (walletOptionsModal) {
    walletOptionsModal.addEventListener("click", (e) => {
      if (e.target === walletOptionsModal) closeWalletOptionsModal();
    });
  }

  walletOptions.forEach((btn) => {
    btn.addEventListener("click", () => handleWalletOption(btn.dataset.wallet));
  });

  if (createModal) {
    createModal.addEventListener("click", (e) => {
      if (e.target === createModal) closeCreateModal();
    });
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter || "active";
      filterButtons.forEach((chip) => chip.classList.toggle("active", chip === btn));
      renderProposals();
    });
  });
}

// ─── Wallet Events ───────────────────────────────────────────────────────────

function bindWalletEvents() {
  window.ethereum.on("accountsChanged", async (accounts) => {
    if (!accounts.length) {
      resetWalletState();
      updateStats([]);
      updateBadges([]);
      renderEmptyState("Wallet disconnected", "Reconnect your wallet to view proposals and vote.");
      return;
    }
    await initializeFromExistingWallet();
  });

  window.ethereum.on("chainChanged", async () => {
    window.location.reload();
  });
}

// ─── Initialization ──────────────────────────────────────────────────────────

async function initializeFromExistingWallet() {
  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });

    if (!accounts.length) {
      resetWalletState();
      updateStats([]);
      updateBadges([]);
      renderEmptyState("No proposals", "Connect your wallet and create the first proposal.");
      return;
    }

    signer = await provider.getSigner();
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    if (chainId !== 31337) {
      const switched = await switchToLocalhost();
      if (!switched) {
        contract = undefined;
        renderEmptyState("Wrong network", "Switch MetaMask to Localhost 31337.");
        showToast("Wrong network", "Switch MetaMask to Localhost 31337.", "error");
      }
      return;
    }

    contract = new ethers.Contract(contractAddress, abi, signer);
    tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);

    currentBalance = await getWalletBalance();
    setWalletState(accounts[0], false);
    await loadProposals();
  } catch (error) {
    console.error("Initialization error:", error);
    renderEmptyState("Unable to initialize", "Refresh and reconnect your wallet.");
  }
}

// ─── Create Proposal ─────────────────────────────────────────────────────────

function handleCreateClick() {
  if (!contract) {
    openWalletModal();
    return;
  }
  openCreateModal();
}

async function createProposal() {
  const title = titleInput.value.trim();
  const desc = descInput.value.trim();

  if (!title || !desc) {
    showToast("Missing details", "Enter both a title and description.", "error");
    return;
  }

  if (!contract) {
    closeCreateModal();
    openWalletModal();
    showToast("MetaMask required", "Connect MetaMask before creating a proposal.", "error");
    return;
  }

  createSubmit.disabled = true;
  createSubmit.textContent = "Creating...";

  try {
    const tx = await contract.createProposal(title, desc, 300);
    showToast("Transaction submitted", "Waiting for proposal confirmation.", "info");
    await tx.wait();

    titleInput.value = "";
    descInput.value = "";
    closeCreateModal();
    showToast("Proposal created", "Your proposal is now live.", "success");
    await loadProposals();
  } catch (error) {
    console.error("Create proposal error:", error);
    showToast("Transaction failed", "Proposal creation failed. Check console.", "error");
  } finally {
    createSubmit.disabled = false;
    createSubmit.textContent = "Create Proposal";
  }
}

// ─── Load Proposals ──────────────────────────────────────────────────────────

async function loadProposals() {
  if (!contract) return;

  try {
    const proposals = await contract.getProposals();
    const address = signer ? await signer.getAddress().catch(() => null) : null;

    proposalCache = await Promise.all(proposals.map(async (proposal, index) => {
      const forVotes = Number(ethers.formatEther(proposal.forVotes));
      const againstVotes = Number(ethers.formatEther(proposal.againstVotes));
      const total = forVotes + againstVotes;
      const deadline = Number(proposal.deadline);
      const isActive = Date.now() / 1000 < deadline;

      if (address) {
        try {
          const voted = await contract.hasVoted(index, address);
          if (voted) myVotes.add(index);
        } catch (err) {
          console.error(`Could not verify vote status for proposal ${index}`, err);
        }
      }

      return {
        index,
        title: proposal.title,
        description: proposal.description,
        forVotes,
        againstVotes,
        total,
        deadline,
        isActive,
        supportPercent: total ? Math.round((forVotes / total) * 100) : 0
      };
    }));

    updateStats(proposalCache);
    updateBadges(proposalCache);
    renderProposals();
  } catch (error) {
    console.error("Load error:", error);
    showToast("Load failed", "Could not fetch proposals from the contract.", "error");
    renderEmptyState("Unable to load proposals", "Check wallet, local chain, and contract deployment.");
  }
}

// ─── Render Proposals ────────────────────────────────────────────────────────

function renderProposals() {
  if (!proposalsContainer) return;

  const filtered = proposalCache.filter((proposal) => {
    if (currentFilter === "active") return proposal.isActive;
    if (currentFilter === "closed") return !proposal.isActive;
    if (currentFilter === "my") return myVotes.has(proposal.index);
    return true;
  });

  if (!filtered.length) {
    const copy = currentFilter === "my"
      ? "You have not voted on any proposal yet"
      : "Create the first proposal";
    renderEmptyState("No proposals", copy);
    initializeIcons();
    return;
  }

  proposalsContainer.className = "mt-8 grid gap-4";
  proposalsContainer.innerHTML = filtered.map((proposal) => {
    const deadlineLabel = proposal.isActive
      ? `Ends in ${formatTimeRemaining(proposal.deadline)}`
      : `Closed ${formatClosedTime(proposal.deadline)}`;

    return `
      <article class="proposal-card px-5 py-5 md:px-6 md:py-6">
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div class="min-w-0 flex-1">
            <div class="inline-flex rounded-full border border-slate-600/45 bg-slate-800/55 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${proposal.isActive ? "text-emerald-400" : "text-slate-400"}">
              ${proposal.isActive ? "Active" : "Closed"}
            </div>
            <h3 class="mt-3 text-2xl font-bold text-white">${escapeHtml(proposal.title)}</h3>
            <p class="mt-2 text-[15px] leading-7 font-medium text-slate-400">${escapeHtml(proposal.description)}</p>
          </div>
          <div class="shrink-0 text-sm font-semibold text-slate-400">${deadlineLabel}</div>
        </div>

        <div class="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
          <div class="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style="width:${proposal.supportPercent}%;"></div>
        </div>

        <div class="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="flex flex-wrap items-center gap-5 text-sm font-semibold text-slate-300">
            <span>For <span class="text-emerald-400">${proposal.forVotes.toLocaleString()}</span></span>
            <span>Against <span class="text-rose-400">${proposal.againstVotes.toLocaleString()}</span></span>
            <span>Total <span class="text-cyan-400">${proposal.total.toLocaleString()}</span></span>
          </div>
          <div class="flex gap-3">
            <button
              class="rounded-xl border border-emerald-500/35 px-4 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              onclick="vote(${proposal.index}, true, this)"
              ${!proposal.isActive ? "disabled" : ""}
            >✅ Vote For</button>
            <button
              class="rounded-xl border border-rose-500/35 px-4 py-2 text-sm font-bold text-rose-300 hover:bg-rose-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              onclick="vote(${proposal.index}, false, this)"
              ${!proposal.isActive ? "disabled" : ""}
            >❌ Vote Against</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  initializeIcons();
}

// ─── Vote ────────────────────────────────────────────────────────────────────

async function vote(index, support, btn) {
  if (!contract) {
    openWalletModal();
    showToast("Connect wallet", "Connect MetaMask before voting.", "error");
    return;
  }

  if (btn) btn.disabled = true;

  try {
    const address = await signer.getAddress();
    const alreadyVoted = await contract.hasVoted(index, address);
    if (alreadyVoted) {
      showToast("Already voted", "You have already voted on this proposal.", "error");
      return;
    }

    const balance = await tokenContract.balanceOf(address);
    if (balance === 0n) {
      showToast("No voting power", "You need GOV tokens to vote.", "error");
      return;
    }

    const tx = await contract.vote(index, support);
    showToast("Vote submitted", "Waiting for vote confirmation.", "info");
    await tx.wait();
    myVotes.add(index);
    showToast("Vote confirmed", `You voted ${support ? "FOR ✅" : "AGAINST ❌"} the proposal.`, "success");
    await loadProposals();
    currentBalance = await getWalletBalance();
    setWalletState(address, false);
  } catch (error) {
    console.error("Vote error:", error);
    if (error?.reason) {
      showToast("Voting failed", error.reason, "error");
    } else {
      showToast("Voting failed", "The vote transaction could not be completed.", "error");
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

window.vote = vote;

// ─── Wallet Connect ──────────────────────────────────────────────────────────

async function switchToLocalhost() {
  if (!window.ethereum) return false;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x7A69' }],
    });
    return true;
  } catch (error) {
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x7A69',
            chainName: 'Localhost 8545',
            rpcUrls: ['http://127.0.0.1:8545/'],
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
          }]
        });
        return true;
      } catch (addError) {
        console.error("Failed to add network:", addError);
        return false;
      }
    }
    console.error("Failed to switch network:", error);
    return false;
  }
}

async function handleWalletOption(type) {
  if (type === "metamask") {
    await connectMetaMask();
    return;
  }
  connectFallbackWallet(type);
}

async function connectMetaMask() {
  if (isConnecting || !window.ethereum) {
    if (!window.ethereum) showToast("MetaMask missing", "Install MetaMask before connecting.", "error");
    return;
  }

  isConnecting = true;

  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    if (chainId !== 31337) {
      const switched = await switchToLocalhost();
      if (!switched) {
        contract = undefined;
        showToast("Wrong network", "Switch MetaMask to Localhost 31337.", "error");
        renderEmptyState("Wrong network", "Switch MetaMask to Localhost 31337.");
      }
      return;
    }

    contract = new ethers.Contract(contractAddress, abi, signer);
    tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);

    const address = await signer.getAddress();
    currentBalance = await getWalletBalance();
    setWalletState(address, false);
    closeWalletModal();
    showToast("Wallet connected", `Connected ${shortAddress(address)}.`, "success");
    await loadProposals();
  } catch (error) {
    console.error("Connection error:", error);
    if (error.code === 4001) {
      showToast("Connection rejected", "The wallet request was rejected.", "error");
    } else {
      showToast("Connection failed", "Unable to connect the wallet.", "error");
    }
  } finally {
    isConnecting = false;
  }
}

function connectFallbackWallet(type) {
  const address = demoWallets[Math.floor(Math.random() * demoWallets.length)];
  signer = undefined;
  contract = undefined;
  tokenContract = undefined;
  currentBalance = Math.floor(Math.random() * 9000) + 1200;
  setWalletState(address, true);
  closeWalletModal();
  showToast("Demo Wallet", `Demo wallet selected. Use MetaMask for real on-chain actions.`, "info");
}

function disconnectWallet() {
  closeWalletOptionsModal();
  closeCreateModal();
  resetWalletState();
  updateStats([]);
  updateBadges([]);
  renderEmptyState("No proposals", "Connect your wallet and create the first proposal.");
  showToast("Wallet disconnected", "Your session has been cleared.", "success");
}

function resetWalletState() {
  signer = undefined;
  contract = undefined;
  tokenContract = undefined;
  proposalCache = [];
  currentBalance = 0;
  currentAddress = "";
  isFallbackWallet = false;
  setWalletState(null);
}

// ─── Modal Helpers ───────────────────────────────────────────────────────────

function openWalletModal() {
  if (!walletModal) return;
  walletModal.classList.remove("hidden");
  walletModal.classList.add("flex");
}

function closeWalletModal() {
  if (!walletModal) return;
  walletModal.classList.add("hidden");
  walletModal.classList.remove("flex");
}

function openWalletOptionsModal() {
  if (!walletOptionsModal) return;
  if (optionsAddress) optionsAddress.textContent = shortAddress(currentAddress) || "Not Connected";
  if (optionsBalance) optionsBalance.textContent = `${formatTokenBalance(currentBalance)} GOV`;
  walletOptionsModal.classList.remove("hidden");
  walletOptionsModal.classList.add("flex");
}

function closeWalletOptionsModal() {
  if (!walletOptionsModal) return;
  walletOptionsModal.classList.add("hidden");
  walletOptionsModal.classList.remove("flex");
}

function openCreateModal() {
  if (!createModal) return;
  createModal.classList.remove("hidden");
  createModal.classList.add("flex");
  setTimeout(() => {
    if (titleInput) titleInput.focus();
  }, 100);
}

function closeCreateModal() {
  if (!createModal) return;
  createModal.classList.add("hidden");
  createModal.classList.remove("flex");
}

// ─── Wallet State ────────────────────────────────────────────────────────────

function setWalletState(address, fallback = false) {
  currentAddress = address || "";
  isFallbackWallet = fallback;
  const short = currentAddress ? shortAddress(currentAddress) : "Not Connected";

  if (walletStatus) walletStatus.textContent = currentAddress ? short : "Not Connected";

  if (walletMeta) {
    walletMeta.textContent = currentAddress ? `${fallback ? "Selected" : "Connected"} ${short}` : "";
    walletMeta.classList.toggle("hidden", !currentAddress);
  }

  if (walletAddressDisplay) walletAddressDisplay.textContent = short;
  if (tokenBalanceLabel) tokenBalanceLabel.textContent = `${formatTokenBalance(currentBalance)} GOV`;
  if (optionsAddress) optionsAddress.textContent = short;
  if (optionsBalance) optionsBalance.textContent = `${formatTokenBalance(currentBalance)} GOV`;
}

async function getWalletBalance() {
  if (!tokenContract || !signer) return 0;
  try {
    const address = await signer.getAddress();
    const balance = await tokenContract.balanceOf(address);
    return Number(ethers.formatEther(balance));
  } catch (error) {
    console.error("Balance read error:", error);
    return 0;
  }
}

// ─── Stats & Badges ──────────────────────────────────────────────────────────

function updateStats(proposals) {
  const active = proposals.filter((p) => p.isActive).length;
  const closed = proposals.length - active;
  const totalVotes = proposals.reduce((sum, p) => sum + p.total, 0);

  setText("activeCount", active);
  setText("closedCount", closed);
  setText("totalVotes", totalVotes.toLocaleString());
  setText("powerCast", totalVotes.toLocaleString());
}

function updateBadges(proposals) {
  setText("badgeActive", proposals.filter((p) => p.isActive).length);
  setText("badgeClosed", proposals.filter((p) => !p.isActive).length);
  setText("badgeMy", proposals.filter((p) => myVotes.has(p.index)).length);
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function renderEmptyState(title, copy) {
  proposalsContainer.className = "mt-8 empty-panel flex items-center justify-center text-center px-6";
  proposalsContainer.innerHTML = `
    <div>
      <i data-lucide="inbox" style="width:52px;height:52px;color:#475569;margin:0 auto 18px;display:block;"></i>
      <p class="text-[18px] font-bold text-slate-300">${escapeHtml(title)}</p>
      <p class="mt-1 text-[15px] font-semibold text-slate-500">${escapeHtml(copy)}</p>
    </div>
  `;
  initializeIcons();
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function showToast(title, message, type = "info") {
  if (!toastStack) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <strong class="block mb-1 text-sm font-bold">${escapeHtml(title)}</strong>
    <span class="text-sm font-medium text-slate-300">${escapeHtml(message)}</span>
  `;
  toastStack.appendChild(toast);

  window.setTimeout(() => toast.remove(), 3600);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeRemaining(deadline) {
  const diff = Math.max(0, deadline - Math.floor(Date.now() / 1000));
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatClosedTime(deadline) {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - deadline);
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  
  if (diff < 60) return "just now";
  if (hours < 1) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ${minutes}m ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatTokenBalance(value) {
  return Math.floor(value || 0).toLocaleString();
}

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function initializeIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
