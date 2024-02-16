require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      chainId: 11155111,
      url: SEPOLIA_RPC_URL,
      account: [PRIVATE_KEY],
    }
  },
  solidity: "0.8.20",
  namedAccounts: {
    deployer: {
      default: 0,
      1: 0
    },
    account1: {
      default: 1,
      1: 1
    },
    account2: {
      default: 2,
      1: 2
    }
  }
};
