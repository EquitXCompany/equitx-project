import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Asset } from "./Asset";

export enum TableType {
  CDP = "CDP",
  STAKE = "STAKE"
}

@Entity("last_queried_timestamps")
export class LastQueriedTimestamp {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: "asset_id" })
  asset!: Asset;

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
