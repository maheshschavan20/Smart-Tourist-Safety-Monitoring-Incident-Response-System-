const { ethers } = require("ethers");

// Replace with your deployed contract details
const contractAddress = "0xYourContractAddress";
const abi = [ "function isVerified(bytes32 _idHash) view returns (bool)" ];

const verifyBlockchainID = async (email) => {
  if (!process.env.RPC_URL || !process.env.CONTRACT_ADDRESS) {
    console.log("Blockchain Config Missing");
    return false;
  }

  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const abi = ["function isVerified(bytes32 _idHash) view returns (bool)"];
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, provider);

    const idHash = ethers.id(email.toLowerCase());
    // Add a timeout or check if code exists at address
    const code = await provider.getCode(process.env.CONTRACT_ADDRESS);
    if (code === "0x") return false; 

    return await contract.isVerified(idHash);
  } catch (error) {
    // 🟢 FIX: Return false instead of letting the error bubble up and crash the login
    console.log("🛡️ Blockchain Offline:", error.message);
    return false; 
  }
};

module.exports = verifyBlockchainID;