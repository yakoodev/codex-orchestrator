import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException
} from "@aws-sdk/client-s3";
import type { StorageService } from "../runtime/contracts";

export class S3StorageService implements StorageService {
  public constructor(
    private readonly client: S3Client,
    private readonly bucket: string
  ) {}

  public async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return;
    } catch (error) {
      const exception = error as S3ServiceException;
      if (exception.$metadata.httpStatusCode !== 404) {
        throw error;
      }
    }

    await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
  }

  public async checkReady(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }

  public async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      })
    );
  }
}
