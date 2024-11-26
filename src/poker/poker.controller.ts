import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PokerService } from './poker.service';
import { CreatePokerDto } from './dto/create-poker.dto';
import { UpdatePokerDto } from './dto/update-poker.dto';

@Controller()
export class PokerController {
  constructor(private readonly pokerService: PokerService) {}

  @MessagePattern('createPoker')
  create(@Payload() createPokerDto: CreatePokerDto) {
    return this.pokerService.create(createPokerDto);
  }

  @MessagePattern('findAllPoker')
  findAll() {
    return this.pokerService.findAll();
  }

  @MessagePattern('findOnePoker')
  findOne(@Payload() id: number) {
    return this.pokerService.findOne(id);
  }

  @MessagePattern('updatePoker')
  update(@Payload() updatePokerDto: UpdatePokerDto) {
    return this.pokerService.update(updatePokerDto.id, updatePokerDto);
  }

  @MessagePattern('removePoker')
  remove(@Payload() id: number) {
    return this.pokerService.remove(id);
  }
}
