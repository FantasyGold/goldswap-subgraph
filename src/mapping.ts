import { BigInt } from "../generated/MiningManager/node_modules/@graphprotocol/graph-ts";
import {
  MiningManager,
  Deposit,
  EmergencyWithdraw,
  OwnershipTransferred,
  Withdraw,
  AddCall,
  SetCall,
  MigrateCall,
} from "../generated/MiningManager/MiningManager";
import {
  MiningManager as MiningManagerEntity,
  MiningManagerPool,
  MiningManagerPoolData,
} from "../generated/schema";

// Exchange identifiers. Integers to save space in historical data.
const EXCHANGE_UNISWAP = 0;
const EXCHANGE_GOLDSWAP = 1;

// Seconds apart between stored data entries.
const dataInterval = 60 * 15;

export function handleDeposit(event: Deposit): void {
  let pool = MiningManagerPool.load(event.params.pid.toString());
  pool.balance = pool.balance.plus(event.params.amount);
  pool.save();

  updatePoolData(pool as MiningManagerPool, event.block.timestamp.toI32());
}

export function handleEmergencyWithdraw(event: EmergencyWithdraw): void {
  let pool = MiningManagerPool.load(event.params.pid.toString());
  pool.balance = pool.balance.minus(event.params.amount);
  pool.save();

  updatePoolData(pool as MiningManagerPool, event.block.timestamp.toI32());
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}

export function handleWithdraw(event: Withdraw): void {
  let pool = MiningManagerPool.load(event.params.pid.toString());
  pool.balance = pool.balance.minus(event.params.amount);
  pool.save();

  updatePoolData(pool as MiningManagerPool, event.block.timestamp.toI32());
}

export function handleAddPool(event: AddCall): void {
  let miningManager = MiningManager.bind(event.to);

  let poolId = miningManager.poolLength().minus(BigInt.fromI32(1));
  let poolInfo = miningManager.poolInfo(poolId);

  // Add pool.
  let pool = new MiningManagerPool(poolId.toString());
  pool.balance = BigInt.fromI32(0);
  pool.lpToken = poolInfo.value0;
  pool.allocPoint = poolInfo.value1;
  pool.lastRewardBlock = poolInfo.value2;
  pool.accDefiGoldPerShare = poolInfo.value3;
  pool.exchange = EXCHANGE_UNISWAP;
  pool.addedAt = event.block.timestamp.toI32();
  pool.save();

  // Update MiningManagerEntity.
  let miningManagerEntity = getMiningManagerEntity();
  miningManagerEntity.totalAllocPoint = miningManagerEntity.totalAllocPoint.plus(
    pool.allocPoint
  );
  miningManagerEntity.save();
}

export function handleSetPoolAllocPoint(event: SetCall): void {
  let pool = MiningManagerPool.load(event.inputs._pid.toString());

  // Update MiningManagerEntity.
  let miningManagerEntity = getMiningManagerEntity();
  miningManagerEntity.totalAllocPoint = miningManagerEntity.totalAllocPoint.plus(
    event.inputs._allocPoint.minus(pool.allocPoint)
  );
  miningManagerEntity.save();

  // Update pool.
  pool.allocPoint = event.inputs._allocPoint;
  pool.save();
}

export function handleMigrate(event: MigrateCall): void {
  let miningManager = MiningManager.bind(event.to);

  let pool = MiningManagerPool.load(event.inputs._pid.toString());
  pool.lpToken = miningManager.poolInfo(event.inputs._pid).value0;
  pool.exchange = EXCHANGE_GOLDSWAP;
  pool.save();

  updatePoolData(pool as MiningManagerPool, event.block.timestamp.toI32());
}

function updatePoolData(pool: MiningManagerPool, timestamp: i32): void {
  let quarterHourIndex = (timestamp / dataInterval) * dataInterval;
  let poolDataId = pool.id + "-" + quarterHourIndex.toString();
  let poolData = MiningManagerPoolData.load(poolDataId);

  if (poolData === null) {
    poolData = new MiningManagerPoolData(poolDataId);
    poolData.pool = pool.id;
    poolData.timestamp = timestamp;
  }

  let totalAllocPoint = getMiningManagerEntity().totalAllocPoint;
  poolData.allocShare = pool.allocPoint
    .times(BigInt.fromI32(10).pow(12))
    .div(totalAllocPoint);
  poolData.balance = pool.balance;
  poolData.exchange = pool.exchange;

  poolData.save();
}

function getMiningManagerEntity(): MiningManagerEntity {
  let entity = MiningManagerEntity.load("1");

  if (entity === null) {
    entity = new MiningManagerEntity("1");
    entity.totalAllocPoint = BigInt.fromI32(0);
    entity.save();
  }

  return entity as MiningManagerEntity;
}
