import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsString, IsOptional, Min, Max } from "class-validator";

export class UpdateReviewDto {
  @ApiPropertyOptional({ description: "Rating (1-5)", example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    description: "Review comment",
    example: "After using it for a while, I am even more impressed!",
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
