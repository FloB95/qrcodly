# QRcodly

QRcodly generates and manages QR codes and short URLs. A QR code can be _static_ (the content is
baked into the image forever) or _dynamic_ (the image encodes a short URL we control, so the
destination can be changed after the code is printed). Nearly every hard problem in this codebase
comes from that second case: the image is out in the world and immutable, but what it points at is
not.

## Language

### Links

**Short URL**:
A link we own that redirects a visitor to a destination. Owns its own analytics, safety state and
active/inactive state, and may exist before it has a destination.
_Avoid_: Link, redirect, shortlink

**Short code**:
The generated identifier that addresses a short URL. Assigned by us, never chosen by the user, and
unique across the whole system.
_Avoid_: Slug, path, code

**Destination URL**:
Where a short URL sends the visitor. Mutable over the life of the short URL, which is the entire
point of a dynamic QR code.
_Avoid_: Target, original URL, long URL

**Reserved short URL**:
A short URL that has been allocated to a user but has neither a destination nor a linked QR code
yet. It holds its short code so the code can be printed before the destination is decided.
_Avoid_: Draft, placeholder, empty link

**Scan**:
One visitor following a short URL. The unit of analytics, whether or not a camera was involved —
a click from a pasted link is also a scan.
_Avoid_: Click, hit, visit, view

### Domains

**Custom domain**:
A host a customer owns and has pointed at us, so their short URLs carry their brand instead of
ours. Must be verified before it can carry links.
_Avoid_: Vanity domain, branded domain, user domain

**Redirect domain**:
The dedicated system host that serves short URL redirects and nothing else. Kept separate from the
brand domain so that a safety flag earned by an abusive link cannot contaminate the brand.
_Avoid_: Short domain, sacrificial domain

**Brand domain**:
The host serving the app and marketing site. Never serves a redirect.
_Avoid_: Main domain, frontend domain, app domain

**Domain slot**:
An entitlement to have one custom domain connected. Pro includes one; further slots are bought as
a paid add-on.
_Avoid_: Domain licence, domain seat

### QR codes

**Dynamic QR code**:
A QR code whose image encodes one of our short URLs, so its destination can be changed after the
image has been printed or distributed.
_Avoid_: Editable QR code, live QR code

**Static QR code**:
A QR code whose image encodes its content directly. Changing the content means a different image,
and therefore a different physical artefact.
_Avoid_: Fixed QR code, plain QR code

**QR code data**:
The exact string encoded into a QR code image. For a dynamic QR code this is the fully-built short
URL, which makes it a _derived_ value — it changes whenever the addressing of its short URL
changes.
_Avoid_: Payload, content, encoded value

**Preview image**:
The rendered picture of a QR code, stored so it can be shown in lists and exports. Derived from the
QR code data, and therefore stale the moment that data changes without a re-render.
_Avoid_: Thumbnail, QR image, render

### Safety

**Safety status**:
Our verdict on a short URL's destination, held independently of whether the owner has switched the
link on. A destination we have flagged stays unreachable regardless of the owner's wishes.
_Avoid_: Status, state, moderation status

**Blocked**:
A safety verdict, not an owner action. The owner cannot lift it by switching the link back on; only
pointing the link at a destination that then passes screening clears it.
_Avoid_: Disabled, suspended, banned
