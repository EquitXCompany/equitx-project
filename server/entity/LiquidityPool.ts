import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Asset } from "./Asset";

@Entity("liquidity_pool")
export class LiquidityPool {
    @PrimaryColumn({ type: "varchar", length: 255 })
    pool_address: string;

    @ManyToOne(() => Asset, asset => asset.liquidityPools)
    @JoinColumn({ name: "asset_symbol" })
    asset: Asset;
}