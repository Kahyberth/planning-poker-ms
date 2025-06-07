import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { VotingScale } from '../commons/enums/poker.enums';
import { IsNull, Repository } from 'typeorm';
import { CreatePokerDto } from './dto/create-poker.dto';
import { ValidateSession } from './dto/validate-session.dto';
import { Decks } from './entities/decks.entity';
import { Join_Session } from './entities/join.session.entity';
import { Session } from './entities/session.entity';
import { catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class PokerService {
  private readonly logger = new Logger(PokerService.name);
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,

    @InjectRepository(Join_Session)
    private readonly joinSessionRepository: Repository<Join_Session>,

    @InjectRepository(Decks)
    private readonly decksRepository: Repository<Decks>,

    @Inject('NATS_SERVICE')
    private readonly client: ClientProxy,
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
        leader_id,
      } = createPokerDto;

      const isSession = await this.sessionRepository.findOne({
        where: {
          is_active: true,
          session_name,
        },
      });

      const [isProject] = await this.findProjectSessions(project_id);


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

      const newDeck = this.decksRepository.create({
        deck_cards: deck,
        session: isSession,
      });

      await this.decksRepository.save(newDeck);

      let newSession: Session;

      if (!session_code || session_code === '') {
        newSession = this.sessionRepository.create({
          created_by,
          session_name,
          created_at: new Date(),
          voting_scale: voting_scale || VotingScale.FIBONACCI,
          description,
          project_id,
          project_name: isProject.name,
          decks: newDeck,
          leader_id,
        });

        const savedSession = await this.sessionRepository.save(newSession);

        return {
          message: 'Room created successfully',
          data: savedSession,
        };
      }

      newSession = this.sessionRepository.create({
        created_by,
        session_name,
        created_at: new Date(),
        voting_scale: voting_scale || VotingScale.FIBONACCI,
        session_code: 'POKER-' + session_code,
        description,
        project_id,
        project_name: isProject.name,
        decks: newDeck,
        leader_id,
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




  

  private async findProjectSessions(project_id: string) {
    return await firstValueFrom(
      this.client.send('projects.findOne.project', project_id).pipe(
        catchError((error) => {
          this.logger.error(`Error fetching project ${project_id}`, error.stack);
          throw error;
        }),
      ),
    );
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
  ): Promise<{ message: string; isInSession: boolean; session_id: string }> {
    const { user_id } = payload;

    if (!user_id) return;

    const joinSession = await this.joinSessionRepository.findOne({
      where: {
        user_id,
        left_at: null,
        is_left: false,
      },
      relations: ['session'],
    });

    if (!joinSession) {
      throw new RpcException({
        message: 'User not found in the session',
        code: HttpStatus.NOT_FOUND,
      });
    }

    if (!joinSession.session) {
      throw new RpcException({
        message: 'Session relation not found',
        code: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }

    if (!joinSession.session.is_active) {
      throw new RpcException({
        message: 'session disabled',
        code: HttpStatus.CONFLICT,
      });
    }

    return {
      message: 'User found in the session',
      session_id: joinSession.session.session_id,
      isInSession: true,
    };
  }

  async getSessionInfo(session_id: string) {
    const session = await this.sessionRepository.findOne({
      where: {
        session_id,
      },
      relations: ['join_session'],
    });

    if (!session) {
      throw new RpcException({
        message: 'Session not found',
        code: HttpStatus.NOT_FOUND,
      });
    }

    return {
      message: 'Session info fetched successfully',
      data: session,
    };
  }

  async getSessionsByProject(project_id: string) {
    try {
      const [project] = await this.findProjectSessions(project_id);

      if (!project) {
        throw new RpcException({
          message: 'Project not found',
          code: HttpStatus.NOT_FOUND,
        });
      }

      const sessions = await this.sessionRepository.find({
        where: {
          project_id,
          is_active: true,
        },
        relations: ['join_session'],
      });

      return {
        message: 'Project sessions fetched successfully',
        data: sessions,
      };
    } catch (error) {
      console.error(error);
      throw new RpcException({
        message: 'Error fetching project sessions',
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }
}
