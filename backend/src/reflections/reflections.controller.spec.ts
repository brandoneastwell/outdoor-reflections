import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ReflectionsController } from './reflections.controller';
import { ReflectionsService } from './reflections.service';
import { SyncService } from './sync.service';
import { ReflectionDto } from './reflection.types';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { IntelligenceService } from './intelligence.service';

describe('ReflectionsController', () => {
  let reflectionsController: ReflectionsController;

  const mockReflectionService = {
    createEntry: jest.fn(),
  };

  const mockSyncService = {
    syncEntries: jest.fn(),
  };

  const mockIntelligenceService = {
    generateSentenceStarters: jest.fn(),
  };

  beforeEach(async () => {
    const app = await Test.createTestingModule({
      controllers: [ReflectionsController],
      providers: [
        {
          provide: ReflectionsService,
          useValue: mockReflectionService,
        },
        {
          provide: SyncService,
          useValue: mockSyncService,
        },
        {
          provide: IntelligenceService,
          useValue: mockIntelligenceService,
        },
      ],
    }).compile();

    reflectionsController = app.get(ReflectionsController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const entry: ReflectionDto = {
      createdAt: '',
      date: new Date().toISOString(),
      id: randomUUID(),
      lastSyncedAt: new Date().toISOString(),
      lastEditedAt: new Date().toISOString(),
      title: 'test entry',
      content: ['it is day 3'],
      drawingPaths: [],
    };

    const mockRequest = {
      user: { id: 1, email: 'test@example.com' },
    } as unknown as Request;

    it('should create a new reflection entry', async () => {
      mockReflectionService.createEntry.mockResolvedValue(entry);

      await expect(
        reflectionsController.create(mockRequest, entry),
      ).resolves.toEqual(entry);
      expect(mockReflectionService.createEntry).toHaveBeenCalledWith(entry, 1);
    });

    it('should return conflict exception if entry exists', async () => {
      mockReflectionService.createEntry.mockRejectedValue(
        new ConflictException('Entry already exists'),
      );

      await expect(
        reflectionsController.create(mockRequest, entry),
      ).rejects.toThrow(ConflictException);
    });
  });
});
