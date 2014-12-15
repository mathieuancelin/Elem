exports.debug = false;
exports.voidElements = ["AREA","BASE","BR","COL","COMMAND","EMBED","HR","IMG","INPUT","KEYGEN","LINK","META","PARAM","SOURCE","TRACK","WBR"];
exports.mouseEvents = 'MouseDown MouseEnter MouseLeave MouseMove MouseOut MouseOver MouseUp'.toLowerCase();
exports.events = 'Wheel Scroll TouchCancel TouchEnd TouchMove TouchStart Click DoubleClick Drag DragEnd DragEnter DragExit DragLeave DragOver DragStart Drop Change Input Submit Focus Blur KeyDown KeyPress KeyUp Copy Cut Paste'.toLowerCase();
    
// TODO : redraw with requestAnimationFrame (https://developer.mozilla.org/fr/docs/Web/API/window.requestAnimationFrame)
// TODO : render components inside components without redrawing the whole thing
// TODO : perfs measures (http://www.html5rocks.com/en/tutorials/webperformance/usertiming/)