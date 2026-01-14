import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
console.log('Position count fields:', Object.keys((prisma as any)._runtimeDataModel.models.Position.fields).filter(f => (prisma as any)._runtimeDataModel.models.Position.fields[f].kind === 'object'));
process.exit(0);
