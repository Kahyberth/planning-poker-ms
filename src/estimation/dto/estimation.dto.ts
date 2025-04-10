import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class EstimationDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  priority: string;

  @IsOptional()
  @IsArray()
  acceptanceCriteria?: string[];

  @IsArray()
  @IsNumber({}, { each: true })
  votes: number[];

  @IsArray()
  @IsString({ each: true })
  complexityFactors: string[];

  @IsString()
  descriptionClarity: string;
}
