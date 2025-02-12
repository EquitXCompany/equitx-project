import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { CDP } from "./CDP";
import { Asset } from "./Asset";

@Entity("liquidations")
export class Liquidation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => CDP)
  @JoinColumn({ name: "cdp_id" })
  cdp!: CDP;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: "asset_id" })
  asset!: Asset;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  xlm_liquidated!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  xlm_liquidated_usd!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  debt_covered!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  collateralization_ratio!: string;

  @CreateDateColumn()
  timestamp!: Date;
}
