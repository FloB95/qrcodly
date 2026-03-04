// Generate QR grid cells for splash screen
var p = [
	1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1,
	0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1,
];
var g = document.getElementById('qr-grid');
for (var i = 0; i < 49; i++) {
	var d = document.createElement('div');
	d.className = 'qr-cell ' + (p[i] ? 'on' : 'off');
	var col = i % 7,
		row = Math.floor(i / 7);
	var dist = Math.sqrt(Math.pow(col - 3, 2) + Math.pow(row - 3, 2));
	d.style.animationDelay = dist * 0.12 + 's';
	g.appendChild(d);
}
var s = document.createElement('div');
s.className = 'scan-line';
g.appendChild(s);
