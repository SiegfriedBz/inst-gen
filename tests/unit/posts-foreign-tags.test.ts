import { describe, expect, it } from 'vitest';
import { checkPost } from '@/lib/posts/checks';
import { dropForeignTags } from '@/lib/posts/foreign-tags';
import { senProfile, svargaProfile } from './helpers/brand';
import { modelPost } from './helpers/posts';

// docs/specs/posts/marketing-copy, "Hashtags".
describe('dropForeignTags', () => {
  it("drops a tag naming a town of another country, and keeps the business's own", () => {
    expect(dropForeignTags(['canggu', 'massagedanang', 'balimassage'], svargaProfile())).toEqual({
      tags: ['canggu', 'balimassage'],
      dropped: [{ tag: 'massagedanang', place: 'Da Nang' }],
    });
  });

  it('drops a Bali tag on a Vietnamese business', () => {
    expect(dropForeignTags(['danang', 'balispa'], senProfile())).toEqual({
      tags: ['danang'],
      dropped: [{ tag: 'balispa', place: 'Bali' }],
    });
  });

  it("keeps a tag that is one of the business's offerings", () => {
    const profile = senProfile();
    profile.offerings = [
      ...profile.offerings,
      { name: 'Balinese Massage', source: profile.siteUrl },
    ];
    expect(dropForeignTags(['balinesemassage'], profile)).toEqual({
      tags: ['balinesemassage'],
      dropped: [],
    });
  });

  it('ignores accents', () => {
    expect(dropForeignTags(['đànẵng'], svargaProfile()).dropped).toEqual([
      { tag: 'đànẵng', place: 'Da Nang' },
    ]);
  });

  it("checks nothing when the business's country can't be read", () => {
    const profile = svargaProfile();
    profile.siteUrl = 'https://example.com/';
    profile.contact = { ...profile.contact, whatsapp: null, phone: null };
    expect(dropForeignTags(['massagedanang', 'balispa'], profile)).toEqual({
      tags: ['massagedanang', 'balispa'],
      dropped: [],
    });
  });

  it('records the drop when code checks a post', () => {
    const { post, dropped } = checkPost(
      {
        ...modelPost(5),
        storyText: 'Rest well 🌸',
        hashtags: ['canggu', 'massagedanang', 'balimassage'],
      },
      svargaProfile(),
      'post-6',
    );
    expect(post?.hashtags).toEqual(['canggu', 'balimassage']);
    expect(dropped).toContainEqual({
      field: 'hashtags',
      reason: 'post-6: "massagedanang" names Da Nang',
    });
  });
});
