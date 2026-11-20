import { describe, expect, it } from 'vitest';
import { buildAnswer, fillWebsite, mergeGuest } from '@/lib/questions/checks';
import type { ModelAnswer, QuestionBody } from '@/lib/questions/question';

// docs/specs/questions/answer-drafts, "The answer" and "The model call".
function body(overrides: Partial<QuestionBody> = {}): QuestionBody {
  return {
    question: 'Which massages do you have?',
    final: false,
    locale: 'vi',
    business: {
      name: 'Sen',
      summary: null,
      category: 'mobile massage spa',
      offerings: [{ name: 'Thai Massage', duration: '60 min', price: 'VND 500k' }],
      highlights: ['Free travel in our core areas'],
      hours: '08:30-23:00 daily',
      town: 'Da Nang',
      area: null,
      serviceArea: 'My Khe',
      contact: {
        whatsapp: '84898661224',
        phone: null,
        email: null,
        instagram: null,
        bookingUrl: null,
      },
      website: null,
    },
    country: 'VN',
    known: { place: null, day: null, time: null },
    avoid: null,
    ...overrides,
  };
}

const part = (text: string, translation: string | null = `vi: ${text}`) => ({ text, translation });

function model(overrides: Partial<ModelAnswer> = {}): ModelAnswer {
  return {
    questionLanguage: 'en',
    sexual: false,
    unanswered: false,
    questionTranslation: 'vi: question',
    greeting: part('Hello!'),
    answer: part('Our Thai Massage is 60 min: VND 500k. 🌸'),
    professionalOnly: part('We offer only professional therapeutic massage.'),
    callToAction: part('A therapist can come to your hotel whenever suits you.'),
    guest: { place: null, day: null, time: null },
    ...overrides,
  };
}

const ctx = (b: QuestionBody = body()) => ({ body: b, flower: '🪷' });

const callToBook = part('Which day and time suit you, and where are you staying?');

describe('buildAnswer', () => {
  it('ends an answer that is not final on its gentle offer, the flower at the very end', () => {
    const built = buildAnswer(model(), ctx());
    expect(built?.answer.text).toBe(
      'Hello!\n\nOur Thai Massage is 60 min: VND 500k.\n\nA therapist can come to your hotel whenever suits you 🪷',
    );
    expect(built?.answer.translation).toBe(
      'vi: Hello!\n\nvi: Our Thai Massage is 60 min: VND 500k.\n\nvi: A therapist can come to your hotel whenever suits you 🪷',
    );
  });

  it('an empty gentle offer fails nothing', () => {
    const built = buildAnswer(model({ callToAction: part('', null) }), ctx());
    expect(built?.answer.text).toBe('Hello!\n\nOur Thai Massage is 60 min: VND 500k 🪷');
  });

  it('puts the call to book last on a final answer', () => {
    const built = buildAnswer(model({ callToAction: callToBook }), ctx(body({ final: true })));
    expect(
      built?.answer.text.endsWith('\n\nWhich day and time suit you, and where are you staying? 🪷'),
    ).toBe(true);
  });

  it('ends each part on its punctuation, also when its emoji goes', () => {
    const built = buildAnswer(
      model({
        sexual: true,
        greeting: part('Hello', 'vi: Xin chào'),
        professionalOnly: part('We offer only professional therapeutic massage'),
        callToAction: part('Which day suits you 🪷'),
      }),
      ctx(body({ question: 'happy ending?', final: true })),
    );
    expect(built?.answer.text).toBe(
      'Hello. We offer only professional therapeutic massage.\n\nOur Thai Massage is 60 min: VND 500k.\n\nWhich day suits you.',
    );
    expect(built?.answer.translation?.startsWith('vi: Xin chào. ')).toBe(true);
  });

  it('a question that mentions sex gets no gentle offer and no emoji; a final one its call to book', () => {
    const notFinal = buildAnswer(
      model({ sexual: true }),
      ctx(body({ question: 'Anything extra?' })),
    );
    expect(notFinal?.answer.text).not.toContain('A therapist can come');
    expect(notFinal?.answer.text).not.toMatch(/\p{Extended_Pictographic}/u);
    const final = buildAnswer(
      model({ sexual: true, callToAction: callToBook }),
      ctx(body({ question: 'Anything extra?', final: true })),
    );
    expect(
      final?.answer.text.endsWith('\n\nWhich day and time suit you, and where are you staying?'),
    ).toBe(true);
  });

  it('keeps one 😊, removes another emoji and drops the stop before an emoji, in the answer and its translation', () => {
    const built = buildAnswer(
      model({
        greeting: part('Hello! 😊', 'vi: Xin chào! 😊'),
        answer: part('Yes, we come to your villa. 😊 ✨', 'vi: Có, chúng tôi đến tận villa. 😊 ✨'),
      }),
      ctx(),
    );
    expect(built?.answer.text).toBe(
      'Hello! 😊\n\nYes, we come to your villa.\n\nA therapist can come to your hotel whenever suits you 🪷',
    );
    expect(built?.answer.translation).toBe(
      'vi: Xin chào! 😊\n\nvi: Có, chúng tôi đến tận villa.\n\nvi: A therapist can come to your hotel whenever suits you 🪷',
    );
  });

  it("refuses an answer with none of the guest's letters", () => {
    const korean = body({ question: '커플 마사지는 얼마예요? 호텔로 와 주시나요?' });
    expect(buildAnswer(model(), ctx(korean))).toBeNull();
    const inKorean = model({
      greeting: part('안녕하세요!'),
      answer: part('커플 마사지는 60분에 VND 800k입니다.'),
      callToAction: part('호텔로 찾아뵙겠습니다.'),
    });
    expect(buildAnswer(inKorean, ctx(korean))?.answer.text).toContain('안녕하세요');
  });

  it('puts the website in place of {website}, in the answer and its translation, with no flag', () => {
    const svarga = body();
    svarga.business.website = 'https://svargabalimassage.com/';
    const built = buildAnswer(
      model({
        answer: part(
          'You will find photos on our website, {website}.',
          'vi: Ảnh có trên trang web, { Website }.',
        ),
      }),
      ctx(svarga),
    );
    expect(built?.answer.text).toContain('our website, https://svargabalimassage.com.');
    expect(built?.answer.translation).toContain('trang web, https://svargabalimassage.com.');
    expect(`${built?.answer.text}${built?.answer.translation}`).not.toMatch(/\{\s*website\s*\}/i);
    expect(built?.flags).toEqual([]);
  });

  it('puts the line on professional massage after the greeting when the model flags sex', () => {
    const built = buildAnswer(model({ sexual: true }), ctx(body({ question: 'Anything extra?' })));
    expect(
      built?.answer.text.startsWith('Hello! We offer only professional therapeutic massage.\n\n'),
    ).toBe(true);
    expect(built?.sexual).toBe(true);
    expect(built?.sexualBy).toBe('model');
  });

  it('puts the line there when only the word list catches it', () => {
    const built = buildAnswer(model(), ctx(body({ question: 'Do you do happy ending?' })));
    expect(built?.answer.text).toContain('We offer only professional therapeutic massage.');
    expect(built?.sexualBy).toBe('words');
  });

  it('gives a business that is not a spa no line and no note', () => {
    const cafe = body({ question: 'happy ending?' });
    cafe.business.category = 'coffee shop';
    const built = buildAnswer(model({ sexual: true }), ctx(cafe));
    expect(built?.answer.text).not.toContain('professional therapeutic massage');
    expect(built?.sexual).toBe(false);
  });

  it('removes every emoji when the question mentions sex', () => {
    const built = buildAnswer(model({ sexual: true }), ctx(body({ question: 'sexy?' })));
    expect(built?.answer.text).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("replaces another flower with the business's", () => {
    expect(buildAnswer(model(), ctx())?.answer.text).toContain('🪷');
    expect(buildAnswer(model(), ctx())?.answer.text).not.toContain('🌸');
  });

  it('removes a sentence that holds a banned word', () => {
    const built = buildAnswer(
      model({ answer: part('We never do nuru massage. Our Thai Massage is 60 min.') }),
      ctx(),
    );
    expect(built?.answer.text).toBe(
      'Hello!\n\nOur Thai Massage is 60 min.\n\nA therapist can come to your hotel whenever suits you 🪷',
    );
  });

  it("drops the translations when the question is in the screen's language", () => {
    const built = buildAnswer(model({ questionLanguage: 'vi' }), ctx());
    expect(built?.answer.translation).toBeNull();
    expect(built?.questionTranslation).toBeNull();
  });

  it('fails an empty greeting, an empty call to action on a final answer, or an empty needed line', () => {
    expect(buildAnswer(model({ greeting: part('') }), ctx())).toBeNull();
    expect(buildAnswer(model({ callToAction: part('') }), ctx(body({ final: true })))).toBeNull();
    expect(buildAnswer(model({ callToAction: part('') }), ctx())).not.toBeNull();
    expect(
      buildAnswer(
        model({ sexual: true, professionalOnly: part('') }),
        ctx(body({ question: 'x' })),
      ),
    ).toBeNull();
  });

  it('fails an empty answer, unless the question mentions sex', () => {
    expect(buildAnswer(model({ answer: part('') }), ctx())).toBeNull();
    const built = buildAnswer(
      model({ sexual: true, answer: part('') }),
      ctx(body({ question: 'x' })),
    );
    expect(built?.answer.text).toBe('Hello! We offer only professional therapeutic massage.');
  });

  it('flags a price, a duration and a number the details do not hold', () => {
    const built = buildAnswer(
      model({ answer: part('Thai is VND 450k for 45 minutes. Call +84 905 123 456.') }),
      ctx(),
    );
    expect(built?.flags).toEqual([
      { kind: 'price', text: 'VND 450k' },
      { kind: 'duration', text: '45 minutes' },
      { kind: 'number', text: '+84 905 123 456' },
    ]);
    expect(buildAnswer(model(), ctx())?.flags).toEqual([]);
  });

  it('merges the guest details into the kept ones', () => {
    const built = buildAnswer(
      model({ guest: { place: null, day: 'tomorrow', time: '8 pm' } }),
      ctx(body({ known: { place: 'Hyatt', day: null, time: '7 pm' } })),
    );
    expect(built?.guest).toEqual({ place: 'Hyatt', day: 'tomorrow', time: '8 pm' });
  });
});

describe('mergeGuest', () => {
  it('keeps a detail the model leaves out, and takes a new one', () => {
    expect(
      mergeGuest(
        { place: 'Hyatt', day: null, time: '7 pm' },
        { place: null, day: 'tomorrow', time: '8 pm' },
      ),
    ).toEqual({ place: 'Hyatt', day: 'tomorrow', time: '8 pm' });
    expect(
      mergeGuest({ place: null, day: null, time: null }, { place: '  ', day: null, time: null }),
    ).toEqual({
      place: null,
      day: null,
      time: null,
    });
  });
});

describe('fillWebsite on links the model writes', () => {
  const site = 'https://svargabalimassage.com/';
  it("turns a link on the business's own site into its address", () => {
    expect(fillWebsite('On our website https://www.svargabalimassage.com.', site)).toBe(
      'On our website https://svargabalimassage.com.',
    );
    expect(fillWebsite('See www.svargabalimassage.com/gallery for photos', site)).toBe(
      'See https://svargabalimassage.com for photos',
    );
    expect(fillWebsite('At svargabalimassage.com', site)).toBe('At https://svargabalimassage.com');
  });

  it('keeps the booking link and links on other sites', () => {
    const book = 'https://svargabalimassage.com/book';
    expect(fillWebsite(`Book at ${book}.`, site, book)).toBe(`Book at ${book}.`);
    expect(fillWebsite('Follow https://instagram.com/svargabalimassage', site)).toBe(
      'Follow https://instagram.com/svargabalimassage',
    );
  });
});

describe('fillWebsite', () => {
  it('puts the address, without its trailing slash, in place of {website}, any case or spacing', () => {
    expect(fillWebsite('See photos at {website}.', 'https://svargabalimassage.com/')).toBe(
      'See photos at https://svargabalimassage.com.',
    );
    expect(fillWebsite('At {Website} and { website }', 'https://sendanangmassage.com/')).toBe(
      'At https://sendanangmassage.com and https://sendanangmassage.com',
    );
  });

  it('with no website, the sentence that holds {website} goes', () => {
    expect(fillWebsite('Yes. See photos at {website}. We come to you.', null)).toBe(
      'Yes. We come to you.',
    );
  });
});
