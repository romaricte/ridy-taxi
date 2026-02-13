import { Gender } from '../../entities/enums/gender.enum';

export class RiderRedisSnapshot {
  id!: string;
  firstName!: string | null;
  lastName!: string | null;
  mobileNumber!: string;
  countryIso?: string | null;
  email!: string | null;
  gender!: Gender | null;
  profileImageUrl!: string | null;
  fcmTokens!: string[];
  activeOrderIds!: string[];
  walletCredit!: number;
  currency!: string;
}
