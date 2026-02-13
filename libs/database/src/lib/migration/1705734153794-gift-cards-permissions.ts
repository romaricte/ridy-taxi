import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export enum OperatorPermission {
  Drivers_View = 'Drivers_View',
  Drivers_Edit = 'Drivers_Edit',
  Riders_View = 'Riders_View',
  Riders_Edit = 'Riders_Edit',
  Regions_View = 'Regions_View',
  Regions_Edit = 'Regions_Edit',
  Services_View = 'Services_View',
  Services_Edit = 'Services_Edit',
  Complaints_View = 'Complaints_View',
  Complaints_Edit = 'Complaints_Edit',
  Coupons_View = 'Coupons_View',
  Coupons_Edit = 'Coupons_Edit',
  Announcements_View = 'Announcements_View',
  Announcements_Edit = 'Announcements_Edit',
  Requests_View = 'Requests_View',
  Fleets_View = 'Fleets_View',
  Fleets_Edit = 'Fleets_Edit',
  Gateways_View = 'Gateways_View',
  Gateways_Edit = 'Gateways_Edit',
  Users_View = 'Users_View',
  Users_Edit = 'Users_Edit',
  Cars_View = 'Cars_View',
  Cars_Edit = 'Cars_Edit',
  FleetWallet_View = 'FleetWallet_View',
  FleetWallet_Edit = 'FleetWallet_Edit',
  ProviderWallet_View = 'ProviderWallet_View',
  ProviderWallet_Edit = 'ProviderWallet_Edit',
  DriverWallet_View = 'DriverWallet_View',
  DriverWallet_Edit = 'DriverWallet_Edit',
  RiderWallet_View = 'RiderWallet_View',
  RiderWallet_Edit = 'RiderWallet_Edit',
  ReviewParameter_Edit = 'ReviewParameter_Edit',
  Payouts_View = 'Payouts_View',
  Payouts_Edit = 'Payouts_Edit',
  GiftBatch_View = 'GiftBatch_View',
  GiftBatch_Create = 'GiftBatch_Create',
  GiftBatch_ViewCodes = 'GiftBatch_ViewCodes',
  SMSProviders_View = 'SMSProviders_View',
  SMSProviders_Edit = 'SMSProviders_Edit',
}

export class GiftCardsPermissions1705734153794 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.changeColumn(
        'operator_role',
        'permissions',
        new TableColumn({
          name: 'permissions',
          type: 'set',
          enum: Object.values(OperatorPermission),
        }),
      );
    } catch (e) {
      /* empty */
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.changeColumn(
        'operator_role',
        'permissions',
        new TableColumn({
          name: 'permissions',
          type: 'set',
          enum: Object.values(OperatorPermission),
        }),
      );
      // await queryRunner.query(
      //   "ALTER TABLE `operator_role` CHANGE `permissions` `permissions` set ('Drivers_View', 'Drivers_Edit', 'Riders_View', 'Riders_Edit', 'Regions_View', 'Regions_Edit', 'Services_View', 'Services_Edit', 'Complaints_View', 'Complaints_Edit', 'Coupons_View', 'Coupons_Edit', 'Announcements_View', 'Announcements_Edit', 'Requests_View', 'Fleets_View', 'Fleets_Edit', 'Gateways_View', 'Gateways_Edit', 'Users_View', 'Users_Edit', 'Cars_View', 'Cars_Edit', 'FleetWallet_View', 'FleetWallet_Edit', 'ProviderWallet_View', 'ProviderWallet_Edit', 'DriverWallet_View', 'DriverWallet_Edit', 'RiderWallet_View', 'RiderWallet_Edit', 'ReviewParameter_Edit', 'Payouts_View', 'Payouts_Edit') NOT NULL",
      // );
    } catch (e) {
      /* empty */
    }
  }
}
