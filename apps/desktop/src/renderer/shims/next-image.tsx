import React from 'react';

type ImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
	src: string | { src: string; height?: number; width?: number };
	alt: string;
	width?: number;
	height?: number;
	fill?: boolean;
	priority?: boolean;
	quality?: number;
	placeholder?: string;
	blurDataURL?: string;
	unoptimized?: boolean;
};

function Image({
	src,
	alt,
	fill,
	priority: _priority,
	quality: _quality,
	placeholder: _placeholder,
	blurDataURL: _blurDataURL,
	unoptimized: _unoptimized,
	style,
	...rest
}: ImageProps) {
	const imgSrc = typeof src === 'object' ? src.src : src;
	const fillStyle: React.CSSProperties | undefined = fill
		? { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }
		: undefined;

	return <img src={imgSrc} alt={alt} style={{ ...fillStyle, ...style }} {...rest} />;
}

export default Image;
