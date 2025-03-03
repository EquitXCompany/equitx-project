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
  collateral_liquidated!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  collateral_liquidated_usd!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  principal_repaid!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  accrued_interest_repaid!: string;
  
  @Column({ type: "numeric", precision: 30, scale: 0 })
  collateral_applied_to_interest!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  collateralization_ratio!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  xlm_price!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  xasset_price!: string;

  @CreateDateColumn()
  timestamp!: Date;
}
