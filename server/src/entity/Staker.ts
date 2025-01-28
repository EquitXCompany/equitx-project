import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Asset } from "./Asset";

@Entity("stakers")
export class Staker {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "varchar", length: 56 })
  address!: string;

  @Column({ type: "bigint" })
  xasset_deposit!: string;

  @Column({ type: "bigint" })
  product_constant!: string;

  @Column({ type: "bigint" })
  compounded_constant!: string;

  @Column({ type: "numeric", precision: 20, scale: 0 })
  epoch!: string;

  @ManyToOne(() => Asset, (asset) => asset.stakers)
  @JoinColumn({ name: "asset_id" })
  asset!: Asset;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: "boolean", default: false })
  is_deleted!: boolean;
}
