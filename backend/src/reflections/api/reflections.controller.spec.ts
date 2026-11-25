import { encryptedFixture } from '../../database/db.seed.helpers';
import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ReflectionsController } from './reflections.controller';
import { ReflectionsService } from '../entries/reflections.service';
import { SyncService } from '../sync/sync.service';
import { ReflectionDto } from '../entries/reflection.types';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { IntelligenceService } from '../intelligence/intelligence.service';

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
    generateInlineCompletion: jest.fn(),
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

  it('returns the inline completion as a JSON object', async () => {
    mockIntelligenceService.generateInlineCompletion.mockResolvedValue(
      'beneath the trees',
    );

    await expect(
      reflectionsController.getInlineCompletion({
        currentContent: 'I walked',
        currentTextBlock: 'I walked',
        recentContent: ['An earlier walk'],
      }),
    ).resolves.toEqual({ suggestion: 'beneath the trees' });
  });

  describe('create', () => {
    const entry: ReflectionDto = {
      id: randomUUID(),
      revision: randomUUID(),
      lastEditedAt: new Date().toISOString(),
      payload: encryptedFixture(),
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
