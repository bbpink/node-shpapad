var request = window.superagent;
var op = document.URL.substr(document.URL.lastIndexOf("/") + 1);

//construction for adding
var constructAddSection = function() {
  var addRoot = document.createElement("li");
  var addInput = document.createElement("input");
  addInput.setAttribute("class", "add-editing");
  var addButton = document.createElement("button");
  addButton.innerHTML = "ADD";
  addButton.onclick = function() {
    var me = document.querySelector("#content ul").lastChild;
    var no = me.querySelectorAll(":not(.add-editing)");
    for (var i=0; i < no.length; i++) { no[i].setAttribute("style", "display:none"); }
    var ed = me.querySelectorAll(".add-editing");
    for (var i=0; i < ed.length; i++) { ed[i].setAttribute("style", ""); }
    addInput.focus();
  };
  var addCancel = document.createElement("button");
  addCancel.setAttribute("class", "add-editing");
  addCancel.innerHTML = "CANCEL";
  addCancel.onclick = function() {
      var me = document.querySelector("#content ul").lastChild;
      var no = me.querySelectorAll(":not(.add-editing)");
      for (var i=0; i < no.length; i++) { no[i].setAttribute("style", ""); }
      var ed = me.querySelectorAll(".add-editing");
      for (var i=0; i < ed.length; i++) { ed[i].setAttribute("style", "display:none;"); }
      addInput.value = "";
  };
  var addSave = document.createElement("button");
  addSave.setAttribute("class", "add-editing");
  addSave.innerHTML = "SAVE";
  addSave.onclick = function() {
    var inputBox = this.parentNode.querySelector("input");
    var inputText = inputBox.value;
    request.post(op).type("form").send({value:inputText}).end(function(err, res) {
      var newelement = document.createElement("li");
      newelement.setAttribute("id", res.body.id);
      newelement.setAttribute("data-name", inputText);
      if (op.match(/^list(.*)/)) {
        construction(newelement, res.body.id, inputText, 0);
      } else {
        construction(newelement, res.body.id, inputText);
      }
      document.querySelector("#content ul").insertBefore(newelement, addRoot);
      inputBox.value = "";
    });
  };

  //on push return key
  addInput.onkeyup = function() {
    var keypressed = null;
    if (window.event) keycode = window.event.keyCode;
    else if (e) keycode = e.which;
    keypressed = keycode;
    if (keycode == 13) {
      addSave.onclick();
    }
  };
  addRoot.appendChild(addButton);
  addRoot.appendChild(addInput);
  addRoot.appendChild(addSave);
  addRoot.appendChild(addCancel);
  var no = addRoot.querySelectorAll(":not(.add-editing)");
  for (var i=0; i < no.length; i++) { no[i].setAttribute("style", ""); }
  var ed = addRoot.querySelectorAll(".add-editing");
  for (var i=0; i < ed.length; i++) { ed[i].setAttribute("style", "display:none;"); }
  document.querySelector("#content ul").appendChild(addRoot);
};

if (op.match(/^list(.*)/)) {

  var lists = document.querySelectorAll("#content li");
  var construction = function(lielement, listid, listname, taskcount) {

    //a and count
    var a = document.createElement("a");
    a.href = "/task?l=" + listid;
    a.appendChild(document.createTextNode(listname));
    var c = document.createElement("span");
    c.appendChild(document.createTextNode("(" + taskcount + ")"));

    //up
    var up = document.createElement("button");
    up.innerHTML = "UP";
    up.onclick = function() {
      var newname = prompt("更新", listname);
      var me = this.parentNode;
      if ( (newname != null) && (newname != listname) && (newname != "") ) {
        var selfid = me.getAttribute("id");
        request.put(op + "?id=" + selfid).type("form").send({value:newname}).end(function(err, res) {
          me.firstChild.innerHTML = newname;
        });
      }
    };

    //delete
    var del = document.createElement("button");
    del.innerHTML = "X";
    del.onclick = function() {
      var me = this.parentNode;
      var selfid = me.getAttribute("id");
      var targetCount = parseInt(me.childNodes[1].textContent.replace("(", "").replace(")", ""));
      if (targetCount != 0) {
        alert("タスクを全て削除してからリストを削除してください\n(＞＜)");
        return;
      }
      if (confirm("本当に削除してもよろしいですか？")) {
        me.addEventListener("transitionend", function(e) { me.parentNode.removeChild(me); }, false);
        request.del(op + "?id=" + selfid).end(function(err, res) {
          me.setAttribute("style", "transition:all 0.5s ease; opacity: 0");
        });
      }
    };

    lielement.appendChild(a);
    lielement.appendChild(c);
    lielement.appendChild(up);
    lielement.appendChild(del);
  };

  //create view
  for (var i=0; i < lists.length; i++ ) {
    var listID = lists[i].getAttribute("id");
    var name = lists[i].getAttribute("data-name");
    var count = lists[i].getAttribute("data-count");
    construction(lists[i], listID, name, count);
  }

  //add section
  constructAddSection();

} else if (op.match(/^task(.*)/)) {

  var tasks = document.querySelectorAll("#content li");
  var construction = function(lielement, taskid, taskname) {
    //up
    var up = document.createElement("button");
    up.innerHTML = "UP";
    up.onclick = function() {
      var newname = prompt("更新", taskname);
      var me = this.parentNode;
      if ( (newname != null) && (newname != taskname) && (newname != "") ) {
        var selfid = me.getAttribute("id");
        request.put(op + "&id=" + selfid).type("form").send({value:newname}).end(function(err, res) {
          me.firstChild.nodeValue = newname;
        });
      }
    };

    //delete
    var del = document.createElement("button");
    del.innerHTML = "X";
    del.onclick = function() {
      var me = this.parentNode;
      var selfid = me.getAttribute("id");
      if (confirm("本当に削除してもよろしいですか？")) {
        me.addEventListener("transitionend", function(e) { me.parentNode.removeChild(me); }, false);
        request.del(op + "&id=" + selfid).end(function(err, res) {
          me.setAttribute("style", "transition:all 0.5s ease; opacity: 0");
        });
      }
    };

    lielement.appendChild(document.createTextNode(taskname));
    lielement.appendChild(up);
    lielement.appendChild(del);
  };

  //create view
  for (var i=0; i < tasks.length; i++) {
    var id = tasks[i].getAttribute("id");
    var name = tasks[i].getAttribute("data-name");
    construction(tasks[i], id, name);
  }

  //add section
  constructAddSection();
}
