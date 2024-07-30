export function getRuntime() {

}

function wrapCode(code) {
  return `
  const result = (() => {


/*************** user code *********************/

${code}

/*************** end user code *********************/


})();

if(result) {
  render(result)
}`;
}

export function generateRunString(uuid, str) {
  return `
let __renderCalled = false;
let __placeholder = document.getElementById('${uuid}-placeholder');

// Clear out any existing content (if rerunning)
if(__placeholder) {
  __placeholder.innerHTML = ''
}

const render = value => {
  __renderCalled = true;
const _insert = el => {
    if(__placeholder) {
      __placeholder.appendChild(el);
    }
  }

  if(typeof value === 'number') {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = value;
    pre.appendChild(code);
    _insert(pre);
  }
  else {
    'then' in value ? value.then(_insert) : _insert(value)
  }
}

${str.startsWith('import') ? str : wrapCode(str)}

if(!__renderCalled && __placeholder) {
  __placeholder.textContent = '(no output)'
}
  `;
}
