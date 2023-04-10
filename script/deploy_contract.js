const hre = require("hardhat");
const namehash = require('eth-ens-namehash');
const ethers = hre.ethers;
const utils = ethers.utils;
const labelhash = (label) => utils.keccak256(utils.toUtf8Bytes(label))
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
async function main() {
  const signers = await ethers.getSigners();
  const accounts = signers.map(s => s.address)
  
  // 1.deploy ENSRegistry
  const ENSRegistry = await ethers.getContractFactory("ENSRegistry")
  const registry = await ENSRegistry.deploy()
  await registry.deployed()
  console.log('Deployed ENSRegistry to:', registry.address);

  // 2.deploy BaseRegistrarImplementation
  const BaseRegistrar = await ethers.getContractFactory("BaseRegistrarImplementation")
  const baseRegistrar = await BaseRegistrar.deploy(registry.address, namehash.hash('dao'));
  await baseRegistrar.deployed()
  console.log('Deployed BaseRegistrarImplementation to:', baseRegistrar.address);

  // 3.deploy StaticMetadataService
  const StaticMetadataService = await ethers.getContractFactory("StaticMetadataService")
  const staticMetadataService = await StaticMetadataService.deploy("https://app.dao.domains");
  await staticMetadataService.deployed()
  console.log('Deployed StaticMetadataService to:', staticMetadataService.address);

  // 4.deploy NameWrapper
  const NameWrapper = await ethers.getContractFactory("NameWrapper")
  const nameWrapper = await NameWrapper.deploy(registry.address, baseRegistrar.address, staticMetadataService.address);
  await nameWrapper.deployed()
  console.log('Deployed NameWrapper to:', nameWrapper.address);

  // 5.deploy PublicResolver
  const PublicResolver = await ethers.getContractFactory("PublicResolver")
  const publicResolver = await PublicResolver.deploy(registry.address, nameWrapper.address);
  await publicResolver.deployed()
  console.log('Deployed PublicResolver to:', publicResolver.address);

  // 6.deploy DummyOracle
  const DummyOracle = await ethers.getContractFactory("DummyOracle")
  const dummyOracle = await DummyOracle.deploy(2);
  await dummyOracle.deployed()
  console.log('Deployed dummyOracle to:', dummyOracle.address);

  // 7.deploy StablePriceOracle
  const StablePriceOracle = await ethers.getContractFactory("StablePriceOracle")
  const stablePriceOracle = await StablePriceOracle.deploy(dummyOracle.address, [0, 0, 4, 2, 1]);
  await stablePriceOracle.deployed()
  console.log('Deployed StablePriceOracle to:', stablePriceOracle.address);

  // 8.deploy ETHRegistrarController
  const ETHRegistrarController = await ethers.getContractFactory("ETHRegistrarController")
  const ethRegistrarController = await ETHRegistrarController.deploy(baseRegistrar.address, stablePriceOracle.address, 60, 86400);
  await ethRegistrarController.deployed()
  console.log('Deployed ETHRegistrarController to:', ethRegistrarController.address);


  // set subnodeOwner
  const setOwner = await registry.setSubnodeOwner(ZERO_HASH, labelhash('dao'), accounts[0])
  console.log('setSubnodeOwner:', setOwner);
  await setOwner.wait();

  // set resolver
  const setResolver = await registry.setResolver(namehash.hash('dao'), publicResolver.address)
  console.log('setResolver:', setResolver);
  await setResolver.wait();



  const setOwner1 = await registry.setSubnodeOwner(namehash.hash('dao'), labelhash('resolver'), accounts[0]);
  console.log('setSubnodeOwner1:', setOwner1);
  await setOwner1.wait();

  const setResolver1 = await registry.setResolver(namehash.hash('resolver.dao'), publicResolver.address)
  console.log('setResolver1:', setResolver1);
  await setResolver1.wait();



  const setOwner2 = await registry.setSubnodeOwner(namehash.hash('dao'), labelhash('data'), accounts[0]);
  console.log('setSubnodeOwner2:', setOwner2);
  await setOwner2.wait();

  const setResolver2 = await registry.setResolver(namehash.hash('data.dao'), publicResolver.address)
  console.log('setResolver2:', setResolver2);
  await setResolver2.wait();



  const setOwner3 = await registry.setSubnodeOwner(namehash.hash('data.dao'), labelhash('eth-usd'), accounts[0]);
  console.log('setSubnodeOwner3:', setOwner3);
  await setOwner3.wait();

  const setResolver3 = await registry.setResolver(namehash.hash('eth-usd.data.dao'), publicResolver.address)
  console.log('setResolver3:', setResolver3);
  await setResolver3.wait();

  // add controller
  const addController = await baseRegistrar.addController(ethRegistrarController.address)
  console.log('BaseRegistrarImplementation addController:', addController);
  await addController.wait();

  // set publicResolver
  const tx = await publicResolver.setInterface(namehash.hash('dao'), "0x018fac06", ethRegistrarController.address)
  console.log("tx = ", tx)
  await tx.wait();

  const tx1 = await publicResolver['setAddr(bytes32,address)'](namehash.hash('resolver.dao'), publicResolver.address)
  console.log("tx1 = ", tx1)
  await tx1.wait();

  const tx2 = await publicResolver['setAddr(bytes32,address)'](namehash.hash('eth-usd.data.dao'), dummyOracle.address)
  console.log("tx2 = ", tx2)
  await tx2.wait();



  // 2.set eth owner
  const setOwner4 = await registry.setSubnodeOwner(ZERO_HASH, labelhash('dao'), baseRegistrar.address);
  console.log('setSubnodeOwner4:', setOwner4);
  await setOwner4.wait();
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });