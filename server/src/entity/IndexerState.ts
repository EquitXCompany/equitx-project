import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("indexer_state")
export class IndexerState {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  last_ledger!: number;  // Global last processed ledger
}