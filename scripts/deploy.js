const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function upsertEnvValue(filePath, key, value) {
  const normalizedValue = value ?? '';
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const line = `${key}=${normalizedValue}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  const next = pattern.test(current)
    ? current.replace(pattern, line)
    : `${current.trimEnd()}${current ? '\n' : ''}${line}\n`;

  ensureDirectory(filePath);
  fs.writeFileSync(filePath, next);
}

async function main() {
  if (hre.network.name !== 'ganache') {
    throw new Error('Use the Ganache network: npx hardhat run scripts/deploy.js --network ganache');
  }

  if (!process.env.GANACHE_RPC) {
    throw new Error('GANACHE_RPC is required in .env');
  }

  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY is required in .env');
  }

  const CertificateRegistry = await hre.ethers.getContractFactory('CertificateRegistry');
  const contract = await CertificateRegistry.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const artifactPath = path.join(
    __dirname,
    '..',
    'blockchain',
    'artifacts',
    'contract',
    'CertificateRegistry.sol',
    'CertificateRegistry.json'
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const backendConfigPath = path.join(__dirname, '..', 'backend', 'contract-config.json');
  const backendEnvPath = path.join(__dirname, '..', 'backend', '.env');
  const deployOutputPath = path.join(__dirname, '..', 'blockchain', 'deploy-output.json');

  ensureDirectory(backendConfigPath);
  fs.writeFileSync(
    backendConfigPath,
    JSON.stringify(
      {
        contractAddress,
        abi: artifact.abi,
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    deployOutputPath,
    JSON.stringify(
      {
        network: hre.network.name,
        chainId: 1337,
        rpcUrl: process.env.GANACHE_RPC,
        contractAddress,
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  upsertEnvValue(backendEnvPath, 'GANACHE_RPC', process.env.GANACHE_RPC);
  upsertEnvValue(backendEnvPath, 'PRIVATE_KEY', process.env.PRIVATE_KEY);
  upsertEnvValue(backendEnvPath, 'CHAIN_ID', '1337');
  upsertEnvValue(backendEnvPath, 'CONTRACT_ADDRESS', contractAddress);

  console.log(`CertificateRegistry deployed to: ${contractAddress}`);
  console.log(`Contract ABI saved to: ${backendConfigPath}`);
  console.log(`Backend env updated: ${backendEnvPath}`);
  console.log(`Deployment metadata saved: ${deployOutputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
