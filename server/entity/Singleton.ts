import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Asset } from "./Asset";

@Entity("singletons")
export class Singleton {
    @PrimaryColumn({ type: "varchar", length: 255 })
    key: string;

    @Column({ type: "text" })
    value: string;

    @ManyToOne(() => Asset, asset => asset.singletons)
    @JoinColumn({ name: "asset_symbol" })
    asset: Asset;
}
