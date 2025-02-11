import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index
} from "typeorm";

@Entity("user_metrics")
export class UserMetrics {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "varchar", length: 56 })
  address!: string;

  @Column({ type: "integer" })
  total_cdps!: number;

  // Active Positions
  @Column({ type: "numeric", precision: 30, scale: 0 })
  total_value_locked!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  total_debt!: string;

  @Column({ type: "numeric", precision: 15, scale: 5 })
  avg_collateralization_ratio!: string;

  // Historical Metrics
  @Column({ type: "numeric", precision: 30, scale: 0 })
  total_volume!: string;

  @Column({ type: "integer" })
  liquidations_received!: number;

  @Column({ type: "integer" })
  liquidations_executed!: number;

  // Risk Profile
  @Column({ type: "integer" })
  risk_score!: number;

  @Column({ type: "timestamp" })
  last_activity!: Date;

  @Column({ type: "integer" }) // stored in seconds
  avg_position_duration!: number;

  @Index()
  @CreateDateColumn()
  timestamp!: Date;
}
