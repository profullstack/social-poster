/**
 * Media Upload Example
 * Demonstrates how to post content with media files
 */

import { PostService } from '../src/post-service.js';
import { MediaUploader } from '../src/media-upload.js';

async function mediaUploadExample() {
  console.log('🎬 Media Upload Example\n');

  // Initialize services
  const postService = new PostService();
  const mediaUploader = new MediaUploader();

  try {
    // Example 1: Validate a media file
    console.log('📋 Example 1: File Validation');
    const imagePath = './examples/sample-image.jpg'; // This would be a real file
    
    console.log(`Validating file: ${imagePath}`);
    const validation = await mediaUploader.validateFile(imagePath);
    
    if (validation.valid) {
      console.log(`✅ File is valid: ${validation.formattedSize} ${validation.type}`);
    } else {
      console.log(`❌ File validation failed: ${validation.error}`);
    }

    // Example 2: Prepare file for upload
    console.log('\n📋 Example 2: File Preparation');
    if (validation.valid) {
      const uploadResult = await mediaUploader.prepareUpload(imagePath);
      
      if (uploadResult.success) {
        console.log('✅ File prepared for upload');
        console.log(`   Name: ${uploadResult.file.name}`);
        console.log(`   Type: ${uploadResult.file.type}`);
        console.log(`   Size: ${uploadResult.file.formattedSize}`);
        console.log(`   MIME: ${uploadResult.file.mimeType}`);
      }
    }

    // Example 3: Post with media file
    console.log('\n📋 Example 3: Posting with Media');
    
    const content = {
      text: 'Check out this amazing image! 📸',
      media: validation.valid ? await mediaUploader.prepareUpload(imagePath) : null,
      type: 'media'
    };

    console.log('Content to post:');
    console.log(`  Text: ${content.text}`);
    console.log(`  Media: ${content.media ? content.media.file.name : 'None'}`);

    // Note: This would actually post to social media platforms
    // const result = await postService.post(content, ['x', 'linkedin']);
    console.log('📝 (Posting disabled in example - remove this line to actually post)');

  } catch (error) {
    console.error('❌ Example failed:', error.message);
  } finally {
    await postService.close();
  }
}

// CLI Usage Examples
console.log('📚 CLI Usage Examples:\n');

console.log('1. Post image with text:');
console.log('   sp post --file ./image.jpg --text "Check out this photo!"');

console.log('\n2. Post video with link:');
console.log('   sp post --file ./video.mp4 --link "https://example.com" --text "Amazing video!"');

console.log('\n3. Post image to specific platforms:');
console.log('   sp post --file ./image.png --platforms "x,linkedin" --text "Professional photo"');

console.log('\n4. Post file only (no text):');
console.log('   sp post --file ./meme.gif');

console.log('\n5. AI-generated content with media:');
console.log('   sp post --file ./chart.png --prompt "Create engaging text for this data visualization"');

console.log('\n📋 Supported File Types:');
console.log('Images: .jpg, .jpeg, .png, .gif, .webp');
console.log('Videos: .mp4, .mov, .avi, .webm');

console.log('\n📏 File Size Limits:');
console.log('Images: 5MB maximum');
console.log('Videos: 50MB maximum');

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  mediaUploadExample().catch(console.error);
}

export { mediaUploadExample };