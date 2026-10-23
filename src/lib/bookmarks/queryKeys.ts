export const bookmarkQueryKeys = {
    all: ['bookmarks'] as const,
    folders: () => ['bookmarks', 'folders'] as const,
    trades: (folderId: string) => ['bookmarks', 'trades', folderId] as const,
}
