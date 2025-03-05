import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Asset } from "./Asset";

export enum CDPStatus {
  Open = 0,
  Insolvent = 1,
  Frozen = 2,
  Closed = 3,
}

@Entity("cdps")
export class CDP {
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
  accrued_interest!: string;
  
  @Column({ type: "numeric", precision: 30, scale: 0, default: "0" }) 
  interest_paid!: string;
  
  @Column({ type: "bigint", default: "0" }) 
  last_interest_time!: string;

  @Column({
    type: "enum",
    enum: CDPStatus,
    default: CDPStatus.Open,
  })
  status!: CDPStatus;

  @Index()
  @ManyToOne(() => Asset, (asset) => asset.cdps)
  @JoinColumn({ name: "asset_id" })
  asset!: Asset;

  @Column({ type: "timestamp" })
  created_at!: Date;

  @Column({ type: "timestamp" })
  updated_at!: Date;

  @Column({ type: "boolean", default: false })
  is_deleted!: boolean;
}