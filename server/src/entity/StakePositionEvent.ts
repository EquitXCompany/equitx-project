import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity()  // Table name: stake_position_${wasmHash}
export class StakePositionEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 56 })
  contract_id!: string;

  @Column({ type: "varchar", length: 56 })
  address!: string;  // id: Address

  @Column("decimal")
  xasset_deposit!: string;

  @Column("decimal")
  product_constant!: string;

  @Column("decimal")
  compounded_constant!: string;

  @Column("decimal")
  rewards_claimed!: string;

  @Column("bigint")
  epoch!: string;

  @Column()
  ledger!: number;

  @Column("bigint")
  @Index()
  timestamp!: number;

  @Column({ type: "varchar", length: 32, unique: true })
  event_id!: string;
}