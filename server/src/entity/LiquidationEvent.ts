import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("liquidation_event")
export class LiquidationEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 56 })
  contract_id!: string;

  @Column({ type: "varchar", length: 56 })
  cdp_id!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  collateral_liquidated!: string;

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

  @Column()
  ledger!: number;

  @Column("bigint")
  @Index()
  timestamp!: number;

  @Column({ type: "varchar", length: 32, unique: true })
  event_id!: string;
}