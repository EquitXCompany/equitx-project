import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Asset } from "./Asset";

@Entity("last_queried_timestamps")
export class LastQueriedTimestamp {
  @PrimaryColumn({ type: "uuid" })
  asset_id!: string;

  @OneToOne(() => Asset, (asset) => asset.lastQueriedTimestamp)
  @JoinColumn({ name: "asset_id" })
  asset!: Asset;

  @Column({ type: "bigint" })
  timestamp!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
