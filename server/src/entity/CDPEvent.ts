import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import { CDPStatus } from "./CDP";

@Entity()
export class CDPEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 56 })
  contract_id!: string;  // xasset contract ID

  @Column({ type: "varchar", length: 56 })
  lender!: string;  // id: Address

  @Column("decimal")
  xlm_deposited!: string;  // i128 as string (BigNumber)

  @Column("decimal")
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

  @Column("decimal")
  accrued_interest!: string;

  @Column("decimal")
  interest_paid!: string;

  @Column("bigint")
  last_interest_time!: string;

  @Column()
  ledger!: number;

  @Column({ type: "varchar", length: 32, unique: true })
  event_id!: string;
}