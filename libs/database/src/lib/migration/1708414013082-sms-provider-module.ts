import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';
import { existsSync, promises } from 'fs';

export enum SMSProviderType {
  Firebase = 'Firebase',
  Twilio = 'Twilio',
  Plivo = 'Plivo',
  Pahappa = 'Pahappa',
  BroadNet = 'BroadNet',
  Vonage = 'Vonage',
  ClickSend = 'ClickSend',
  Infobip = 'Infobip',
  MessageBird = 'MessageBird',
  VentisSMS = 'VentisSMS',
}

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

export class SmsProviderModule1708414013082 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.createTable(
        new Table({
          name: 'sms_provider',
          columns: [
            new TableColumn({
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            }),
            new TableColumn({
              name: 'name',
              type: 'varchar',
              isNullable: false,
            }),
            new TableColumn({
              name: 'type',
              type: 'enum',
              enum: Object.values(SMSProviderType),
              isNullable: false,
            }),
            new TableColumn({
              name: 'isDefault',
              type: 'boolean',
              isNullable: false,
              default: false,
            }),
            new TableColumn({
              name: 'accountId',
              type: 'varchar',
              isNullable: true,
            }),
            new TableColumn({
              name: 'authToken',
              type: 'varchar',
              isNullable: true,
            }),
            new TableColumn({
              name: 'fromNumber',
              type: 'varchar',
              isNullable: true,
            }),
            new TableColumn({
              name: 'verificationTemplate',
              type: 'text',
              isNullable: true,
            }),
            new TableColumn({
              name: 'smsType',
              type: 'varchar',
              isNullable: true,
            }),
            new TableColumn({
              name: 'createdAt',
              type: 'datetime',
              default: 'NOW()',
            }),
            new TableColumn({
              name: 'deletedAt',
              type: 'datetime',
              isNullable: true,
            }),
          ],
        }),
        true,
      );
      const configAddress = `${process.cwd()}/config/config.${
        process.env.NODE_ENV ?? 'production'
      }.json`;
      if (existsSync(configAddress)) {
        const file = await promises.readFile(configAddress, {
          encoding: 'utf-8',
        });
        const config: ICurrentConfiguration = JSON.parse(file as string);
        if (
          config.twilioAccountSid &&
          config.twilioAuthToken &&
          config.twilioFromNumber &&
          config.twilioVerificationCodeSMSTemplate
        ) {
          await queryRunner.query(
            `INSERT INTO sms_provider (name, type, isDefault, accountId, authToken, fromNumber, verificationTemplate, smsType) VALUES ('Twilio', 'Twilio', 1, '${config.twilioAccountSid}', '${config.twilioAuthToken}', '${config.twilioFromNumber}', '${config.twilioVerificationCodeSMSTemplate}', null)`,
          );
        }
      }
      await queryRunner.changeColumn(
        'operator_role',
        'permissions',
        new TableColumn({
          name: 'permissions',
          type: 'set',
          enum: Object.values(OperatorPermission),
        }),
      );
    } catch (error) {
      console.error(error);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.dropTable('sms_provider');
    } catch (error) {
      console.error(error);
    }
  }
}

interface ICurrentConfiguration {
  purchaseCode?: string;
  backendMapsAPIKey?: string;
  adminPanelAPIKey?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  twilioVerificationCodeSMSTemplate?: string;
  firebaseProjectPrivateKey?: string;
}
