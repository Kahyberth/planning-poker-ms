import { Injectable } from '@nestjs/common';
import { CreatePokerWDto } from './dto/create-poker-w.dto';
import { UpdatePokerWDto } from './dto/update-poker-w.dto';

@Injectable()
export class PokerWsService {
  create(createPokerWDto: CreatePokerWDto) {
    return 'This action adds a new pokerW';
  }

  findAll() {
    return `This action returns all pokerWs`;
  }

  findOne(id: number) {
    return `This action returns a #${id} pokerW`;
  }

  update(id: number, updatePokerWDto: UpdatePokerWDto) {
    return `This action updates a #${id} pokerW`;
  }

  remove(id: number) {
    return `This action removes a #${id} pokerW`;
  }
}
