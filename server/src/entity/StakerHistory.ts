import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from "typeorm";
import { Asset } from "./Asset";

export enum StakerHistoryAction {
  STAKE = "STAKE",           // Opening new position
  UNSTAKE = "UNSTAKE",       // Closing position
  DEPOSIT = "DEPOSIT",       // Adding to position
  WITHDRAW = "WITHDRAW",     // Partial withdrawal
  CLAIM_REWARDS = "CLAIM_REWARDS" // Claiming staking rewards
}

@Entity("staker_history")
export class StakerHistory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "char", length: 56 })
  address!: string;

  // Total amounts (snapshots)
  @Column({ type: "numeric", precision: 30, scale: 0 })
  xasset_deposit!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  product_constant!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  compounded_constant!: string;

  // total change in this transaction
  @Column({ type: "numeric", precision: 30, scale: 0, default: "0" })
  xasset_delta!: string;

  // total rewards claimed in this transaction
  @Column({ type: "numeric", precision: 30, scale: 0, default: "0" })
  rewards_claimed!: string;

  @Column({
    type: "enum",
    enum: StakerHistoryAction,
  })
  action!: StakerHistoryAction;

  @Column({ type: "varchar" })
  epoch!: string;

  @Index()
  @ManyToOne(() => Asset)
  @JoinColumn({ name: "asset_id" })
  asset!: Asset;

  // Reference to the original staker
  @Column({ type: "uuid" })
  original_staker_id!: string;

  @Column({ type: "timestamp" })
  timestamp!: Date;
}