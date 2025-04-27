import { PartialType } from "@nestjs/swagger"
import { CreateAdPlatformConfigDto } from "./create-ad-platform-config.dto"
import { IsUUID } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class UpdateAdPlatformConfigDto extends PartialType(CreateAdPlatformConfigDto) {
  @ApiProperty({ example: "ad-platform-config-uuid" })
  @IsUUID()
  id: string
}
