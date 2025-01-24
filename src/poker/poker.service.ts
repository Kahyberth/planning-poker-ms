import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreatePokerDto } from './dto/create-poker.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { Session } from './entities/session.entity';
import { VotingScale } from 'src/commons/enums/poker.enums';
import { v4 as uuidv4 } from 'uuid';
import { Join_Session } from './entities/join.session.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class PokerService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,

    @InjectRepository(Join_Session)
    private readonly joinSessionRepository: Repository<Join_Session>,
  ) {}

  async createRoom(createPokerDto: CreatePokerDto) {
    try {
      const {
        created_by,
        session_name,
        session_code,
        voting_scale,
        description,
      } = createPokerDto;

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

      if (!session_code || session_code === '') {
        newSession = this.sessionRepository.create({
          created_by,
          session_name,
          created_at: new Date(),
          session_code: 'POKER-' + uuidv4().slice(0, 6).toLocaleUpperCase(),
          voting_scale: voting_scale || VotingScale.FIBONACCI,
          description,
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
        session_code: 'POKER-' + session_code.toLocaleUpperCase(),
        description,
      });

      const savedSession = await this.sessionRepository.save(newSession);

      await this.cacheManager.del('rooms');

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
        where: { session_code },
      });

      if (!session) {
        throw new RpcException({
          message: 'Room not found',
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
      const reply = await this.cacheManager.get('rooms');

      if (reply) {
        return {
          message: 'Rooms fetched successfully',
          data: JSON.parse(reply as string),
        };
      }

      const sessions = await this.sessionRepository.find();

      await this.cacheManager.set('rooms', JSON.stringify(sessions));

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
}
