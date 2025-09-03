import { Injectable } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class MinioService {
  private minioClient: Minio.Client;
  private bucketName = process.env.MINIO_BUCKET_NAME;

  constructor() {
    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_END_POINT,
      port: 443,
      useSSL: true,
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    });
  }

  async uploadFile(
    fileName: string,
    fileBuffer: Buffer,
    contentType: string,
    folder: string = '',
  ): Promise<string> {
    const objectName = folder ? `${folder}/${fileName}` : fileName;

    try {
      await this.minioClient.putObject(
        this.bucketName,
        objectName,
        fileBuffer,
        fileBuffer.length,
        {
          'Content-Type': contentType,
        },
      );

      // 返回檔案的公開 URL
      const endpoint = process.env.MINIO_END_POINT;
      // 確保返回的是完整的 URL
      const protocol = endpoint.startsWith('localhost') ? 'http://' : 'https://';
      return `${protocol}${endpoint}/${this.bucketName}/${objectName}`;
    } catch (error) {
      throw new Error(`檔案上傳失敗: ${error.message}`);
    }
  }

  async deleteFile(fileName: string, folder: string = ''): Promise<void> {
    const objectName = folder ? `${folder}/${fileName}` : fileName;

    try {
      await this.minioClient.removeObject(this.bucketName, objectName);
    } catch (error) {
      throw new Error(`檔案刪除失敗: ${error.message}`);
    }
  }

  async fileExists(fileName: string, folder: string = ''): Promise<boolean> {
    const objectName = folder ? `${folder}/${fileName}` : fileName;

    try {
      await this.minioClient.statObject(this.bucketName, objectName);
      return true;
    } catch {
      return false;
    }
  }

  generateUniqueFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `${timestamp}-${randomString}.${extension}`;
  }
}
