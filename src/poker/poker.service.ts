import { Injectable } from '@nestjs/common';
import { CreatePokerDto } from './dto/create-poker.dto';
import { UpdatePokerDto } from './dto/update-poker.dto';
import db from 'src/db/db';

@Injectable()
export class PokerService {
  create(createPokerDto: CreatePokerDto) {
      //TODO: Aqui tiene que hacer algo para conectarlo con Nats.io y que funcione con microservicios!!!!
      //TODO: Recuerde usar db que es para conectarse a la base de datos y hacer las operaciones necesarias
    return 'This action adds a new poker';
  }

  findAll() {
    return `This action returns all poker`;
  }

  findOne(id: number) {
    return `This action returns a #${id} poker`;
  }

  update(id: number, updatePokerDto: UpdatePokerDto) {
    return `This action updates a #${id} poker`;
  }

  remove(id: number) {
    return `This action removes a #${id} poker`;
  }
}
