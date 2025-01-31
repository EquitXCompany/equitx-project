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

  @Column({ type: "bigint" })
  xlm_deposited!: string;

  @Column({ type: "bigint" })
  asset_lent!: string;

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

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: "boolean", default: false })
  is_deleted!: boolean;
}