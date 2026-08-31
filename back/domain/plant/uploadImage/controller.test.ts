import { BadRequestException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { FileStorageService } from '../../../infrastructure/file-storage/service';
import { ImageUpload } from '../../../infrastructure/http/image-upload';
import { UploadController } from './controller';

type UploadedFile = { mimetype: string; toBuffer: () => Promise<Buffer> };

const requestWith = (file: UploadedFile | undefined): FastifyRequest =>
  ({ file: () => Promise.resolve(file) }) as unknown as FastifyRequest;

const imageFile = (mimetype: string): UploadedFile => ({
  mimetype,
  toBuffer: () => Promise.resolve(Buffer.from('bytes')),
});

const buildController = (
  storage: Partial<FileStorageService> = {},
): UploadController =>
  new UploadController(storage as FileStorageService, new ImageUpload());

describe('UploadController uploadImage', () => {
  it('stores an image and returns its key', async () => {
    const upload = vi.fn(() => Promise.resolve('plants/generated'));
    const controller = buildController({ upload });

    await expect(
      controller.uploadImage(requestWith(imageFile('image/png'))),
    ).resolves.toEqual({
      key: 'plants/generated',
    });
    expect(upload).toHaveBeenCalledWith(expect.any(Buffer), 'image/png');
  });

  it('rejects a request without a file', async () => {
    const controller = buildController();

    await expect(
      controller.uploadImage(requestWith(undefined)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a non-image file without touching storage', async () => {
    const upload = vi.fn();
    const controller = buildController({ upload });

    await expect(
      controller.uploadImage(requestWith(imageFile('text/plain'))),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(upload).not.toHaveBeenCalled();
  });
});
