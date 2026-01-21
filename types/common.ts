export type AuthedRequest = Request & {
  user?: { id: string };
};