import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PokerService } from './poker.service';
import { CreatePokerDto } from './dto/create-poker.dto';
import { joinSessionByCode } from 'src/commons/interfaces/Sessions';

@Controller()
export class PokerController {
  constructor(private readonly pokerService: PokerService) {}

  @MessagePattern('poker.create.session')
  create(@Payload() createPokerDto: CreatePokerDto) {
    return this.pokerService.createRoom(createPokerDto);
  }

  @MessagePattern('poker.join.session.code')
  joinRoomByCode(@Payload() data: joinSessionByCode) {
    const { user_id, session_code } = data;
    return this.pokerService.joinRoomByCode(session_code, user_id);
  }

  // @MessagePattern('poker.join.session')
  // joinRoom(@Payload() data: joinSession) {
  //   const { session_id, user_id } = data;
  //   return this.pokerService.joinRoom(session_id, user_id);
  // }

  @MessagePattern('poker.get.all.session')
  getAllRooms() {
    return this.pokerService.getAllRooms();
  }

  // @MessagePattern('start.session')
  // startSession(@Payload() session_code: string) {
  //   return this.pokerService.startSession(session_code);
  // }

  // @MessagePattern('poker.verify.user')
  // async verifyUser(@Payload() data: any) {
  //   const { session_id, user_id } = data;
  //   return this.pokerService
  //     .verifyUserInSession(session_id, user_id)
  //     .catch((err) => {
  //       console.error('Error verifying user in session:', err);
  //       throw new RpcException({
  //         message: 'User not in session',
  //         code: 404,
  //       });
  //     });
  // }
}
