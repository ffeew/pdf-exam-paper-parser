"use client";

import { useState } from "react";
import Image from "next/image";

interface QuestionImageProps {
  image: {
    id: string;
    imageUrl: string;
    altText: string | null;
  };
}

export function QuestionImage({ image }: QuestionImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="bg-muted rounded-lg p-4 text-center text-sm text-muted-foreground">
        Failed to load image
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border bg-muted">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      )}
      <Image
        src={image.imageUrl}
        alt={image.altText || "Question diagram"}
        width={0}
        height={0}
        sizes="(max-width: 768px) 50vw, 33vw"
        className={`w-full h-auto object-contain transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setError(true);
        }}
        unoptimized // Use unoptimized since images are from R2 presigned URLs
      />
    </div>
  );
}
