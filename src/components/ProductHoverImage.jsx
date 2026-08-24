function ProductHoverImage({ primarySrc, secondarySrc, alt, className = '', imageClassName = 'object-cover' }) {
  const primaryImage = primarySrc || secondarySrc || '';
  const hoverImage = secondarySrc || primaryImage;

  if (!primaryImage) {
    return null;
  }

  return (
    <div className={`relative overflow-hidden ${className}`.trim()}>
      <img
        src={primaryImage}
        alt={alt}
        loading="lazy"
        className={`absolute inset-0 h-full w-full transition duration-700 group-hover:scale-105 group-hover:opacity-0 ${imageClassName}`.trim()}
      />
      <img
        src={hoverImage}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className={`absolute inset-0 h-full w-full opacity-0 transition duration-700 group-hover:scale-105 group-hover:opacity-100 ${imageClassName}`.trim()}
      />
    </div>
  );
}

export default ProductHoverImage;