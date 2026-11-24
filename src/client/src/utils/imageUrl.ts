export const getImageUrl = (image?: string | null): string | null => {
  if (!image) return null;

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  return `/api/uploads/${image}`;
};

export default getImageUrl;
