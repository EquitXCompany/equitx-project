import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index
} from "typeorm";

@Entity("protocol_stats")
export class ProtocolStats {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // Global Metrics
  @Column({ type: "numeric", precision: 30, scale: 0 })
  total_value_locked!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  total_debt!: string;

  // total xassets staked converted to usd
  @Column({ type: "numeric", precision: 30, scale: 0 })
  total_staked!: string;

  @Column({ type: "integer" })
  unique_users!: number;

  @Column({ type: "integer" })
  active_cdps!: number;

  // Risk Metrics
  @Column({ type: "numeric", precision: 12, scale: 5 })
  system_collateralization!: string;

  @Column({ type: "integer" })
  liquidation_events_24h!: number;

  @Column({ type: "numeric", precision: 10, scale: 5 })
  average_health_factor!: string;

  // Volume Metrics
  @Column({ type: "numeric", precision: 30, scale: 0 })
  daily_volume!: string;

  // Growth Metrics
  @Column({ type: "numeric", precision: 10, scale: 5 }) // percentage
  user_growth_24h!: string;

  @Column({ type: "numeric", precision: 10, scale: 5 }) // percentage
  tvl_growth_24h!: string;

  @Column({ type: "numeric", precision: 10, scale: 5 }) // percentage
  volume_growth_24h!: string;

  @Index()
  @CreateDateColumn()
  timestamp!: Date;

  @Column({ type: "boolean", default: false })
  is_latest!: boolean;
}
