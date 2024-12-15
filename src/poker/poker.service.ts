import { Injectable } from '@nestjs/common';
import { CreatePokerDto } from './dto/create-poker.dto';
@Injectable()
export class PokerService {
  async createRoom(createPokerDto: CreatePokerDto) {
    return createPokerDto;
  }
}
