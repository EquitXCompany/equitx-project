import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from "typeorm";
import { Asset } from "./Asset";
import { CDPStatus } from "./CDP";

export enum CDPHistoryAction {
  OPEN = "OPEN",
  ADD_COLLATERAL = "ADD_COLLATERAL",
  WITHDRAW_COLLATERAL = "WITHDRAW_COLLATERAL",
  BORROW_ASSET = "BORROW_ASSET",
  REPAY_DEBT = "REPAY_DEBT",
  PAY_INTEREST = "PAY_INTEREST",
  FREEZE = "FREEZE",
  LIQUIDATE = "LIQUIDATE"
}

@Entity("cdp_history")
export class CDPHistory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "char", length: 56 })
  lender!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  xlm_deposited!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  asset_lent!: string;

  @Column({ type: "numeric", precision: 30, scale: 0, default: "0" })
  xlm_delta!: string;

  @Column({ type: "numeric", precision: 30, scale: 0, default: "0" })
  asset_delta!: string;

  @Column({ type: "numeric", precision: 30, scale: 0, default: "0" })
  interest_delta!: string;
  
  @Column({ type: "numeric", precision: 30, scale: 0, default: "0" })
  accrued_interest!: string;
  
  @Column({ type: "numeric", precision: 30, scale: 0, default: "0" })
  interest_paid!: string;

  @Column({
    type: "enum",
    enum: CDPHistoryAction,
  })
  action!: CDPHistoryAction;

  @Index()
  @ManyToOne(() => Asset)
  @JoinColumn({ name: "asset_id" })
  asset!: Asset;

  @Column({ type: "uuid" })
  original_cdp_id!: string;

  @Column({ type: "timestamp" })
  timestamp!: Date;
}