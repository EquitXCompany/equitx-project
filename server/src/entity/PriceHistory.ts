import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Asset } from "./Asset";

@Entity("price_history")
export class PriceHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: "asset_id" })
  asset!: Asset;

  @Index()
  @Column({ type: "timestamp" })
  timestamp!: Date;

  @Column({ type: "bigint" })
  price!: string; 

  @CreateDateColumn()
  created_at!: Date;

  @Index()
  @Column({ type: "boolean", default: false })
  is_latest!: boolean;
}
