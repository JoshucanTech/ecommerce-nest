import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsUUID, IsOptional } from "class-validator";

export class CreateCommentDto {
  @ApiProperty({
    description: "Comment content",
    example: "This product looks great! Does it come in other colors?",
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: "Product ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({
    description: "Parent comment ID (for replies)",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
