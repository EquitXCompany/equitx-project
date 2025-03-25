import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from "typeorm";
import { CDP } from "./CDP";
import { LiquidityPool } from "./LiquidityPool";
import { Staker } from "./Staker";
import { ContractState } from "./ContractState";
import { PriceHistory } from "./PriceHistory";

@Entity("asset")
export class Asset {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 10 })
  symbol!: string;

  @Column({ type: "varchar", length: 56 })
  feed_address!: string;

  // current dollar denominated price converted to integer with 14 decimal places (multiplied by 10^14)
  @Column({ type: "numeric", precision: 30, scale: 0 }) 
  price!: string; 

  // Store the XLM price at the time this asset's price was last updated
  @Column({ type: "numeric", precision: 30, scale: 0 }) 
  last_xlm_price!: string;

  @OneToMany(() => CDP, (cdp) => cdp.asset)
  cdps!: CDP[];

  @OneToOne(() => LiquidityPool, (liquidityPool) => liquidityPool.asset)
  liquidityPool!: LiquidityPool;

  @OneToMany(() => PriceHistory, (priceHistory) => priceHistory.asset)
  priceHistory!: PriceHistory[];

  @OneToMany(() => Staker, (staker) => staker.asset)
  stakers!: Staker[];

  @OneToMany(() => ContractState, (contractState) => contractState.asset)
  contractState!: ContractState[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: "boolean", default: false })
  is_deleted!: boolean;
}
