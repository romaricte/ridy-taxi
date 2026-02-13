import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

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

export class VentisSmsProvider1743253993497 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'sms_provider',
      'type',
      new TableColumn({
        name: 'type',
        type: 'enum',
        enum: Object.values(SMSProviderType),
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
