// Create needed constants
const toDoInput = document.querySelector("#toDoList");
const form = document.querySelector("form");
const list = document.querySelector("ul");

// Create an instance of a db object for us to store the open database in
let db;

//called when the windows's load event fires
window.onload = function () {
  let request = window.indexedDB.open('notes_db', 1);
  // onerror handler signifies that the database didn't open successfully
  request.onerror = function () {
    console.log('Database failed to open');
  };
  // onsuccess handler signifies that the database opened successfully
  request.onsuccess = function () {
    console.log('Database opened successfully');
    // Store the opened database object in the db variable. This is used a lot below
    db = request.result;
    // Run the displayData() function to display the notes already in the IDB
    displayData();

  };
  // Setup the database tables if this has not already been done
  request.onupgradeneeded = function (e) {
    // Grab a reference to the opened database    
    let db = e.target.result;
    // Create an objectStore to store our notes in (basically like a single table)
    // including a auto-incrementing key
    let objectStore = db.createObjectStore('notes_os', { keyPath: 'id', autoIncrement: true });
    // Define what data items the objectStore will contain
    objectStore.createIndex('todo', 'todo', { unique: false });
    console.log('Database setup complete');
  };
  //{
  //  todo:'blah blah',
  //  id: 1
  //}
  // Create an onsubmit handler so that when the form is submitted the addData() function is run
  form.onsubmit = addData;
  // Define the addData() function
  function addData(e) {
    // prevent default - we don't want the form to submit in the conventional way
    e.preventDefault();
    // grab the values entered into the form fields and store them in an object ready for being inserted into the DB    
    let newItem = { todo: toDoInput.value,complete:false};
    // open a read/write db transaction, ready for adding the data    
    let transaction = db.transaction(['notes_os'], 'readwrite');
    // call an object store that's already been added to the database
    let objectStore = transaction.objectStore('notes_os');
    // Make a request to add our newItem object to the object store    
    let request = objectStore.add(newItem);
    request.onsuccess = function () {
      // Clear the form, ready for adding the next entry      
      toDoInput.value = '';
    };
    // Report on the success of the transaction completing, when everything is done    
    transaction.oncomplete = function () {
      console.log('Transaction completed: database modification finished.');
      // update the display of data to show the newly added item, by running displayData() again.      
      displayData();
    };
    transaction.onerror = function () {
      console.log('Transaction not opened due to error');
    };
  }


  // Define the displayData() function
  function displayData() {
    // Here we empty the contents of the list element each time the display is updated
    // If you didn't do this, you'd get duplicates listed each time a new note is added    
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }

    // Open our object store and then get a cursor - which iterates through all the different data items in the store    //전체 데이터 조회
    let objectStore = db.transaction('notes_os').objectStore('notes_os');
    objectStore.openCursor().onsuccess = function (e) {
      // Get a reference to the cursor      
      let cursor = e.target.result;
      // If there is still another data item to iterate through, keep running this code      
      if (cursor) {
        // Create a list item, h3, and p to put each data item inside when displaying it
        // structure the HTML fragment, and append it inside the list        
        let listItem = document.createElement('li');
        let span = document.createElement('span');
        let label = document.createElement('label');

        const checkbox = document.createElement('input');
        checkbox.type = "checkbox";


        list.appendChild(listItem);
        listItem.appendChild(checkbox);
        listItem.appendChild(label);
        // label.appendChild(checkbox);
        label.appendChild(span);
        // Put the data from the cursor inside the para
        span.textContent = cursor.value.todo;
        // Store the ID of the data item inside an attribute on the listItem, so we know
        // which item it corresponds to. This will be useful later when we want to delete items
        listItem.setAttribute('data-note-id', cursor.value.id);
        label.setAttribute('data-note-id', cursor.value.id);
        checkbox.setAttribute('id', cursor.value.id);

        // Create a button and place it inside each listItem
        const deleteBtn = document.createElement('button');
        listItem.appendChild(deleteBtn);
        deleteBtn.textContent = 'x';
        // Set an event handler so that when the button is clicked, the deleteItem()
        // function is run
        deleteBtn.onclick = deleteItem;

        checking();
        // checkbox.onchange = setupBox;

        span.ondblclick = editItem;


        // Iterate to the next item in the cursor
        cursor.continue();
      } else {
        // Again, if list item is empty, display a 'No notes stored' message        
        if (!list.firstChild) {
          let listItem = document.createElement('li');
          listItem.textContent = 'No notes stored.';
          list.appendChild(listItem);
        }
        // if there are no more cursor items to iterate through, say so
        console.log('Notes all displayed');

      }
    };
  }

  //Define the editItem() function
  function editItem(e) {
    //선택한 span 영역 가져오기
    let textSpan = e.target;
    //내용 수정가능하게 바꾸기
    textSpan.setAttribute('contenteditable', true);
    let body = document.querySelector('body');
     body.onclick = function save(ev) {//수정 내용 저장
       //클릭한 영역 지정
      let target = ev.target;
      if (target !== textSpan) {//span영역 이외의 body 클릭시 동작
        textSpan.setAttribute('contenteditable', false);//span 수정 불가 설정
        let editText = textSpan.textContent;//수정된 내용 
        let spanId = Number(e.target.parentNode.getAttribute('data-note-id'));
        let objectStore = db.transaction(['notes_os'], 'readwrite').objectStore('notes_os');
        let request = objectStore.get(spanId);//span Id값 불러옴
        request.onerror = function () {
          console.log('edit error')
        }
        request.onsuccess = function (event) {
          let data = event.target.result;
          if (editText !== data.todo) {//span 내용이 수정되었을 때 동작
            data.todo = editText;
            let requestUpdate = objectStore.put(data);//수정된 내용 db에 저장

            requestUpdate.onerror = function () {
              console.log('update error');

            }
            requestUpdate.onsuccess = function () {
              console.log('update success');
            }

          }
        }
      }
    };
  }



  // Define the deleteItem() function
  function deleteItem(e) {
    // retrieve the name of the task we want to delete. We need
    // to convert it to a number before trying it use it with IDB; IDB key
    // values are type-sensitive.
    let noteId = Number(e.target.parentNode.getAttribute('data-note-id'));


    // open a database transaction and delete the task, finding it using the id we retrieved above
    let transaction = db.transaction(['notes_os'], 'readwrite');
    let objectStore = transaction.objectStore('notes_os');
    let request = objectStore.delete(noteId);
    

    // report that the data item has been deleted
    transaction.oncomplete = function () {
      // delete the parent of the button
      // which is the list item, so it is no longer displayed
      e.target.parentNode.parentNode.removeChild(e.target.parentNode);
      console.log('Note ' + noteId + ' deleted.');

      // Again, if list item is empty, display a 'No notes stored' message
      if (!list.firstChild) {
        const listItem = document.createElement('li');
        listItem.textContent = 'No notes stored.';
        list.appendChild(listItem);
      }
    };
  }


}

// Store checked list
function checking() {
  var boxes = document.querySelectorAll("input[type='checkbox']");
  for (var i = 0; i < boxes.length; i++) {
    var box = boxes[i];
    if (box.hasAttribute("id")) {
      setupBox(box);
    }
  }

  function setupBox(box) {
    var storageId = box.getAttribute("id");
    var oldVal = localStorage.getItem(storageId);
    box.checked = oldVal === "true" ? true : false;

    box.addEventListener("change", function () {
      localStorage.setItem(storageId, this.checked);
    });
  }
}


// function setupBox(e){
//   let checkboxId = e.target.id;
//   let span = document.querySelector('span');
//   console.log(checkboxId);
//   let objectStore = db.transaction(['notes_os'], 'readwrite').objectStore('notes_os');
//   let request = objectStore.get(checkboxId);
//   console.log(request)
//   request.onerror = function () {
//     console.log('edit error')
//   }
//   request.onsuccess = function(event){
//     let data=event.target.result;
//     console.log(data);
      
//   }
// }



