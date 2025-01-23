import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity("last_queried_timestamp")
export class LastQueriedTimestamp {
    @PrimaryColumn({ type: "varchar", length: 10 })
    asset_symbol: string;

    @Column({ type: "bigint" })
    timestamp: number;
}
