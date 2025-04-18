import path from 'node:path'
import { PrismaConfig } from 'prisma'

export default {
  earlyAccess: true,
//   schema: path.join('prisma', 'schema.prisma'),
  schema: path.join('prisma'),
} satisfies PrismaConfig