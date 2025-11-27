// *** KONFIGURÁCIA ***
// Qubeart NFT kontrakt na Qubetics mainnete
const NFT_CONTRACT_ADDRESS = "0x408ef3E7C37E4433D8cF9218c60204ccC59216E3";

// Minimalny ABI pre ERC721 (safeMint nepotrebujeme na front, stačí čítanie)
const NFT_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function tokenURI(uint256 tokenId) view returns (string)",
];

// Aké tokenId chceme skúšať načítať (teraz vieš, že existuje 1)
const TOKEN_IDS = [1]; // neskôr pridáš [1,2,3,...]

let provider;
let signer;
let currentAccount = null;

async function connectWallet() {
    if (!window.ethereum) {
        alert("MetaMask nie je nainštalovaný. Nainštaluj si ho a skús znova.");
        return;
    }

    try {
        // Požiadať MetaMask o prístup
        const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
        });

        currentAccount = accounts[0];
        document.getElementById("walletAddress").innerText =
            "Connected: " + currentAccount;

        // Vytvoríme ethers provider + signer
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();

        // (Voliteľne) môžeš skontrolovať sieť, ale chainId Qubetics necháme zatiaľ voľné
        // const network = await provider.getNetwork();
        // console.log("Network:", network);

        // Po pripojení rovno načítame NFT
        await loadNFTsForAddress(currentAccount);
    } catch (err) {
        console.error(err);
        alert("Nepodarilo sa pripojiť peňaženku.");
    }
}

async function loadNFTsForAddress(address) {
    const container = document.getElementById("nftContainer");
    container.innerHTML = "Loading NFTs...";

    try {
        const contract = new ethers.Contract(
            NFT_CONTRACT_ADDRESS,
            NFT_ABI,
            provider
        );

        const cards = [];

        for (const tokenId of TOKEN_IDS) {
            try {
                const owner = await contract.ownerOf(tokenId);
                // Zobrazíme len NFT, ktoré vlastní pripojený užívateľ
                if (owner.toLowerCase() !== address.toLowerCase()) {
                    continue;
                }

                let tokenUri = await contract.tokenURI(tokenId);
                // Ak je to ipfs://, prehodíme na https bránu
                if (tokenUri.startsWith("ipfs://")) {
                    tokenUri = tokenUri.replace(
                        "ipfs://",
                        "https://ipfs.io/ipfs/"
                    );
                }

                let meta = null;
                try {
                    const res = await fetch(tokenUri);
                    meta = await res.json();
                } catch (e) {
                    console.warn("Nepodarilo sa načítať metadata pre tokenId", tokenId, e);
                }

                const card = document.createElement("div");
                card.className = "nft-card";

                const title = meta?.name || `Qubeart #${tokenId}`;
                const desc = meta?.description || "No description";

                card.innerHTML = `
                    <h3>${title}</h3>
                    ${
                        meta?.image
                            ? `<img src="${fixImageUrl(meta.image)}" alt="${title}" />`
                            : "<div style='height:120px;display:flex;align-items:center;justify-content:center;border:1px dashed #555;'>No image</div>"
                    }
                    <p style="font-size:12px;color:#aaa;">Token ID: ${tokenId}</p>
                    <p style="font-size:13px;">${desc}</p>
                `;

                cards.push(card);
            } catch (e) {
                // ownerOf môže zlyhať, ak tokenId ešte neexistuje
                console.log(`TokenId ${tokenId} asi neexistuje`, e);
            }
        }

        container.innerHTML = "";

        if (cards.length === 0) {
            container.innerText = "Žiadne Qubeart NFT na tejto adrese (podľa zoznamu TOKEN_IDS).";
        } else {
            cards.forEach((c) => container.appendChild(c));
        }
    } catch (err) {
        console.error(err);
        container.innerText = "Chyba pri načítavaní NFT.";
    }
}

function fixImageUrl(image) {
    // Ak budeš používať ipfs:// v metadata
    if (image.startsWith("ipfs://")) {
        return image.replace("ipfs://", "https://ipfs.io/ipfs/");
    }
    return image;
}

// Event handler na tlačidlo
document.getElementById("connectWallet").addEventListener("click", connectWallet);
