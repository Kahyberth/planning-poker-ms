import { INestMicroservice, ValidationPipe } from '@nestjs/common';
import { ClientProxy, ClientsModule, MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { envs } from '../../commons/envs';
import { PokerModule } from '../poker.module';
import { PokerService } from '../poker.service';

import { Chat } from '../entities/chat.entity';
import { Decks } from '../entities/decks.entity';
import { History } from '../entities/history.entity';
import { Join_Session } from '../entities/join.session.entity';
import { Session } from '../entities/session.entity';
import { Vote } from '../entities/vote.entity';

describe('PokerController - Create Session (e2e)', () => {
  let app: INestMicroservice;
  let client: ClientProxy;
  let natsClient: ClientProxy;
  let sessionRepository: Repository<Session>;
  let decksRepository: Repository<Decks>;
  let pokerService: PokerService;

  const PROJECT_ID = 'mock-project-id';
  const LEADER_ID = 'leader-001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: envs.DB_HOST,
          port: envs.DB_PORT,
          username: envs.DB_USERNAME,
          password: envs.DB_PASSWORD,
          database: envs.DB_DATABASE,
          synchronize: true,
          dropSchema: true,
          entities: [Session, Decks, Join_Session, Vote, Chat, History],
        }),
        PokerModule,
        ClientsModule.register([
          {
            name: 'PROJECTS_SERVICE',
            transport: Transport.NATS,
            options: {
              servers: envs.NATS_SERVERS,
            },
          },
          {
            name: 'NATS_SERVICE',
            transport: Transport.NATS,
            options: {
              servers: envs.NATS_SERVERS,
            },
          },
        ]),
      ],
    }).compile();

    app = moduleFixture.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.NATS,
      options: {
        servers: envs.NATS_SERVERS,
      },
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    client = moduleFixture.get<ClientProxy>('PROJECTS_SERVICE');
    natsClient = moduleFixture.get<ClientProxy>('NATS_SERVICE');
    sessionRepository = moduleFixture.get(getRepositoryToken(Session));
    decksRepository = moduleFixture.get(getRepositoryToken(Decks));
    pokerService = moduleFixture.get<PokerService>(PokerService);

    await app.listen();
    await client.connect();
    await natsClient.connect();

    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await client.close();
    await natsClient.close();
    await app.close();
  });

  beforeEach(async () => {
    await sessionRepository.query(`TRUNCATE TABLE session CASCADE`);
    await decksRepository.query(`TRUNCATE TABLE decks CASCADE`);
  });

  describe('poker.create.session', () => {
    it('should create a new session with deck and return success', async () => {
      const payload = {
        session_name: 'Poker Room 1',
        created_by: 'user-001',
        leader_id: LEADER_ID,
        project_id: PROJECT_ID,
        description: 'Estimating sprint 24',
        deck: [
          {
            id: 'story-1',
            title: 'Create login page',
            description: 'As a user, I want to log in.',
            priority: 'High',
          },
          {
            id: 'story-2',
            title: 'Add logout functionality',
            description: 'User should be able to logout',
            priority: 'Medium',
          },
        ],
      };

      const mockProject = [{ id: PROJECT_ID, name: 'Awesome Project' }];


      jest
        .spyOn(pokerService as any, 'findProjectSessions')
        .mockResolvedValue(mockProject);

      const response = await client
        .send('poker.create.session', payload)
        .toPromise();

      expect(response).toBeDefined();
      expect(response.message).toBe('Room created successfully');
      expect(response.data.session_name).toBe(payload.session_name);
      expect(response.data.project_id).toBe(payload.project_id);

      const saved = await sessionRepository.findOne({
        where: { session_name: payload.session_name },
        relations: ['decks'],
      });

      expect(saved).toBeDefined();
      expect(saved.leader_id).toBe(LEADER_ID);
      expect(saved.decks.deck_cards).toHaveLength(2);
    }, 30000);
  });

  describe('poker.join.session', () => {
    it('should allow a user to join an existing session by session ID', async () => {

      const createPayload = {
        session_name: 'Poker Room for Join Test',
        created_by: 'user-001',
        leader_id: LEADER_ID,
        project_id: PROJECT_ID,
        description: 'Test room for joining',
        deck: [
          {
            id: 'story-1',
            title: 'Test story',
            description: 'Test description',
            priority: 'High',
          },
        ],
      };

      const mockProject = [{ id: PROJECT_ID, name: 'Awesome Project' }];
      jest
        .spyOn(pokerService as any, 'findProjectSessions')
        .mockResolvedValue(mockProject);

      const createResponse = await client
        .send('poker.create.session', createPayload)
        .toPromise();

      expect(createResponse.data.session_id).toBeDefined();

      const joinPayload = {
        session_id: createResponse.data.session_id,
        user_id: 'user-002',
      };

      const joinResponse = await client
        .send('poker.join.session', joinPayload)
        .toPromise();

      expect(joinResponse).toBeDefined();
      expect(joinResponse.message).toBe('Room joined successfully');


      const joinSession = await sessionRepository
        .createQueryBuilder('session')
        .leftJoinAndSelect('session.join_session', 'join_session')
        .where('session.session_id = :sessionId', {
          sessionId: createResponse.data.session_id,
        })
        .getOne();

      expect(joinSession.join_session).toHaveLength(1);
      expect(joinSession.join_session[0].user_id).toBe('user-002');
    }, 30000);

    it('should prevent user from joining non-existent session', async () => {
      const joinPayload = {
        session_id: '12345678-1234-1234-1234-123456789abc',
        user_id: 'user-002',
      };

      try {
        await client.send('poker.join.session', joinPayload).toPromise();
        fail('Should have thrown an error for non-existent session');
      } catch (error) {
        expect(error.message).toBe('Room not found');
      }
    }, 30000);
  });

  describe('poker.join.session.code', () => {
    it('should allow a user to join a session using session code', async () => {
  
      const createPayload = {
        session_name: 'Poker Room with Code',
        created_by: 'user-001',
        leader_id: LEADER_ID,
        project_id: PROJECT_ID,
        description: 'Test room with code',
        session_code: 'TEST123',
        deck: [
          {
            id: 'story-1',
            title: 'Test story',
            description: 'Test description',
            priority: 'High',
          },
        ],
      };

      const mockProject = [{ id: PROJECT_ID, name: 'Awesome Project' }];
      jest
        .spyOn(pokerService as any, 'findProjectSessions')
        .mockResolvedValue(mockProject);

      await client.send('poker.create.session', createPayload).toPromise();


      const joinPayload = {
        session_code: 'POKER-TEST123',
        user_id: 'user-003',
      };

      const joinResponse = await client
        .send('poker.join.session.code', joinPayload)
        .toPromise();

      expect(joinResponse).toBeDefined();
      expect(joinResponse.message).toBe('Room joined successfully');
    }, 30000);

    it('should reject invalid session code', async () => {
      const joinPayload = {
        session_code: 'INVALID-CODE',
        user_id: 'user-003',
      };

      try {
        await client
          .send('poker.join.session.code', joinPayload)
          .toPromise();
        fail('Should have thrown an error for invalid session code');
      } catch (error) {
       
        expect(error.message).toBe('Error joining room');
      }
    }, 30000);
  });

  describe('poker.validate.session', () => {
    it('should validate that a user is in an active session', async () => {
      
      const createPayload = {
        session_name: 'Validation Test Room',
        created_by: 'user-001',
        leader_id: LEADER_ID,
        project_id: PROJECT_ID,
        description: 'Test room for validation',
        deck: [
          {
            id: 'story-1',
            title: 'Test story',
            description: 'Test description',
            priority: 'High',
          },
        ],
      };

      const mockProject = [{ id: PROJECT_ID, name: 'Awesome Project' }];
      jest
        .spyOn(pokerService as any, 'findProjectSessions')
        .mockResolvedValue(mockProject);

      const createResponse = await client
        .send('poker.create.session', createPayload)
        .toPromise();

      const joinPayload = {
        session_id: createResponse.data.session_id,
        user_id: 'user-004',
      };

      await client.send('poker.join.session', joinPayload).toPromise();


      const validatePayload = {
        user_id: 'user-004',
      };

      const validateResponse = await client
        .send('poker.validate.session', validatePayload)
        .toPromise();

      expect(validateResponse).toBeDefined();
      expect(validateResponse.message).toBe('User found in the session');
      expect(validateResponse.isInSession).toBe(true);
      expect(validateResponse.session_id).toBe(createResponse.data.session_id);
    }, 30000);
  });

  describe('poker.get.session', () => {
    it('should return session information by session ID', async () => {
    
      const createPayload = {
        session_name: 'Get Session Test Room',
        created_by: 'user-001',
        leader_id: LEADER_ID,
        project_id: PROJECT_ID,
        description: 'Test room for getting info',
        deck: [
          {
            id: 'story-1',
            title: 'Test story',
            description: 'Test description',
            priority: 'High',
          },
        ],
      };

      const mockProject = [{ id: PROJECT_ID, name: 'Awesome Project' }];
      jest
        .spyOn(pokerService as any, 'findProjectSessions')
        .mockResolvedValue(mockProject);

      const createResponse = await client
        .send('poker.create.session', createPayload)
        .toPromise();

      
      const getResponse = await client
        .send('poker.get.session', createResponse.data.session_id)
        .toPromise();

      expect(getResponse).toBeDefined();
      expect(getResponse.message).toBe('Session info fetched successfully');
      expect(getResponse.data.session_name).toBe(createPayload.session_name);
      expect(getResponse.data.project_id).toBe(createPayload.project_id);
    }, 30000);
  });

  describe('poker.get.all.session', () => {
    it('should return all active sessions', async () => {
      
      const createPayload1 = {
        session_name: 'Active Room 1',
        created_by: 'user-001',
        leader_id: LEADER_ID,
        project_id: PROJECT_ID,
        description: 'First active room',
        deck: [{ id: 'story-1', title: 'Story', description: 'Desc', priority: 'High' }],
      };

      const createPayload2 = {
        session_name: 'Active Room 2',
        created_by: 'user-002',
        leader_id: LEADER_ID,
        project_id: PROJECT_ID,
        description: 'Second active room',
        deck: [{ id: 'story-2', title: 'Story 2', description: 'Desc 2', priority: 'Medium' }],
      };

      const mockProject = [{ id: PROJECT_ID, name: 'Awesome Project' }];
      jest
        .spyOn(pokerService as any, 'findProjectSessions')
        .mockResolvedValue(mockProject);

      await client.send('poker.create.session', createPayload1).toPromise();
      await client.send('poker.create.session', createPayload2).toPromise();

 
      const getAllResponse = await client
        .send('poker.get.all.session', {})
        .toPromise();

      expect(getAllResponse).toBeDefined();
      expect(getAllResponse.message).toBe('Rooms fetched successfully');
      expect(getAllResponse.data).toHaveLength(2);
      expect(getAllResponse.data[0].session_name).toBe('Active Room 1');
      expect(getAllResponse.data[1].session_name).toBe('Active Room 2');
    }, 30000);
  });
});
