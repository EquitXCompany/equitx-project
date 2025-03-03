import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index
} from "typeorm";
import { Asset } from "./Asset";

// todo add collateral above LR histogram per asset

@Entity("cdp_metrics")
export class CDPMetrics {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @ManyToOne(() => Asset)
  @JoinColumn({ name: "asset_id" })
  asset!: Asset;

  @Column({ type: "integer" })
  active_cdps_count!: number;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  total_xlm_locked!: string;

  @Column({ type: "numeric", precision: 30, scale: 0, default: "0" })
  total_outstanding_interest!: string;
  
  @Column({ type: "numeric", precision: 30, scale: 0, default: "0" })
  total_paid_interest!: string;

  @Column({ type: "numeric", precision: 15, scale: 5 })
  collateral_ratio!: string;

  // Risk Metrics
  @Column({ type: "integer" })
  cdps_near_liquidation!: number;

  @Column({ type: "integer" })
  recent_liquidations!: number;

  @Column({ type: "integer" })
  health_score!: number;

  @Column("jsonb", { nullable: true })
  collateral_ratio_histogram!: {
    bucket_size: number;  // percentage points per bucket
    min: number; // lower boundary for first bucket (percentage above LR)
    max: number; // upper boundary for last bucket (percentage above LR)
    buckets: Array<string>; // xlm per bucket, first is number is number below min, last is number above max
  };

  // Volume Metrics
  @Column({ type: "numeric", precision: 30, scale: 0 })
  daily_volume!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  weekly_volume!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  monthly_volume!: string;

  @Index()
  @CreateDateColumn()
  timestamp!: Date;
}
