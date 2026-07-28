import { Module } from '@nestjs/common';
import { NicknameFactory } from './factory';
import { NicknameRepository } from './repository';
import { NicknameSeeder } from './seeder';

@Module({
  providers: [NicknameRepository, NicknameFactory, NicknameSeeder],
  exports: [NicknameRepository],
})
export class NicknameModule {}
