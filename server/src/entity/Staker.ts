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

  @Column({ type: "numeric", precision: 30, scale: 0 }) 
  xasset_deposit!: string;

  @Column({ type: "bigint", unsigned: true })
  product_constant!: string;

  @Column({ type: "bigint", unsigned: true })
  compounded_constant!: string;

  @Column({ type: "numeric", precision: 10, scale: 0 })
  epoch!: string;

  @Column({ type: "numeric", precision: 30, scale: 0, default: "0" })
  total_rewards_claimed!: string;

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
