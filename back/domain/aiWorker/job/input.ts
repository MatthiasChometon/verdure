import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

// What the worker posts back (ai/worker/app.py). Absent and null both mean the
// model recognised nothing.
export class SubmitResultInput {
  @IsOptional()
  @IsString()
  species?: string | null;
}

export class SubmitDiagnosisInput {
  @IsString()
  diagnosis: string;
}

export class SubmitEmbeddingInput {
  @IsArray()
  @IsNumber({}, { each: true })
  embedding: number[];
}
