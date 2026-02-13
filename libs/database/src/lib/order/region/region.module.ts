import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegionEntity } from '../../entities/taxi/region.entity';
import { RegionService } from './region.service';

@Module({
  imports: [TypeOrmModule.forFeature([RegionEntity])],
  providers: [RegionService],
  exports: [RegionService],
})
export class RegionModule {}
