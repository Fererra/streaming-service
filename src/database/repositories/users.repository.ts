import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';

export class UsersRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      select: ['id', 'role', 'password'],
      where: { email },
    });
  }

  createUser(data: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.repository.create(data);
    return this.repository.save(user);
  }
}
