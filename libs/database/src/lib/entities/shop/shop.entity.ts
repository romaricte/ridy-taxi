import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Point } from '../../interfaces/point';
import { WeekdayScheduleDTO } from '../../interfaces/weekday-schedule.dto';
import { PointTransformer } from '../../transformers/point.transformer';
import { WeeklyScheduleTransformer } from '../../transformers/weekly-schedule.transformer';
import { PersonalInfo } from '../fragments/personal-info';
import { RatingAggregate } from '../fragments/rating-aggregate';
import { MediaEntity } from '../media.entity';
import { PayoutAccountEntity } from '../payout-account.entity';
import { SavedPaymentMethodEntity } from '../saved-payment-method.entity';
import { OrderQueueLevel } from './enums/order-queue-level.enum';
import { ShopStatus } from './enums/shop-status.enum';
import { ProductCategoryEntity } from './product.category.entity';
import { ProductEntity } from './product.entity';
import { ShopCategoryEntity } from './shop-category.entity';
import { ShopDeliveryZoneEntity } from './shop-delivery-zone.entity';
import { ShopFeedbackEntity } from './shop-feedback.entity';
import { ShopProductPresetEntity } from './shop-product-preset.entity';
import { ShopLoginSessionEntity } from './shop-login-session.entity';
import { ShopNoteEntity } from './shop-note.entity';
import { ShopOrderCartEntity } from './shop-order-cart.entity';
import { ShopSessionEntity } from './shop-session.entity';
import { ShopToShopDocumentEntity } from './shop-to-shop-document.entity';
import { ShopWalletEntity } from './shop-wallet.entity';
import { PhoneNumber } from '../fragments/phone-number';
import { ShopSubcategoryEntity } from './shop-subcategory.entity';
import { ShopSupportRequestEntity } from './shop-support-request.entity';
import { ShopNotificationEntity } from './shop-notification.entity';
import { ShopTaxRuleEntity } from './shop-tax-rule.entity';

@Entity('shop')
export class ShopEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  name?: string;

  @Column(() => PhoneNumber)
  mobileNumber!: PhoneNumber;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({
    type: 'enum',
    enum: ShopStatus,
    default: ShopStatus.PendingSubmission,
  })
  status!: ShopStatus;

  @Column(() => PersonalInfo)
  ownerInformation!: PersonalInfo;

  @Column({
    nullable: true,
  })
  onlineUntil?: Date;

  @Column(() => RatingAggregate)
  ratingAggregate?: RatingAggregate;

  @Column({
    nullable: true,
  })
  password?: string;

  @Column('text', {
    transformer: new WeeklyScheduleTransformer(),
    nullable: true,
  })
  weeklySchedule!: WeekdayScheduleDTO[];

  @Column('float', {
    nullable: true,
    default: '0.00',
    precision: 10,
    scale: 2,
  })
  minimumOrderAmount?: number;

  @Column({
    default: true,
  })
  isExpressDeliveryAvailable!: boolean;

  @Column('smallint', {
    nullable: false,
    default: 0,
  })
  expressDeliveryShopCommission!: number;

  @Column({
    default: false,
  })
  isOnlinePaymentAvailable!: boolean;

  @Column({
    default: false,
  })
  isCashOnDeliveryAvailable!: boolean;

  @Column({
    default: false,
  })
  isShopDeliveryAvailable!: boolean;

  @Column({
    nullable: true,
  })
  lastActivityAt?: Date;

  @Column({
    type: 'enum',
    enum: OrderQueueLevel,
    default: OrderQueueLevel.LOW,
  })
  orderQueueLevel!: OrderQueueLevel;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    transformer: new PointTransformer(),
    nullable: true,
  })
  location?: Point;

  @Column('int', {
    nullable: true,
  })
  recommendedScore?: number;

  @Column({
    nullable: false,
    default: 'USD',
  })
  currency!: string;

  @OneToOne(() => MediaEntity, { eager: true })
  @JoinColumn()
  image?: MediaEntity;

  @Column({ nullable: true })
  imageId?: number;

  @Column({ default: 0 })
  displayPriority: number;

  @ManyToOne(() => MediaEntity, { eager: true })
  headerSmall?: MediaEntity;

  @Column({ nullable: true })
  headerSmallId?: number;

  @ManyToOne(() => MediaEntity, { eager: true })
  headerLarge?: MediaEntity;

  @Column({ nullable: true })
  headerLargeId?: number;

  @CreateDateColumn({ nullable: true })
  createdAt!: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;

  @OneToMany(() => PayoutAccountEntity, (payoutAccount) => payoutAccount.shop)
  payoutAccounts?: PayoutAccountEntity[];

  @OneToOne(() => PayoutAccountEntity)
  @JoinColumn()
  defaultPayoutAccount?: PayoutAccountEntity;

  @Column({ nullable: true })
  defaultPayoutAccountId?: number;

  @ManyToMany(() => ShopCategoryEntity, (category) => category.shops)
  @JoinTable()
  categories!: ShopCategoryEntity[];

  @ManyToMany(() => ShopSubcategoryEntity, (subcategory) => subcategory.shops)
  @JoinTable()
  subcategories?: ShopSubcategoryEntity[];

  @OneToMany(() => ShopDeliveryZoneEntity, (region) => region.shop)
  deliveryZones?: ShopDeliveryZoneEntity[];

  @OneToMany(() => ShopFeedbackEntity, (feedback) => feedback.shop)
  feedbacks?: ShopFeedbackEntity[];

  @OneToMany(() => ShopProductPresetEntity, (preset) => preset.shop)
  productPresets?: ShopProductPresetEntity[];

  @OneToMany(() => ShopOrderCartEntity, (cart) => cart.shop)
  carts?: ShopOrderCartEntity[];

  @OneToMany(() => ShopSessionEntity, (session) => session.shop)
  sessions?: ShopSessionEntity[];

  @OneToMany(() => ShopWalletEntity, (wallet) => wallet.shop)
  wallet?: ShopWalletEntity[];

  @OneToMany(() => ShopNoteEntity, (note) => note.shop)
  notes?: ShopNoteEntity[];

  @OneToMany(() => ShopLoginSessionEntity, (loginSession) => loginSession.shop)
  loginSessions?: ShopLoginSessionEntity[];

  @OneToMany(() => ProductEntity, (product) => product.shop)
  products?: ProductEntity[];

  @OneToMany(
    () => ProductCategoryEntity,
    (productCategory) => productCategory.shop,
  )
  productCategories?: ProductCategoryEntity[];

  @OneToMany(
    () => SavedPaymentMethodEntity,
    (savedPaymentMethod) => savedPaymentMethod.shop,
  )
  savedPaymentMethods!: SavedPaymentMethodEntity[];

  @OneToOne(() => SavedPaymentMethodEntity)
  @JoinColumn()
  defaultSavedPaymentMethod?: SavedPaymentMethodEntity;

  @Column({ nullable: true })
  defaultSavedPaymentMethodId?: number;

  @OneToMany(
    () => ShopToShopDocumentEntity,
    (shopToShopDocument) => shopToShopDocument.shop,
  )
  shopToShopDocuments?: ShopToShopDocumentEntity[];

  @OneToMany(
    () => ShopSupportRequestEntity,
    (supportRequest) => supportRequest.shop,
  )
  supportRequests?: ShopSupportRequestEntity[];

  @OneToMany(() => ShopNotificationEntity, (notification) => notification.shop)
  notifications?: ShopNotificationEntity[];

  @ManyToMany(() => ShopTaxRuleEntity, (shop) => shop.shops)
  taxRules?: ShopTaxRuleEntity[];

  @Column({
    default: true,
  })
  pushNotificationNewOrder!: boolean;

  @Column({
    default: true,
  })
  pushNotificationOrderStatus!: boolean;

  @Column({
    default: true,
  })
  pushNotificationNewFeedback!: boolean;

  @Column({
    default: true,
  })
  pushNotificationSupportRequest!: boolean;

  @Column({
    default: true,
  })
  pushNotificationAnnouncements!: boolean;
}
