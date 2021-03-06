



let elem = document.createElement('regeggs-card');
let elemShine = new Shine(elem, {resizeable: false, shadows: ['-2 -3 5px rgba(0,0,0,.5)']});
elemShine.updateStyles({
    backgroundColor: 'teal', 
    width: '400px', 
    height: '150px', 
    position: 'absolute', 
    top:`${20 + window.scrollY}px`, 
    left: `${200 + window.scrollX}px`, 
    borderRadius: '10px', 
    display: 'flex', 
    flexDirection: 'column', 
    padding: '25px'
});

let addBtn = document.createElement('button');
addBtn.innerHTML = '+';
addBtn = elem.appendChild(addBtn);
elem = document.body.insertBefore(elem, document.body.firstChild);

let popupDragger = new Draggable(elem, { noDragElems: [addBtn], Shine: elemShine});
popupDragger.drag();

addBtn.addEventListener('click', () => {
    let div = document.querySelector('regeggs-card');
    let input = document.createElement('input');
    input.className = 'myInput';
    input.type = 'text';
    input.placeholder = 'regular expression';
    input = div.appendChild(input);
    popupDragger.addNoDragElems(input);
});
