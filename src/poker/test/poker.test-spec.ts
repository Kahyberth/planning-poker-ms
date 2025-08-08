import { ClientProxy, RpcException } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { of } from 'rxjs';
import { Repository } from 'typeorm';

import { VotingScale } from '../../commons/enums/poker.enums';
import { CreatePokerDto } from '../dto/create-poker.dto';
import { Decks } from '../entities/decks.entity';
import { Join_Session } from '../entities/join.session.entity';
import { Session } from '../entities/session.entity';
import { PokerService } from '../poker.service';

describe('PokerService', () => {
  let service: PokerService;
  let sessionRepository: jest.Mocked<Repository<Session>>;
  let joinSessionRepository: jest.Mocked<Repository<Join_Session>>;
  let decksRepository: jest.Mocked<Repository<Decks>>;
  let natsClient: jest.Mocked<ClientProxy>;

  const mockSession = {
    session_id: 'test-session-id',
    session_name: 'Test Session',
    created_by: 'user-001',
    leader_id: 'leader-001',
    project_id: 'project-001',
    is_active: true,
    decks: { deck_cards: [] },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PokerService,
        {
          provide: getRepositoryToken(Session),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Join_Session),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Decks),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: 'NATS_SERVICE',
          useValue: {
            send: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PokerService>(PokerService);
    sessionRepository = module.get(getRepositoryToken(Session));
    joinSessionRepository = module.get(getRepositoryToken(Join_Session));
    decksRepository = module.get(getRepositoryToken(Decks));
    natsClient = module.get('NATS_SERVICE');
  });

  describe('createSession', () => {
    const createSessionDto: CreatePokerDto = {
      session_name: 'Test Session',
      created_by: 'user-001',
      leader_id: 'leader-001',
      project_id: 'project-001',
      description: 'Test description',
      deck: [
        {
          id: 'story-1',
          title: 'Test Story',
          description: 'Test story description',
          priority: 'High',
        },
      ],
    };

    it('should create a new session successfully', async () => {
      const mockProject = [{ id: 'project-001', name: 'Test Project' }];
      const mockDeck = { deck_id: 'deck-001', deck_cards: createSessionDto.deck };
      const mockSavedSession = { ...mockSession, ...createSessionDto };

      sessionRepository.findOne.mockResolvedValue(null);
      natsClient.send.mockReturnValue(of(mockProject));
      decksRepository.create.mockReturnValue(mockDeck as any);
      decksRepository.save.mockResolvedValue(mockDeck as any);
      sessionRepository.create.mockReturnValue(mockSavedSession as any);
      sessionRepository.save.mockResolvedValue(mockSavedSession as any);

      const result = await service.createSession(createSessionDto);

      expect(result.message).toBe('Room created successfully');
      expect(result.data).toEqual(mockSavedSession);
      expect(sessionRepository.findOne).toHaveBeenCalledWith({
        where: { is_active: true, session_name: createSessionDto.session_name },
      });
      expect(natsClient.send).toHaveBeenCalledWith('projects.findOne.project', 'project-001');
      expect(decksRepository.save).toHaveBeenCalledWith(mockDeck);
      expect(sessionRepository.save).toHaveBeenCalledWith(mockSavedSession);
    });

    it('should throw error when project not found', async () => {
      sessionRepository.findOne.mockResolvedValue(null);
      natsClient.send.mockReturnValue(of([]));

      await expect(service.createSession(createSessionDto)).rejects.toThrow(RpcException);
      expect(sessionRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error when session already exists', async () => {
      const mockProject = [{ id: 'project-001', name: 'Test Project' }];
      sessionRepository.findOne.mockResolvedValue(mockSession as any);
      natsClient.send.mockReturnValue(of(mockProject));

      await expect(service.createSession(createSessionDto)).rejects.toThrow(RpcException);
      expect(sessionRepository.save).not.toHaveBeenCalled();
    });

    it('should create session with custom voting scale', async () => {
      const dtoWithScale = { ...createSessionDto, voting_scale: VotingScale.TSHIRT };
      const mockProject = [{ id: 'project-001', name: 'Test Project' }];
      const mockDeck = { deck_id: 'deck-001', deck_cards: dtoWithScale.deck };

      sessionRepository.findOne.mockResolvedValue(null);
      natsClient.send.mockReturnValue(of(mockProject));
      decksRepository.create.mockReturnValue(mockDeck as any);
      decksRepository.save.mockResolvedValue(mockDeck as any);
      sessionRepository.create.mockReturnValue(mockSession as any);
      sessionRepository.save.mockResolvedValue(mockSession as any);

      await service.createSession(dtoWithScale);

      expect(sessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          voting_scale: VotingScale.TSHIRT,
        })
      );
    });
  });

  describe('joinSession', () => {
    const sessionId = 'test-session-id';
    const userId = 'user-002';

    it('should allow user to join an active session', async () => {
      const mockActiveSession = { ...mockSession, is_active: true };
      const mockJoinSession = { user_id: userId, session: mockActiveSession };

      sessionRepository.findOne.mockResolvedValue(mockActiveSession as any);
      joinSessionRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      joinSessionRepository.create.mockReturnValue(mockJoinSession as any);
      joinSessionRepository.save.mockResolvedValue(mockJoinSession as any);

      const result = await service.joinSession(sessionId, userId);

      expect(result.message).toBe('Room joined successfully');
      expect(sessionRepository.findOne).toHaveBeenCalledWith({ where: { session_id: sessionId } });
      expect(joinSessionRepository.save).toHaveBeenCalledWith(mockJoinSession);
    });

    it('should throw error when session not found', async () => {
      sessionRepository.findOne.mockResolvedValue(null);

      await expect(service.joinSession(sessionId, userId)).rejects.toThrow(RpcException);
      try {
        await service.joinSession(sessionId, userId);
      } catch (error) {
        expect(error.message).toBe('Room not found');
      }
    });

    it('should throw error when session is not active', async () => {
      const inactiveSession = { ...mockSession, is_active: false };
      sessionRepository.findOne.mockResolvedValue(inactiveSession as any);

      await expect(service.joinSession(sessionId, userId)).rejects.toThrow(RpcException);
      try {
        await service.joinSession(sessionId, userId);
      } catch (error) {
        expect(error.message).toBe('Room is not active');
      }
    });

    it('should throw error when user already in session', async () => {
      const mockActiveSession = { ...mockSession, is_active: true };
      const existingJoin = { user_id: userId, session: mockActiveSession, left_at: null };

      sessionRepository.findOne.mockResolvedValue(mockActiveSession as any);
      joinSessionRepository.findOne.mockResolvedValue(existingJoin as any);

      await expect(service.joinSession(sessionId, userId)).rejects.toThrow(RpcException);
      try {
        await service.joinSession(sessionId, userId);
      } catch (error) {
        expect(error.message).toBe('User already in session');
      }
    });
  });

  describe('validateSession', () => {
    const userId = 'user-001';

    it('should return session info when user is in active session', async () => {
      const mockJoinSession = {
        user_id: userId,
        left_at: null,
        is_left: false,
        session: {
          session_id: 'session-123',
          is_active: true,
        },
      };

      joinSessionRepository.findOne.mockResolvedValue(mockJoinSession as any);

      const result = await service.validateSession({ user_id: userId });

      expect(result.message).toBe('User found in the session');
      expect(result.isInSession).toBe(true);
      expect(result.session_id).toBe('session-123');
      expect(joinSessionRepository.findOne).toHaveBeenCalledWith({
        where: { user_id: userId, left_at: null, is_left: false },
        relations: ['session'],
      });
    });

    it('should throw error when user not found in any session', async () => {
      joinSessionRepository.findOne.mockResolvedValue(null);

      await expect(service.validateSession({ user_id: userId })).rejects.toThrow(RpcException);
      try {
        await service.validateSession({ user_id: userId });
      } catch (error) {
        expect(error.message).toBe('User not found in the session');
      }
    });

    it('should throw error when session relation not found', async () => {
      const mockJoinSessionWithoutSession = {
        user_id: userId,
        left_at: null,
        is_left: false,
        session: null,
      };

      joinSessionRepository.findOne.mockResolvedValue(mockJoinSessionWithoutSession as any);

      await expect(service.validateSession({ user_id: userId })).rejects.toThrow(RpcException);
      try {
        await service.validateSession({ user_id: userId });
      } catch (error) {
        expect(error.message).toBe('Session relation not found');
      }
    });

    it('should throw error when session is disabled', async () => {
      const mockJoinSessionWithInactiveSession = {
        user_id: userId,
        left_at: null,
        is_left: false,
        session: {
          session_id: 'session-123',
          is_active: false,
        },
      };

      joinSessionRepository.findOne.mockResolvedValue(mockJoinSessionWithInactiveSession as any);

      await expect(service.validateSession({ user_id: userId })).rejects.toThrow(RpcException);
      try {
        await service.validateSession({ user_id: userId });
      } catch (error) {
        expect(error.message).toBe('session disabled');
      }
    });

    it('should return early when user_id is not provided', async () => {
      const result = await service.validateSession({} as any);

      expect(result).toBeUndefined();
      expect(joinSessionRepository.findOne).not.toHaveBeenCalled();
    });
  });
});
