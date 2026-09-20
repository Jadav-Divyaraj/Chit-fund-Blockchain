async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying SmartChit with account:", deployer.address);

  // Monthly amount: 1 POL = 1e18 wei
  const monthlyAmount = ethers.parseEther("1");

  const SmartChit = await ethers.getContractFactory("SmartChit");
  const smartchit = await SmartChit.deploy(monthlyAmount);
  await smartchit.waitForDeployment();

  const address = await smartchit.getAddress();
  console.log("SmartChit deployed to:", address);
  console.log("Monthly amount:", ethers.formatEther(monthlyAmount), "POL");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
