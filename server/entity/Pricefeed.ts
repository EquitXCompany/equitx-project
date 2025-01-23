import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Asset } from "./Asset";

@Entity("pricefeed")
export class Pricefeed {
    @PrimaryColumn({ type: "timestamp" })
    timestamp: Date;

    @Column({ type: "decimal", precision: 18, scale: 8 })
    price: number;

    @ManyToOne(() => Asset, asset => asset.pricefeeds)
    @JoinColumn({ name: "asset_symbol" })
    asset: Asset;
}
