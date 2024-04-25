# QRcodly

QRcodly is an open source QR code generator.  
It allows you to easily generate QR codes for various purposes, such as sharing URLs, contact information, or Wi-Fi credentials.

## Features

- Simple and easy-to-use API for generating QR codes (TODO)
- Support for different QR code types and error correction levels (TODO)
- Customizable QR code size, color, and background
- Export QR codes to various image formats (PNG, JPEG, SVG, etc.)

### Please visit [Todos](todos.md) section for more information about the project status and future plans

---

## Installation

To use QRcodly in your project, you can just manually download the source code. Here are the installation instructions:

1. clone git repository
2. run `npm install` to install dependencies
3. start local database with `docker-compose up -d`
4. setup environment variables in `.env` file using `.env.example` as a template
5. push database schema with `npm run db:push`
6. run `npm run dev` to start the server
7. for authentication you have to setup [Clerk](https://clerk.com/)

## Used stack

To build QRcodly we used the following technologies:

- [Next.js](https://nextjs.org/) - React framework for building web applications
- [TypeScript](https://www.typescriptlang.org/) - Typed superset of JavaScript
- [Drizzle](https://drizzle.dev/) - Database abstraction layer for Node.js
- [Clerk](https://clerk.com/) - Authentication and user management service
- [Docker](https://www.docker.com/) - Containerization platform
- [MYSQL](https://www.mysql.com/) - Relational database management system
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - UI components library
- [QR Code Styling](https://qr-code-styling.com/) - QR code generator library
- [create t3-app](https://create.t3.gg/) - Base project template
