import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import { CDPStatus } from "./CDP";

@Entity()
export class CDPEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 56 })
  contract_id!: string;

  @Column({ type: "varchar", length: 56 })
  lender!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  xlm_deposited!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  asset_lent!: string;

  @Column({
    type: "enum",
    enum: CDPStatus,
    default: CDPStatus.Open,
  })
  status!: CDPStatus;

  @Column("bigint")
  @Index()
  timestamp!: number;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  accrued_interest!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  interest_paid!: string;

  @Column("bigint")
  last_interest_time!: string;

  @Column()
  ledger!: number;

  @Column({ type: "varchar", length: 32, unique: true })
  event_id!: string;
}