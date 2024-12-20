import { HttpStatus, Injectable } from '@nestjs/common';
import { CreatePokerDto } from './dto/create-poker.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { Session } from './entities/session.entity';
import { SessionStatus } from 'src/commons/enums/poker.enums';
import { getSessions } from 'src/commons/interfaces/Sessions';
import { SessionRole, UserSession } from './entities/user.session.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PokerService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,

    @InjectRepository(UserSession)
    private readonly userSessionRepository: Repository<UserSession>,
  ) {}

  async createRoom(createPokerDto: CreatePokerDto) {
    try {
      const { created_by, session_name, session_code, description } =
        createPokerDto;

      const isSession = await this.sessionRepository.findOne({
        where: {
          is_active: true,
          session_name,
        },
      });

      if (isSession) {
        throw new RpcException({
          message: 'Room already exists',
          code: HttpStatus.CONFLICT,
        });
      }

      let newSession: Session;

      if (!session_code) {
        console.log('Creating room without code');

        newSession = this.sessionRepository.create({
          created_by,
          session_name,
          created_at: new Date(),
          session_code: uuidv4(),
          description,
        });

        console.log('New session:', newSession.session_code);

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
        session_code,
        description,
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

  async joinRoomByCode(session_code: string, user_id: string) {
    try {
      const session = await this.sessionRepository.findOne({
        where: { session_code, is_active: true },
        relations: ['user_sessions'],
      });

      if (!session) {
        throw new RpcException({
          message: 'Room not found or inactive',
          code: HttpStatus.NOT_FOUND,
        });
      }

      const userAlreadyInSession = session.user_sessions.some(
        (userSession) => userSession.user_id === user_id,
      );

      if (userAlreadyInSession) {
        return {
          message: 'User already joined the session',
          data: {
            session_id: session.session_id,
            user_id,
          },
        };
      }

      const newUserSession = this.userSessionRepository.create({
        user_id,
        session_id: session.session_id,
        session_role: SessionRole.MEMBER,
      });

      await this.userSessionRepository.save(newUserSession);

      return {
        message: 'User joined the room successfully',
        data: {
          session_id: session.session_id,
          user_id,
          session_name: session.session_name,
          session_role: SessionRole.MEMBER,
        },
      };
    } catch (error) {
      console.error('Error joining room:', error);

      throw new RpcException({
        message: 'Error joining the room',
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }

  async joinRoom(session_id: string, user_id: string) {
    try {
      const session = await this.sessionRepository.findOne({
        where: { session_id, is_active: true },
        relations: ['user_sessions'],
      });

      if (!session) {
        throw new RpcException({
          message: 'Room not found or inactive',
          code: HttpStatus.NOT_FOUND,
        });
      }

      const userAlreadyInSession = session.user_sessions.some(
        (userSession) => userSession.user_id === user_id,
      );

      if (userAlreadyInSession) {
        return {
          message: 'User already joined the session',
          data: {
            session_id: session.session_id,
            user_id,
          },
        };
      }

      const newUserSession = this.userSessionRepository.create({
        user_id,
        session_id: session.session_id,
        session_role: SessionRole.MEMBER,
      });

      await this.userSessionRepository.save(newUserSession);

      return {
        message: 'User joined the room successfully',
        data: {
          session_id: session.session_id,
          user_id,
          session_name: session.session_name,
          session_role: SessionRole.MEMBER,
        },
      };
    } catch (error) {
      console.error('Error joining room:', error);

      throw new RpcException({
        message: 'Error joining the room',
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }

  async verifyUserInSession(session_id: string, user_id: string) {
    const session = await this.userSessionRepository.findOne({
      where: { session_id, user_id },
    });

    if (session === null) {
      console.log('User not in session');
      throw new RpcException({
        message: 'Room not found or inactive',
        code: HttpStatus.NOT_FOUND,
      });
    }

    if (!session) {
      throw new RpcException({
        message: 'User not in session',
        code: HttpStatus.NOT_FOUND,
      });
    }
    return {
      message: 'User verified in session',
      data: session,
    };
  }

  async getAllRooms() {
    try {
      const rooms = await this.sessionRepository.find({
        relations: ['user_sessions'],
      });

      const sessions: getSessions[] = rooms.map((room) => ({
        id: room.session_id,
        name: room.session_name,
        members: room.user_sessions ? room.user_sessions.length : 0,
        status: room.status,
        project: 'Project X',
        lastActivity: new Date(),
        isPrivate: !!room.session_code,
      }));

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

  async startSession(session_id: string) {
    try {
      const session = await this.sessionRepository.findOne({
        where: {
          session_id,
          is_active: true,
          status: SessionStatus.WAITING,
        },
      });

      if (!session) {
        throw new RpcException({
          message: 'Session not found',
          code: HttpStatus.NOT_FOUND,
        });
      }

      session.is_active = true;

      await this.sessionRepository.save(session);

      return {
        message: 'Session started successfully',
        data: session,
      };
    } catch (error) {
      console.error(error);
      throw new RpcException({
        message: 'Error starting session',
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }
}
