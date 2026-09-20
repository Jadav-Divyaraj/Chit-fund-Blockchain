const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MyToken", function () {
  let Token, token, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    Token = await ethers.getContractFactory("MyToken");
    token = await Token.deploy();
    await token.waitForDeployment();
  });

  it("has correct name and symbol and initial supply", async function () {
    expect(await token.name()).to.equal("MyToken");
    expect(await token.symbol()).to.equal("MTK");
    const total = await token.totalSupply();
    expect(total).to.be.gt(0);
    const ownerBal = await token.balanceOf(owner.address);
    expect(ownerBal).to.equal(total);
  });

  it("allows transfers", async function () {
    const amount = ethers.parseUnits("100", 18);
    await token.transfer(addr1.address, amount);
    expect(await token.balanceOf(addr1.address)).to.equal(amount);
  });

  it("owner can mint, others cannot", async function () {
    const amount = ethers.parseUnits("1000", 18);
    await token.mint(addr1.address, amount);
    expect(await token.balanceOf(addr1.address)).to.equal(amount);

    await expect(token.connect(addr1).mint(addr2.address, amount)).to.be.reverted;
  });
});
