import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { PokerWsService } from './poker-ws.service';
import { CreatePokerWDto } from './dto/create-poker-w.dto';
import { UpdatePokerWDto } from './dto/update-poker-w.dto';

@WebSocketGateway()
export class PokerWsGateway {
  constructor(private readonly pokerWsService: PokerWsService) {}

  @SubscribeMessage('createPokerW')
  create(@MessageBody() createPokerWDto: CreatePokerWDto) {
    return this.pokerWsService.create(createPokerWDto);
  }

  @SubscribeMessage('findAllPokerWs')
  findAll() {
    return this.pokerWsService.findAll();
  }

  @SubscribeMessage('findOnePokerW')
  findOne(@MessageBody() id: number) {
    return this.pokerWsService.findOne(id);
  }

  @SubscribeMessage('updatePokerW')
  update(@MessageBody() updatePokerWDto: UpdatePokerWDto) {
    return this.pokerWsService.update(updatePokerWDto.id, updatePokerWDto);
  }

  @SubscribeMessage('removePokerW')
  remove(@MessageBody() id: number) {
    return this.pokerWsService.remove(id);
  }
}
