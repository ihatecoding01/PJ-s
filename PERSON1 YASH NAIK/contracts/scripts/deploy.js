const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const networkName = hre.network.name;
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;

  console.log("==================================================");
  console.log(`Deploying FairWork to network: ${networkName} (Chain ID: ${chainId})`);
  console.log(`Deployer address: ${deployer.address}`);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${hre.ethers.formatEther(balance)} native tokens`);
  console.log("==================================================");

  const FairWorkFactory = await hre.ethers.getContractFactory("FairWork");
  const fairWork = await FairWorkFactory.deploy();
  await fairWork.waitForDeployment();

  const contractAddress = await fairWork.getAddress();
  console.log(`>>> FairWork deployed successfully at: ${contractAddress}`);

  // Setup paths for shared folder
  const sharedDir = fs.existsSync(path.resolve(__dirname, "../../../shared"))
    ? path.resolve(__dirname, "../../../shared")
    : path.resolve(__dirname, "../../shared");
  const abiDir = path.join(sharedDir, "abi");
  const deploymentsDir = path.join(sharedDir, "deployments");

  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Read artifact and extract ABI
  const artifactPath = path.resolve(
    __dirname,
    "../artifacts/contracts/FairWork.sol/FairWork.json"
  );

  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abiFilePath = path.join(abiDir, "FairWork.json");
    fs.writeFileSync(abiFilePath, JSON.stringify(artifact.abi, null, 2));
    console.log(`>>> Exported contract ABI to: ${abiFilePath}`);
  } else {
    console.warn(`Artifact not found at ${artifactPath}. Skipping ABI export.`);
  }

  // Write deployment info
  const deploymentInfo = {
    contract: "FairWork",
    address: contractAddress,
    network: networkName,
    chainId: Number(chainId),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    transactionHash: fairWork.deploymentTransaction()
      ? fairWork.deploymentTransaction().hash
      : null,
  };

  const deploymentFilePath = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(
    deploymentFilePath,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`>>> Exported deployment info to: ${deploymentFilePath}`);
  console.log("==================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
