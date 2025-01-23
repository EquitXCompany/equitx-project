import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Asset } from "./Asset";

@Entity("staker")
export class Staker {
    @PrimaryColumn({ type: "varchar", length: 56 })
    address: string;

    @Column({ type: "bigint" })
    xasset_deposit: string;

    @Column({ type: "bigint" })
    product_constant: string;

    @Column({ type: "bigint" })
    compounded_constant: string;

    @Column({ type: "bigint" })
    epoch: string;

    @ManyToOne(() => Asset, asset => asset.stakers)
    @JoinColumn({ name: "asset_symbol" })
    asset: Asset;
}
