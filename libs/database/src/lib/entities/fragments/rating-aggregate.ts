import { Column } from 'typeorm';

export class RatingAggregate {
  @Column('smallint', {
    nullable: true,
  })
  rating?: number;

  @Column('int', {
    default: 0,
  })
  reviewCount!: number;
}
