export async function GET() {
  const content = `BEGIN:VCARD
VERSION:3.0
FN;CHARSET=UTF-8:florian breuer
N;CHARSET=UTF-8:breuer;florian;;;
EMAIL;CHARSET=UTF-8;type=HOME,INTERNET:fb@medium.ag
TEL;TYPE=CELL:12345678
ADR;CHARSET=UTF-8;TYPE=HOME:;;asddsa;sadsad;Choose...;asdsda;Deutschland
ORG;CHARSET=UTF-8:medium ag
REV:2024-09-19T20:47:46.452Z
END:VCARD`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="contact.vcf"',
    },
  });
}
