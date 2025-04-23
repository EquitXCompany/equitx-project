import { Entity, PrimaryColumn, Column, Index, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from "typeorm";
import { Asset } from "./Asset";

@Entity("liquidity_pools")
export class LiquidityPool {
  @PrimaryColumn({ type: "uuid" })
  asset_id!: string;

  @OneToOne(() => Asset, (asset) => asset.liquidityPool)
  @JoinColumn({ name: "asset_id" })
  asset!: Asset;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 56 })
  pool_address!: string;

  @Column({ type: "varchar", length: 56 })
  mercury_wasm_hash!: string;

  // ratio multiplied by 10^5 
  @Column({ type: "integer" })
  minimum_collateralization_ratio!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: "boolean", default: false })
  is_deleted!: boolean;
}
