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

@Entity("singletons")
export class ContractState {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "varchar", length: 255 })
  key!: string;

  @Column({ type: "text" })
  value!: string;

  @Index()
  @ManyToOne(() => Asset, (asset) => asset.singletons)
  @JoinColumn({ name: "asset_id" })
  asset!: Asset;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: "boolean", default: false })
  is_deleted!: boolean;
}
