import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity()  // Table name: stake_position_${wasmHash}
export class StakePositionEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 56 })
  contract_id!: string;

  @Column({ type: "varchar", length: 56 })
  address!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  xasset_deposit!: string;

  @Column({ type: "bigint", unsigned: true })
  product_constant!: string;

  @Column({ type: "bigint", unsigned: true })
  compounded_constant!: string;

  @Column({ type: "numeric", precision: 30, scale: 0 })
  rewards_claimed!: string;

  @Column({ type: "numeric", precision: 10, scale: 0 })
  epoch!: string;

  @Column()
  ledger!: number;

  @Column("bigint")
  @Index()
  timestamp!: number;

  @Column({ type: "varchar", length: 32, unique: true })
  event_id!: string;
}