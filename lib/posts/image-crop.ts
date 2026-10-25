import sharp from 'sharp';
import { IMAGE_SIZES } from './image';

// The model's tall image as Instagram takes it (docs/specs/posts/generate-images,
// "Shrinking and cropping"): a 1080×1920 story, and the post as the story's
// centred 1080×1350. Both JPEG, sRGB, with no metadata.

const QUALITY = 85;
const POST_TOP = (IMAGE_SIZES.story.height - IMAGE_SIZES.post.height) / 2;

export async function storyAndPost(
  data: Uint8Array,
): Promise<{ story: Buffer; post: Buffer; inWidth: number; inHeight: number }> {
  const source = sharp(data);
  const meta = await source.metadata();
  const resized = await source
    .rotate()
    .resize(IMAGE_SIZES.story.width, IMAGE_SIZES.story.height, {
      fit: 'cover',
      position: 'centre',
    })
    .toColorspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raw = {
    raw: {
      width: resized.info.width,
      height: resized.info.height,
      channels: resized.info.channels,
    },
  };
  const [story, post] = await Promise.all([
    sharp(resized.data, raw).jpeg({ quality: QUALITY }).toBuffer(),
    sharp(resized.data, raw)
      .extract({
        left: 0,
        top: POST_TOP,
        width: IMAGE_SIZES.post.width,
        height: IMAGE_SIZES.post.height,
      })
      .jpeg({ quality: QUALITY })
      .toBuffer(),
  ]);
  return { story, post, inWidth: meta.width ?? 0, inHeight: meta.height ?? 0 };
}
