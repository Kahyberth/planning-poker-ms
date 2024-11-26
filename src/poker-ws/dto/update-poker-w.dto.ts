import { PartialType } from '@nestjs/mapped-types';
import { CreatePokerWDto } from './create-poker-w.dto';

export class UpdatePokerWDto extends PartialType(CreatePokerWDto) {
  id: number;
}
