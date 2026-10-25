// A caption's translation kept on the phone (docs/specs/posts/editor-download,
// "The owner's-language view"), used only while its caption is unchanged.

export type SavedTranslation = {
  batchId: string;
  postId: string;
  ownerId: string;
  locale: 'id' | 'vi';
  captionHash: string;
  text: string;
  model: string;
  promptVersion: string;
  createdAt: string;
};
