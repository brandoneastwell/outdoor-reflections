import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { UserRepository } from './user.repository';
import * as bcrypt from 'bcryptjs';
import { LoginProvider } from './user.types';

@Injectable()
export class UserService {
  constructor(private repo: UserRepository) {}
  private readonly logger = new Logger(UserService.name);

  /**
   * This is a user created with local credentials
   * @param email
   * @param password
   */
  async createUser(email: string, password: string) {
    this.logger.log(`Creating user with email: ${email}`);
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) throw new ConflictException('User with this email already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    return this.repo.createUser(email, hashedPassword);
  }

  /**
   * This is a user created with OAuth providers
   * @param email
   * @param provider
   */
  async createProviderUser(email: string, provider: LoginProvider) {
    this.logger.log(`Creating a provider user with google email: ${email}`);
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) throw new ConflictException('User already exists');

    return await this.repo.createUserWithProvider(email, provider);
  }

  async findUserByID(id: number) {
    const user = await this.repo.getUserById(id);
    if (!user) return null;
    return user;
  }

  async findUserByEmail(email: string) {
    const user = await this.repo.getUserByEmail(email);
    if (!user) return null;
    return user;
  }

  async updatePassword(id: number, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.repo.updateUser(id, { password: hashedPassword });
  }

  deleteUser() {}
}
