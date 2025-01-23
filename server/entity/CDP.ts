import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Asset } from "./Asset";

export enum CDPStatus {
  Open = 0,
  Insolvent = 1,
  Frozen = 2,
  Closed = 3,
}

@Entity("cdp")
export class CDP {
    @PrimaryColumn({ type: "char", length: 56 })
    address: string;

    @Column({ type: "bigint" })
    xlm_deposited: string;

    @Column({ type: "bigint" })
    asset_lent: string;

    @Column({
        type: "enum",
        enum: CDPStatus,
        default: CDPStatus.Open
    })
    status: CDPStatus;

    @ManyToOne(() => Asset, asset => asset.cdps)
    @JoinColumn({ name: "asset_symbol" })
    asset: Asset;
}
