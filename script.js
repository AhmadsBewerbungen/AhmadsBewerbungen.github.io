const popup = window.open(
  "",
  "",
  "width=200,height=150"
);

let x = 100;
let y = 100;
let dx = 5;
let dy = 4;

setInterval(() => {
  x += dx;
  y += dy;

  if (x < 0 || x > screen.availWidth - 200) dx *= -1;
  if (y < 0 || y > screen.availHeight - 150) dy *= -1;

  popup.moveTo(x, y);
}, 20);
