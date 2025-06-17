/**
 * Media Upload Tests
 * Testing file upload functionality for social media posts
 */

import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Use sinon-chai plugin
chai.use(sinonChai);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Media Upload', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('validateMediaFile', () => {
    let validateMediaFile;

    before(async () => {
      const module = await import('../src/media-upload.js');
      validateMediaFile = module.validateMediaFile;
    });

    it('should validate image files', () => {
      const result = validateMediaFile('test.jpg');
      expect(result.valid).to.be.true;
      expect(result.type).to.equal('image');
      expect(result.mimeType).to.equal('image/jpeg');
    });

    it('should validate video files', () => {
      const result = validateMediaFile('test.mp4');
      expect(result.valid).to.be.true;
      expect(result.type).to.equal('video');
      expect(result.mimeType).to.equal('video/mp4');
    });

    it('should reject unsupported file types', () => {
      const result = validateMediaFile('test.txt');
      expect(result.valid).to.be.false;
      expect(result.error).to.include('Unsupported file type');
    });

    it('should reject files without extension', () => {
      const result = validateMediaFile('testfile');
      expect(result.valid).to.be.false;
      expect(result.error).to.include('File must have an extension');
    });

    it('should validate PNG files', () => {
      const result = validateMediaFile('image.png');
      expect(result.valid).to.be.true;
      expect(result.type).to.equal('image');
      expect(result.mimeType).to.equal('image/png');
    });

    it('should validate GIF files', () => {
      const result = validateMediaFile('animation.gif');
      expect(result.valid).to.be.true;
      expect(result.type).to.equal('image');
      expect(result.mimeType).to.equal('image/gif');
    });

    it('should validate MOV files', () => {
      const result = validateMediaFile('video.mov');
      expect(result.valid).to.be.true;
      expect(result.type).to.equal('video');
      expect(result.mimeType).to.equal('video/quicktime');
    });
  });

  describe('checkFileExists', () => {
    let checkFileExists;

    before(async () => {
      const module = await import('../src/media-upload.js');
      checkFileExists = module.checkFileExists;
    });

    it('should return true for existing files', async () => {
      // Create a temporary test file
      const testFile = path.join(__dirname, 'temp-test-file.txt');
      fs.writeFileSync(testFile, 'test content');

      try {
        const exists = await checkFileExists(testFile);
        expect(exists).to.be.true;
      } finally {
        // Clean up
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }
    });

    it('should return false for non-existing files', async () => {
      const exists = await checkFileExists('/path/to/nonexistent/file.jpg');
      expect(exists).to.be.false;
    });

    it('should handle relative paths', async () => {
      const exists = await checkFileExists('./nonexistent.jpg');
      expect(exists).to.be.false;
    });
  });

  describe('getFileSize', () => {
    let getFileSize;

    before(async () => {
      const module = await import('../src/media-upload.js');
      getFileSize = module.getFileSize;
    });

    it('should return file size in bytes', async () => {
      // Create a test file with known content
      const testFile = path.join(__dirname, 'temp-size-test.txt');
      const content = 'Hello World!'; // 12 bytes
      fs.writeFileSync(testFile, content);

      try {
        const size = await getFileSize(testFile);
        expect(size).to.equal(12);
      } finally {
        // Clean up
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }
    });

    it('should throw error for non-existing files', async () => {
      try {
        await getFileSize('/path/to/nonexistent/file.jpg');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('ENOENT');
      }
    });
  });

  describe('validateFileSize', () => {
    let validateFileSize;

    before(async () => {
      const module = await import('../src/media-upload.js');
      validateFileSize = module.validateFileSize;
    });

    it('should accept files within size limits', () => {
      const result = validateFileSize(1024 * 1024, 'image'); // 1MB image
      expect(result.valid).to.be.true;
    });

    it('should reject images that are too large', () => {
      const result = validateFileSize(10 * 1024 * 1024, 'image'); // 10MB image
      expect(result.valid).to.be.false;
      expect(result.error).to.include('Image file too large');
    });

    it('should reject videos that are too large', () => {
      const result = validateFileSize(100 * 1024 * 1024, 'video'); // 100MB video
      expect(result.valid).to.be.false;
      expect(result.error).to.include('Video file too large');
    });

    it('should accept videos within size limits', () => {
      const result = validateFileSize(20 * 1024 * 1024, 'video'); // 20MB video
      expect(result.valid).to.be.true;
    });
  });

  describe('MediaUploader', () => {
    let MediaUploader;
    let uploader;

    before(async () => {
      const module = await import('../src/media-upload.js');
      MediaUploader = module.MediaUploader;
    });

    beforeEach(() => {
      uploader = new MediaUploader();
    });

    describe('constructor', () => {
      it('should initialize with default options', () => {
        expect(uploader.maxImageSize).to.equal(5 * 1024 * 1024); // 5MB
        expect(uploader.maxVideoSize).to.equal(50 * 1024 * 1024); // 50MB
        expect(uploader.supportedImageTypes).to.include('jpg');
        expect(uploader.supportedVideoTypes).to.include('mp4');
      });

      it('should initialize with custom options', () => {
        const customUploader = new MediaUploader({
          maxImageSize: 10 * 1024 * 1024,
          maxVideoSize: 100 * 1024 * 1024,
        });
        expect(customUploader.maxImageSize).to.equal(10 * 1024 * 1024);
        expect(customUploader.maxVideoSize).to.equal(100 * 1024 * 1024);
      });
    });

    describe('validateFile', () => {
      it('should validate a complete file', async () => {
        // Create a test image file
        const testFile = path.join(__dirname, 'temp-image.jpg');
        const imageData = Buffer.from('fake-image-data');
        fs.writeFileSync(testFile, imageData);

        try {
          const result = await uploader.validateFile(testFile);
          expect(result.valid).to.be.true;
          expect(result.type).to.equal('image');
          expect(result.size).to.equal(imageData.length);
        } finally {
          // Clean up
          if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
          }
        }
      });

      it('should reject non-existing files', async () => {
        const result = await uploader.validateFile('/path/to/nonexistent.jpg');
        expect(result.valid).to.be.false;
        expect(result.error).to.include('File does not exist');
      });

      it('should reject files that are too large', async () => {
        // Create a test file that's too large
        const testFile = path.join(__dirname, 'temp-large.jpg');
        const largeData = Buffer.alloc(10 * 1024 * 1024); // 10MB
        fs.writeFileSync(testFile, largeData);

        try {
          const result = await uploader.validateFile(testFile);
          expect(result.valid).to.be.false;
          expect(result.error).to.include('too large');
        } finally {
          // Clean up
          if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
          }
        }
      });
    });

    describe('prepareUpload', () => {
      it('should prepare file for upload', async () => {
        // Create a test file
        const testFile = path.join(__dirname, 'temp-upload.png');
        const imageData = Buffer.from('fake-png-data');
        fs.writeFileSync(testFile, imageData);

        try {
          const result = await uploader.prepareUpload(testFile);
          expect(result.success).to.be.true;
          expect(result.file).to.have.property('path', testFile);
          expect(result.file).to.have.property('type', 'image');
          expect(result.file).to.have.property('mimeType', 'image/png');
          expect(result.file).to.have.property('size', imageData.length);
          expect(result.file).to.have.property('buffer');
          expect(Buffer.isBuffer(result.file.buffer)).to.be.true;
        } finally {
          // Clean up
          if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
          }
        }
      });

      it('should handle validation failures', async () => {
        const result = await uploader.prepareUpload('/nonexistent/file.jpg');
        expect(result.success).to.be.false;
        expect(result.error).to.include('File does not exist');
      });
    });
  });
});