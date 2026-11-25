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
import { AccountSettingsService } from '../../account-settings/account-settings.service';

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
  const settings = { get: jest.fn() };
  const accountRequest = { user: { id: 42 } } as unknown as Request;
  const inlineRequest = {
    currentContent: 'I walked',
    currentTextBlock: 'I walked',
    recentContent: ['An earlier walk'],
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
        { provide: AccountSettingsService, useValue: settings },
      ],
    }).compile();

    reflectionsController = app.get(ReflectionsController);
    jest.clearAllMocks();
    settings.get.mockResolvedValue({ cloudAiEnabled: false });
  });

  it('returns the inline completion as a JSON object', async () => {
    settings.get.mockResolvedValue({ cloudAiEnabled: true });
    mockIntelligenceService.generateInlineCompletion.mockResolvedValue(
      'beneath the trees',
    );

    await expect(
      reflectionsController.getInlineCompletion(accountRequest, inlineRequest),
    ).resolves.toEqual({ suggestion: 'beneath the trees' });
  });

  it('never forwards journal text to either cloud AI endpoint without account consent', async () => {
    await expect(
      reflectionsController.getInlineCompletion(accountRequest, inlineRequest),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      reflectionsController.getSentenceStarters(accountRequest, inlineRequest),
    ).rejects.toMatchObject({ status: 403 });
    expect(settings.get).toHaveBeenCalledWith(42);
    expect(
      mockIntelligenceService.generateInlineCompletion,
    ).not.toHaveBeenCalled();
    expect(
      mockIntelligenceService.generateSentenceStarters,
    ).not.toHaveBeenCalled();
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
