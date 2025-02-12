import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Session } from '../poker/entities/session.entity';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Vote } from 'src/poker/entities/vote.entity';
import { History } from 'src/poker/entities/history.entity';
import { Decks } from 'src/poker/entities/decks.entity';
import { Join_Session } from 'src/poker/entities/join.session.entity';
import { Chat } from 'src/poker/entities/chat.entity';

@Injectable()
export class PokerWsService {
  constructor(
    @InjectRepository(Vote)
    private readonly voteRepository: Repository<Vote>,

    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,

    @InjectRepository(Decks)
    private readonly decksRepository: Repository<Decks>,

    @InjectRepository(Join_Session)
    private readonly joinSessionRepository: Repository<Join_Session>,

    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,

    private readonly dataSource: DataSource,
  ) {}

  private readonly logger = new Logger(PokerWsService.name);

  async requestDeck(sessionId: string) {
    const decks = await this.decksRepository
      .createQueryBuilder('deck')
      .innerJoinAndSelect('deck.session', 'session')
      .where('session.session_id = :sessionId', { sessionId })
      .andWhere('session.is_active = :active', { active: true })
      .getMany();
    return decks[0].deck_cards;
  }

  async saveVote(votes: any[], session_id: string) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.startTransaction();

    try {
      const session = await queryRunner.manager.findOne(Session, {
        where: { session_id },
      });

      if (!session) {
        throw new BadRequestException('Session not found');
      }

      for (const vote of votes) {
        const { story_id, user_id, card_value, final_value } = vote;
        const currentVote = queryRunner.manager.create(Vote, {
          story_id,
          user_id,
          card_value,
          final_value,
          voted_at: new Date(),
          session,
        });
        await queryRunner.manager.save(currentVote);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error while saving vote: ${error}`);
      throw new BadRequestException('Error while saving vote');
    } finally {
      await queryRunner.release();
    }
  }

  async leaveSession(session_id: string, user_id: string) {
    console.log('session_id', session_id);

    const session = await this.sessionRepository.findOne({
      where: { session_id: session_id },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    const joinSession = await this.joinSessionRepository.findOne({
      where: {
        session,
        user_id,
        left_at: IsNull(),
      },
    });

    if (!joinSession) {
      throw new BadRequestException('User not found in the active session');
    }

    await this.joinSessionRepository.update(joinSession.join_session_id, {
      left_at: new Date(),
    });
  }

  async saveHistory(historyArray: any[], session_id: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const session = await queryRunner.manager.findOne(Session, {
        where: { session_id },
      });
      if (!session) {
        throw new BadRequestException('Session not found');
      }

      for (const record of historyArray) {
        const { story_id, card_value } = record;
        if (!story_id) {
          throw new BadRequestException('story_id is missing');
        }
        const currentHistory = queryRunner.manager.create(History, {
          story_id,
          card_value,
          history_date: new Date(),
          session,
        });
        await queryRunner.manager.save(currentHistory);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error while saving history: ${error}`);
      throw new BadRequestException('Error while saving history');
    } finally {
      await queryRunner.release();
    }
  }

  async deactivateSession(session_id: string) {
    const session = await this.sessionRepository.findOne({
      where: { session_id },
    });
    if (!session) {
      throw new BadRequestException('Session not found');
    }

    session.is_active = false;
    await this.sessionRepository.save(session);
  }

  async saveChatMessage(
    roomId: string,
    user: any,
    message: string,
  ): Promise<Chat> {
    const session = await this.sessionRepository.findOne({
      where: { session_id: roomId },
    });
    if (!session) {
      throw new BadRequestException('Session not found');
    }

    const chat = this.chatRepository.create({
      username: user.name,
      message,
      user_id: user.id,
      session,
    });

    return await this.chatRepository.save(chat);
  }

  async getChatHistory(roomId: string): Promise<Chat[]> {
    const chats = await this.chatRepository
      .createQueryBuilder('chat')
      .innerJoin('chat.session', 'session')
      .where('session.session_id = :roomId', { roomId })
      .orderBy('chat.message_date', 'ASC')
      .getMany();

    return chats;
  }
}
