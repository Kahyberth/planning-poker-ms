import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreatePokerDto } from './dto/create-poker.dto';
import { IsNull, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { Session } from './entities/session.entity';
import { VotingScale } from 'src/commons/enums/poker.enums';
import { Join_Session } from './entities/join.session.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import axios from 'axios';
import { envs } from 'src/commons/envs';
import { Decks } from './entities/decks.entity';
import { Chat } from './entities/chat.entity';
import { ValidateSession } from './dto/validate-session.dto';
import { MagicLinkService } from 'src/magic-link-service/magic-link-service.service';

interface Project {
  id: number;
  name: string;
}

@Injectable()
export class PokerService {
  constructor(
    private readonly magicLinkService: MagicLinkService,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,

    @InjectRepository(Join_Session)
    private readonly joinSessionRepository: Repository<Join_Session>,

    @InjectRepository(Decks)
    private readonly decksRepository: Repository<Decks>,

    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
  ) {}

  async createSession(createPokerDto: CreatePokerDto) {
    try {
      const {
        created_by,
        session_name,
        session_code,
        voting_scale,
        description,
        project_id,
        deck,
      } = createPokerDto;

      const isSession = await this.sessionRepository.findOne({
        where: {
          is_active: true,
          session_name,
        },
      });

      const isProject = this.findProjectSessions(project_id);

      if (!isProject) {
        throw new RpcException({
          message: 'Project not found',
          code: HttpStatus.NOT_FOUND,
        });
      }

      if (isSession) {
        throw new RpcException({
          message: 'Room already exists',
          code: HttpStatus.CONFLICT,
        });
      }

      const user = await axios
        .get(`${envs.CLIENT_GATEWAY_URL}/api/auth/find/user/${created_by}`)
        .then((res) => {
          return res.data;
        });

      if (!user) {
        throw new RpcException({
          message: 'User not found',
          code: HttpStatus.NOT_FOUND,
        });
      }

      // Create a new deck of cards
      const newDeck = this.decksRepository.create({
        deck_cards: deck,
        session: isSession,
      });

      await this.decksRepository.save(newDeck);

      let newSession: Session;

      if (!session_code || session_code === '') {
        newSession = this.sessionRepository.create({
          created_by: user[0].name,
          session_name,
          created_at: new Date(),
          voting_scale: voting_scale || VotingScale.FIBONACCI,
          description,
          project_id,
          project_name: isProject.name,
          decks: newDeck,
        });

        const savedSession = await this.sessionRepository.save(newSession);

        return {
          message: 'Room created successfully',
          data: savedSession,
        };
      }

      newSession = this.sessionRepository.create({
        created_by: user[0].name,
        session_name,
        created_at: new Date(),
        voting_scale: voting_scale || VotingScale.FIBONACCI,
        session_code: 'POKER-' + session_code,
        description,
        project_id,
        project_name: isProject.name,
        decks: newDeck,
      });

      const savedSession = await this.sessionRepository.save(newSession);

      return {
        message: 'Room created successfully',
        data: savedSession,
      };
    } catch (error) {
      console.error(error);
      throw new RpcException({
        message: 'Error creating room',
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }

  findProjectSessions(project_id: string) {
    const mockProjects: Project[] = [
      { id: 1, name: 'Proyecto Alfa' },
      { id: 2, name: 'Proyecto Beta' },
      { id: 3, name: 'Proyecto Gamma' },
      { id: 4, name: 'Proyecto Delta' },
      { id: 5, name: 'Proyecto Epsilon' },
      { id: 6, name: 'Proyecto Zeta' },
      { id: 7, name: 'Proyecto Eta' },
      { id: 8, name: 'Proyecto Theta' },
      { id: 9, name: 'Proyecto Iota' },
      { id: 10, name: 'Proyecto Kappa' },
    ];

    const project = mockProjects.find((p) => p.id === +project_id);

    if (!project) {
      throw new RpcException({
        message: 'Project not found',
        code: HttpStatus.NOT_FOUND,
      });
    }

    return project;
  }

  async joinSession(session_id: string, user_id: string) {
    console.log('Joining session:', session_id, user_id);

    try {
      const session = await this.sessionRepository.findOne({
        where: { session_id },
      });

      if (!session) {
        throw new RpcException({
          message: 'Room not found',
          code: HttpStatus.NOT_FOUND,
        });
      }

      if (!session.is_active) {
        throw new RpcException({
          message: 'Room is not active',
          code: HttpStatus.CONFLICT,
        });
      }

      const isUserAlreadyInSession = await this.joinSessionRepository.findOne({
        where: {
          user_id,
          session,
          left_at: IsNull(),
        },
      });

      if (isUserAlreadyInSession) {
        throw new RpcException({
          message: 'User already in session',
          code: HttpStatus.BAD_REQUEST,
        });
      }

      const userJoinSession = await this.joinSessionRepository.findOne({
        where: {
          user_id,
          left_at: IsNull(),
        },
        relations: ['session'],
      });

      if (
        userJoinSession &&
        userJoinSession.session &&
        userJoinSession.session.is_active
      ) {
        throw new RpcException({
          message: 'User already in an active session',
          code: HttpStatus.CONFLICT,
        });
      }

      const join_session = this.joinSessionRepository.create({
        user_id,
        joined_at: new Date(),
        session,
      });

      await this.joinSessionRepository.save(join_session);

      return {
        message: 'Room joined successfully',
      };
    } catch (error) {
      throw new RpcException(error);
    }
  }

  async joinSessionByCode(session_code: string, user_id: string) {
    try {
      const session = await this.sessionRepository.findOne({
        where: { session_code },
      });

      if (!session) {
        throw new RpcException({
          message: 'Incorrect session code',
          code: HttpStatus.NOT_FOUND,
        });
      }

      const isUserInSession = await this.joinSessionRepository.findOne({
        where: {
          user_id,
        },
      });

      if (isUserInSession) {
        throw new RpcException({
          message: 'User already in room',
          code: HttpStatus.CONFLICT,
        });
      }

      const join_session = this.joinSessionRepository.create({
        user_id,
        joined_at: new Date(),
        session,
      });

      await this.joinSessionRepository.save(join_session);

      return {
        message: 'Room joined successfully',
      };
    } catch (error) {
      console.error(error);
      throw new RpcException({
        message: 'Error joining room',
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }

  async joinSessionByMagicLink(token: string, user_id: string) {
    try {
      const { sessionId } = this.magicLinkService.verifyMagicLinkToken(token);

      await this.joinSession(sessionId, user_id);

      return {
        message: 'Room joined successfully',
      };
    } catch {
      throw new RpcException({
        message: 'Invalid or expired token',
        code: HttpStatus.UNAUTHORIZED,
      });
    }
  }

  async getAllRooms() {
    try {
      const sessions = await this.sessionRepository.find({
        where: {
          is_active: true,
        },
      });

      return {
        message: 'Rooms fetched successfully',
        data: sessions,
      };
    } catch (error) {
      console.error(error);
      throw new RpcException({
        message: 'Error fetching rooms',
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }

  async validateSession(
    payload: ValidateSession,
  ): Promise<{ message: string; isInSession: boolean }> {
    const { session_id, user_id } = payload;

    const joinSession = await this.joinSessionRepository
      .createQueryBuilder('js')
      .innerJoin('js.session', 's')
      .where('s.session_id = :session_id', { session_id })
      .andWhere('js.user_id = :user_id', { user_id })
      .andWhere('js.left_at IS NULL')
      .getOne();

    if (!joinSession) {
      throw new RpcException({
        message: 'User not found in the session',
        code: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }

    return {
      message: 'User found in the session',
      isInSession: true,
    };
  }
}
