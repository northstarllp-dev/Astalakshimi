type DemoFile = {
  buffer: Buffer;
  contentType: string;
};

const store = new Map<string, DemoFile>();

export const demoUploadStore = {
  set(s3Key: string, buffer: Buffer, contentType: string) {
    store.set(s3Key, { buffer, contentType });
  },

  get(s3Key: string): DemoFile | undefined {
    return store.get(s3Key);
  },

  delete(s3Key: string) {
    store.delete(s3Key);
  },
};
