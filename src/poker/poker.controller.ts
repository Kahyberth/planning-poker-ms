import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PokerService } from './poker.service';
import { CreatePokerDto } from './dto/create-poker.dto';

@Controller()
export class PokerController {
  constructor(private readonly pokerService: PokerService) {}

  @MessagePattern('poker.create.session')
  create(@Payload() createPokerDto: CreatePokerDto) {
    return this.pokerService.createRoom(createPokerDto);
  }
}
