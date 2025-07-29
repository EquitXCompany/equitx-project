import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("liquidation_event")
export class LiquidationEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 56 })
  contract_id!: string;

  @Column({ type: "varchar", length: 56 })
  cdp_id!: string;

  @Column("decimal")
  collateral_liquidated!: string;

  @Column("decimal")
  principal_repaid!: string;

  @Column("decimal")
  accrued_interest_repaid!: string;

  @Column("decimal")
  collateral_applied_to_interest!: string;

  @Column()
  collateralization_ratio!: number;

  @Column("decimal")
  xlm_price!: string;

  @Column("decimal")
  xasset_price!: string;

  @Column()
  ledger!: number;

  @Column("bigint")
  @Index()
  timestamp!: number;

  @Column({ type: "varchar", length: 32, unique: true })
  event_id!: string;
}