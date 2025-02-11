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

  // Number of active CDPs
  @Column({ type: "integer" })
  active_cdps_count!: number;

  // Dollar value of TVL (using XLM price at the time)
  @Column({ type: "numeric", precision: 30, scale: 0 })
  tvl_usd!: string;

  @Index()
  @CreateDateColumn()
  timestamp!: Date;
}
