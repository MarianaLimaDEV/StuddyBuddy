let newX = 0, newY = 0, startX = 0, startY = 0;

const card = document.getElementById('card');

if (card) {
  card.addEventListener('mousedown', mouseDown);
}

function mouseDown(e){
    e.preventDefault(); // prevent text selection start
    startX = e.clientX;
    startY = e.clientY;

    // disable text selection globally while dragging
    document.body.style.userSelect = 'none';

    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', mouseUp);
}

function mouseMove(e){
    newX = startX - e.clientX;
    newY = startY - e.clientY;
  
    startX = e.clientX;
    startY = e.clientY;

    card.style.top = (card.offsetTop - newY) + 'px';
    card.style.left = (card.offsetLeft - newX) + 'px';
}

function mouseUp(e){
    document.removeEventListener('mousemove', mouseMove);
    document.removeEventListener('mouseup', mouseUp);

    // restore text selection
    document.body.style.userSelect = '';
}

