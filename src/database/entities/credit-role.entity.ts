import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('credit_roles')
export class CreditRoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  role: string;
}
