import { useDependencies } from "@/ui/dependencies";
import { DishTile } from "./DishTile";
import styles from "./recipes.module.css";

interface DishPhotoProps {
  title: string;
  photoId?: string | undefined;
  large?: boolean;
}

/** The dish photo, cropped to the card's shape, or a placeholder tile without one. */
export function DishPhoto({ title, photoId, large = false }: DishPhotoProps) {
  const { photos } = useDependencies();
  const url = photoId ? photos.urlFor(photoId) : null;
  if (!url) return <DishTile title={title} large={large} />;
  return (
    <img
      src={url}
      alt=""
      className={large ? `${styles.photo} ${styles.photoLarge}` : styles.photo}
      loading="lazy"
    />
  );
}
