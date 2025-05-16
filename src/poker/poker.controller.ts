import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PokerService } from './poker.service';
import { CreatePokerDto } from './dto/create-poker.dto';
import {
  joinSessionByCode,
  joinSession,
} from 'src/commons/interfaces/Sessions';
import { ValidateSession } from './dto/validate-session.dto';
import { EstimationService } from 'src/estimation/estimation.service';
import { EstimationDto } from 'src/estimation/dto/estimation.dto';

@Controller()
export class PokerController {
  constructor(
    private readonly pokerService: PokerService,
    private readonly estimationService: EstimationService,
  ) {}

  @MessagePattern('poker.create.session')
  create(@Payload() createPokerDto: CreatePokerDto) {
    return this.pokerService.createSession(createPokerDto);
  }

  @MessagePattern('poker.join.session.code')
  joinRoomByCode(@Payload() data: joinSessionByCode) {
    const { user_id, session_code } = data;
    return this.pokerService.joinSessionByCode(session_code, user_id);
  }

  @MessagePattern('poker.join.session')
  joinRoom(@Payload() data: joinSession) {
    const { session_id, user_id } = data;
    return this.pokerService.joinSession(session_id, user_id);
  }

  @MessagePattern('poker.get.all.session')
  getAllRooms() {
    return this.pokerService.getAllRooms();
  }

  // @MessagePattern('start.session')
  // startSession(@Payload() session_code: string) {
  //   return this.pokerService.startSession(session_code);
  // }

  @MessagePattern('poker.validate.session')
  validateSession(@Payload() data: ValidateSession) {
    return this.pokerService.validateSession(data);
  }

  @MessagePattern('poker.ai.estimation')
  async getStoryEstimation(@Payload() data: EstimationDto) {
    try {
      console.log('Received data for estimation:', data);
      const result = await this.estimationService.getStoryEstimation(data);
      console.log('Estimation result:', result);
      return result;
    } catch (error) {
      console.error('Error in getStoryEstimation:', error);
      throw new Error('Failed to get story estimation');
    }
  }

  @MessagePattern('poker.get.session')
  getSession(@Payload() session_id: string) {
    return this.pokerService.getSessionInfo(session_id);
  }
}
