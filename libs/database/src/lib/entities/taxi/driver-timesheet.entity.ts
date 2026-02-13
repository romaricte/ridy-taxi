import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DriverEntity } from './driver.entity';

@Entity('driver_timesheet')
export class DriverTimesheetEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DriverEntity, (driver) => driver.timeSheet)
  driver: DriverEntity;

  @Column()
  driverId: number;

  @Column()
  startTime!: Date;

  @Column({
    nullable: true,
  })
  endTime?: Date;

  get totalDurationMinutes(): number | null {
    if (!this.endTime) return null;
    const diff =
      (this.endTime.getTime() - this.startTime.getTime()) / 1000 / 60;
    return Math.round(diff);
  }
}
