import { Column } from 'typeorm';
import { Gender } from '../enums/gender.enum';
import { PhoneNumber } from './phone-number';

export class PersonalInfo {
  @Column({
    nullable: true,
  })
  firstName?: string;

  @Column({
    nullable: true,
  })
  lastName?: string;

  @Column({
    nullable: true,
  })
  email?: string;

  @Column(() => PhoneNumber)
  mobileNumber?: PhoneNumber;

  @Column('enum', {
    enum: Gender,
    nullable: true,
  })
  gender?: Gender;

  @Column({
    nullable: true,
  })
  address?: string;
}
