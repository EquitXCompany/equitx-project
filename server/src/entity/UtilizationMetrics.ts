import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from "typeorm";
import { Asset } from "./Asset";

@Entity("utilization_metrics")
export class UtilizationMetrics {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @ManyToOne(() => Asset)
  @JoinColumn({ name: "asset_id" })
  asset!: Asset;

  // Daily active users (unique addresses interacting)
  @Column({ type: "integer" })
  daily_active_users!: number;

  // Daily transaction count
  @Column({ type: "integer" })
  daily_transactions!: number;

  // Daily volume of XLM deposited
  @Column({ type: "numeric", precision: 30, scale: 0 })
  daily_xlm_volume!: string;

  // Daily volume of xAssets minted
  @Column({ type: "numeric", precision: 30, scale: 0 })
  daily_xasset_volume!: string;

  @Index()
  @CreateDateColumn()
  timestamp!: Date;
}
