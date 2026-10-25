import sharp from 'sharp';
import type { ImageFile, ImageModel } from '@/lib/ai/image-model';

// A plain 1536×2752 PNG, the size Nano Banana 2.1 returns.
export async function tallPng(): Promise<Uint8Array> {
  const png = await sharp({
    create: { width: 1536, height: 2752, channels: 3, background: '#b08a60' },
  })
    .png()
    .toBuffer();
  return new Uint8Array(png);
}

// An image model that answers what `answer` gives, and remembers each prompt.
export function fakeImageModel(
  answer: (prompt: string, signal: AbortSignal) => Promise<ImageFile | null>,
): ImageModel & { prompts: string[] } {
  const prompts: string[] = [];
  return {
    prompts,
    makeImage(prompt, signal) {
      prompts.push(prompt);
      return answer(prompt, signal);
    },
  };
}
