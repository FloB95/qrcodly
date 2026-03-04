// Shim for @/i18n/navigation — provides the same exports for the browser extension
import Link from './next-link';
import { usePathname, useRouter } from './next-navigation';

const redirect = (url: string) => {
	window.open(url, '_blank');
};

const getPathname = ({ href }: { href: string }) => href;

export { Link, redirect, usePathname, useRouter, getPathname };
