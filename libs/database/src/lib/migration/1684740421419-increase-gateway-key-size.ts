import { MigrationInterface, QueryRunner } from 'typeorm';

export class increaseGatewayKeySize1684740421419 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(
        'ALTER TABLE `payment_gateway` MODIFY `privateKey` TEXT NULL',
      );
    } catch (error) {
      console.error(error);
    }
    try {
      await queryRunner.query(
        'ALTER TABLE `payment_gateway` MODIFY `publicKey` TEXT NULL',
      );
    } catch (error) {
      console.error(error);
    }
    try {
      await queryRunner.query(
        'ALTER TABLE `payment_gateway` MODIFY `merchantId` TEXT NULL',
      );
    } catch (error) {
      console.error(error);
    }
    try {
      await queryRunner.query(
        'ALTER TABLE `payment_gateway` MODIFY `saltKey` TEXT NULL',
      );
    } catch (error) {
      console.error(error);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
