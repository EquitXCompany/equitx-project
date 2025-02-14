import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from "typeorm";
import { Asset } from "./Asset";

@Entity("tvl_metrics")
export class TVLMetrics {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @ManyToOne(() => Asset)
  @JoinColumn({ name: "asset_id" })
  asset!: Asset;

  // Total XLM locked in CDPs
  @Column({ type: "numeric", precision: 30, scale: 0 })
  total_xlm_locked!: string;

  // Total xAssets minted
  @Column({ type: "numeric", precision: 30, scale: 0 })
  total_xassets_minted!: string;

  // Total xAssets minted in USD
  @Column({ type: "numeric", precision: 30, scale: 0 })
  total_xassets_minted_usd!: string;

  // Number of active CDPs
  @Column({ type: "integer" })
  active_cdps_count!: number;

  // Dollar value of TVL (using XLM price at the time)
  @Column({ type: "numeric", precision: 30, scale: 0 })
  tvl_usd!: string;

  // Total xAssets staked
  @Column({ type: "numeric", precision: 30, scale: 0 })
  total_xassets_staked!: string;

  // Total xAssets staked in USD
  @Column({ type: "numeric", precision: 30, scale: 0 })
  total_xassets_staked_usd!: string;

  // Number of open accounts
  @Column({ type: "integer" })
  open_accounts!: number;

  @Column("jsonb", { nullable: true })
  staked_share_histogram!: {
    bucket_size: number;  // percentage points per bucket (0.5)
    min: number; // lower boundary for first bucket (0)
    max: number; // upper boundary for last bucket (50)
    buckets: Array<string>; // staked amount per bucket, first is below min, last is above max
  };

  @Index()
  @CreateDateColumn()
  timestamp!: Date;
}
