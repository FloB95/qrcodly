// Shim for @/i18n/navigation — provides the same exports using React Router
import Link from './next-link';
import { usePathname, useRouter } from './next-navigation';

const redirect = (url: string) => {
	throw new Response('', { status: 302, headers: { Location: url } });
};

const getPathname = ({ href }: { href: string }) => href;

export { Link, redirect, usePathname, useRouter, getPathname };
