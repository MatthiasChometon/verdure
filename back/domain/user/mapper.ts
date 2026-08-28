import { Injectable } from '@nestjs/common';
import { User } from './model';
import { UserRecord } from './type';

@Injectable()
export class UserMapper {
  toModel(record: UserRecord): User {
    return {
      id: record.id,
      email: record.email,
      name: record.name,
      avatarUrl: record.avatarUrl,
      hasPlantnetKey: record.plantnetApiKey !== null,
    };
  }
}
