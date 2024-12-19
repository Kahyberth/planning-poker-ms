import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PokerService } from './poker.service';
import { CreatePokerDto } from './dto/create-poker.dto';
import { joinSession } from 'src/commons/interfaces/Sessions';

@Controller()
export class PokerController {
  constructor(private readonly pokerService: PokerService) {}

  @MessagePattern('poker.create.session')
  create(@Payload() createPokerDto: CreatePokerDto) {
    return this.pokerService.createRoom(createPokerDto);
  }

  @MessagePattern('poker.join.session')
  join(@Payload() data: joinSession) {
    const { session_id, user_id } = data;
    return this.pokerService.joinRoomByCode(session_id, user_id);
  }

  @MessagePattern('poker.get.session')
  getAllRooms() {
    return this.pokerService.getAllRooms();
  }

  @MessagePattern('start.session')
  startSession(@Payload() session_code: string) {
    return this.pokerService.startSession(session_code);
  }
}
