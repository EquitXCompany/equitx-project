import { Entity, PrimaryColumn, Column, OneToMany } from "typeorm";
import { CDP } from "./CDP";
import { LiquidityPool } from "./LiquidityPool";
import { Pricefeed } from "./Pricefeed";
import { Staker } from "./Staker";
import { Singleton } from "./Singleton";

@Entity("asset")
export class Asset {
    @PrimaryColumn({ type: "varchar", length: 10 })
    symbol: string;

    @Column({ type: "varchar", length: 255 })
    asset_type: string;

    @Column({ type: "varchar", length: 255 })
    address: string;

    @OneToMany(() => CDP, cdp => cdp.asset)
    cdps: CDP[];

    @OneToMany(() => LiquidityPool, liquidityPool => liquidityPool.asset)
    liquidityPools: LiquidityPool[];

    @OneToMany(() => Pricefeed, pricefeed => pricefeed.asset)
    pricefeeds: Pricefeed[];

    @OneToMany(() => Staker, staker => staker.asset)
    stakers: Staker[];

    @OneToMany(() => Singleton, singleton => singleton.asset)
    singletons: Singleton[];
}
