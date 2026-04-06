require('dotenv').config();
require('@nomicfoundation/hardhat-ethers');

const privateKey = String(process.env.PRIVATE_KEY || '').trim();
const ganacheRpc = String(process.env.GANACHE_RPC || 'http://127.0.0.1:7545').trim();
const accounts = /^0x[0-9a-fA-F]{64}$/.test(privateKey) ? [privateKey] : [];

module.exports = {
  solidity: '0.8.20',
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      chainId: 31337,
    },
    ganache: {
      url: ganacheRpc,
      accounts,
      chainId: 1337,
    },
  },
  paths: {
    sources: './contract',
    artifacts: './blockchain/artifacts',
    cache: './blockchain/cache',
  },
};
