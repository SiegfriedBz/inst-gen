// What the reply and the answer prompts share
// (docs/specs/reviews/better-replies-and-answers, "Both tabs").

// Code decides it, not the model: the brand read writes a service area only
// for a business that comes to the client ("A business that goes to its
// guests").
export function goesToGuests(serviceArea: string | null | undefined): boolean {
  return Boolean(serviceArea?.trim());
}
