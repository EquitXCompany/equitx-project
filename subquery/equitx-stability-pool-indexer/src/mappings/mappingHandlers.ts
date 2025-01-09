import { CDP, StakePosition } from "../types";
import { SorobanEvent } from '@subql/types-soroban';

export async function handleEvent(event: SorobanEvent): Promise<void> {
  if(event.topic.includes("open_cdp")){
    await handleOpenCDP(event);
  }
  else if(event.topic.includes("deposit")){
    await handleDeposit(event);
  }
  else if(event.topic.includes("stake")){
    await handleStake(event);
  }
}

export async function handleOpenCDP(event: any): Promise<void> {
  const cdp = new CDP(
    event.lender.toHexString(),
    event.lender.toHexString(),
    event.collateral,
    event.assetLent,
    event.collateralizationRatio,
    "Open",
    event.block.timestamp,
    event.block.timestamp
  );
  await cdp.save();
}

/*export async function handleAddCollateral(event: XAssetContract.AddCollateralEvent): Promise<void> {
  const cdp = await CDP.get(event.lender.toHexString());
  if (cdp) {
    cdp.xlmDeposited = cdp.xlmDeposited.plus(event.amount);
    cdp.collateralizationRatio = event.newCollateralizationRatio;
    cdp.updatedAt = event.block.timestamp;
    await cdp.save();
  }
}

export async function handleWithdrawCollateral(event: XAssetContract.WithdrawCollateralEvent): Promise<void> {
  const cdp = await CDP.get(event.lender.toHexString());
  if (cdp) {
    cdp.xlmDeposited = cdp.xlmDeposited.minus(event.amount);
    cdp.collateralizationRatio = event.newCollateralizationRatio;
    cdp.updatedAt = event.block.timestamp;
    await cdp.save();
  }
}

export async function handleBorrowXAsset(event: XAssetContract.BorrowXAssetEvent): Promise<void> {
  const cdp = await CDP.get(event.lender.toHexString());
  if (cdp) {
    cdp.assetLent = cdp.assetLent.plus(event.amount);
    cdp.collateralizationRatio = event.newCollateralizationRatio;
    cdp.updatedAt = event.block.timestamp;
    await cdp.save();
  }
}

export async function handleRepayDebt(event: XAssetContract.RepayDebtEvent): Promise<void> {
  const cdp = await CDP.get(event.lender.toHexString());
  if (cdp) {
    cdp.assetLent = cdp.assetLent.minus(event.amount);
    cdp.collateralizationRatio = event.newCollateralizationRatio;
    cdp.updatedAt = event.block.timestamp;
    await cdp.save();
  }
}

export async function handleLiquidateCDP(event: XAssetContract.LiquidateCDPEvent): Promise<void> {
  const cdp = await CDP.get(event.lender.toHexString());
  if (cdp) {
    cdp.status = "Liquidated";
    cdp.xlmDeposited = BigInt(0);
    cdp.assetLent = BigInt(0);
    cdp.collateralizationRatio = BigInt(0);
    cdp.updatedAt = event.block.timestamp;
    await cdp.save();
  }
}

export async function handleCloseCDP(event: XAssetContract.CloseCDPEvent): Promise<void> {
  const cdp = await CDP.get(event.lender.toHexString());
  if (cdp) {
    cdp.status = "Closed";
    cdp.xlmDeposited = BigInt(0);
    cdp.assetLent = BigInt(0);
    cdp.collateralizationRatio = BigInt(0);
    cdp.updatedAt = event.block.timestamp;
    await cdp.save();
  }
}
*/
export async function handleStake(event: any): Promise<void> {
  const stakePosition = new StakePosition(
    event.staker.toHexString(),
    event.staker.toHexString(),
    event.amount,
    event.productConstant,
    event.compoundedConstant,
    event.epoch,
    event.block.timestamp,
    event.block.timestamp
  );
  await stakePosition.save();
}
/*
export async function handleUnstake(event: XAssetContract.UnstakeEvent): Promise<void> {
  const stakePosition = await StakePosition.get(event.staker.toHexString());
  if (stakePosition) {
    await StakePosition.remove(event.staker.toHexString());
  }
}
*/

export async function handleDeposit(event: any): Promise<void> {
  const stakePosition = await StakePosition.get(event.staker.toHexString());
  if (stakePosition) {
    stakePosition.xassetDeposit = stakePosition.xassetDeposit + event.amount;
    stakePosition.productConstant = event.newProductConstant;
    stakePosition.compoundedConstant = event.newCompoundedConstant;
    stakePosition.epoch = event.newEpoch;
    stakePosition.updatedAt = event.block.timestamp;
    await stakePosition.save();
  }
}

/*export async function handleWithdraw(event: XAssetContract.WithdrawEvent): Promise<void> {
  const stakePosition = await StakePosition.get(event.staker.toHexString());
  if (stakePosition) {
    stakePosition.xassetDeposit = stakePosition.xassetDeposit.minus(event.amount);
    stakePosition.productConstant = event.newProductConstant;
    stakePosition.compoundedConstant = event.newCompoundedConstant;
    stakePosition.epoch = event.newEpoch;
    stakePosition.updatedAt = event.block.timestamp;
    await stakePosition.save();
    
    // If the withdrawal results in zero deposit, remove the stake position
    if (stakePosition.xassetDeposit.equals(BigInt(0))) {
      await StakePosition.remove(event.staker.toHexString());
    } else {
      await stakePosition.save();
    }
  }
}*/