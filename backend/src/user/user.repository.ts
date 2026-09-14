import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { LoginProvider, UpdateUserData } from './user.types';
import { UserAccount } from '../../generated/prisma/client';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getUserById(id: number) {
    return this.prisma.userAccount.findUnique({
      where: { id },
    });
  }

  async getUserByEmail(email: string) {
    return this.prisma.userAccount.findUnique({
      where: { email },
    });
  }

  /**
   * This is a user created locally with a username and password
   * @param email
   * @param password
   */
  async createUser(email: string, password: string) {
    return this.prisma.userAccount.create({
      data: { email, password },
    });
  }

  /**
   * This is a user created through OAuth providers
   * @param email
   * @param provider
   */
  async createUserWithProvider(email: string, provider: LoginProvider) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.userAccount.create({
        data: { email },
      });

      await tx.authProvider.create({
        data: {
          userId: user.id,
          provider: provider.name,
          providerId: provider.id,
        },
      });

      return user;
    });
  }

  async deleteUser(id: number) {
    return this.prisma.userAccount.delete({
      where: { id },
    });
  }

  async updateUser(id: number, userData: UpdateUserData): Promise<UserAccount> {
    return this.prisma.userAccount.update({
      where: { id },
      data: userData,
    });
  }
}
