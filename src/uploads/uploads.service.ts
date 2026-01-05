import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadsService {
    private readonly logger = new Logger(UploadsService.name);

    constructor(private configService: ConfigService) {
        this.ensureUploadsDir();
    }

    private ensureUploadsDir(category: string = 'avatars') {
        const uploadDir = path.resolve(process.cwd(), `uploads/${category}`);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            this.logger.log(`Created directory: ${uploadDir}`);
        }
    }

    getPublicUrl(filename: string, category: string = 'avatars'): string {
        const apiUrl = this.configService.get<string>('API_URL') || 'http://localhost:3000';
        // Remove trailing slash if present
        let baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

        // Remove /api suffix if it exists, as static files are usually served outside global prefix
        if (baseUrl.endsWith('/api')) {
            baseUrl = baseUrl.slice(0, -4);
        }

        const publicUrl = `${baseUrl}/uploads/${category}/${filename}`;
        this.logger.log(`Generated public URL for ${category}: ${publicUrl}`);
        return publicUrl;
    }
}
