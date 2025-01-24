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
import { Singleton } from "./Singleton";
import { LastQueriedTimestamp } from "./LastQueriedTimestamp";
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

  @OneToMany(() => CDP, (cdp) => cdp.asset)
  cdps!: CDP[];

  @OneToOne(() => LiquidityPool, (liquidityPool) => liquidityPool.asset)
  liquidityPool!: LiquidityPool;

  @OneToMany(() => PriceHistory, (priceHistory) => priceHistory.asset)
  priceHistory!: PriceHistory[];

  @OneToMany(() => Staker, (staker) => staker.asset)
  stakers!: Staker[];

  @OneToMany(() => Singleton, (singleton) => singleton.asset)
  singletons!: Singleton[];

  @OneToOne(() => LastQueriedTimestamp, lastQueriedTimestamp => lastQueriedTimestamp.asset)
  lastQueriedTimestamp!: LastQueriedTimestamp;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: "boolean", default: false })
  is_deleted!: boolean;
}
