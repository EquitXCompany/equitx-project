import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn, 
  UpdateDateColumn,
} from "typeorm";

export enum TableType {
  CDP = "CDP",
  STAKE = "STAKE"
}

@Entity("last_queried_timestamps") 
export class LastQueriedTimestamp {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 32 })
  wasm_hash!: string;

  @Column({
    type: "enum",
    enum: TableType,
  })
  table_type!: TableType;

  @Column({ type: "bigint" })
  timestamp!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn() 
  updated_at!: Date;
}