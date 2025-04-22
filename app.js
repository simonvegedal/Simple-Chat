  // app.js
  document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutButton = document.getElementById('logout-button');
    const authContainer = document.getElementById('auth-container');
    const chatContainer = document.getElementById('chat-container');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const messagesContainer = document.getElementById('messages-container');
    const contactsList = document.getElementById('contacts-list');
    const newContactForm = document.getElementById('new-contact-form');
    const currentContactDisplay = document.getElementById('current-contact');
    
    let currentUser = null;
    let currentContact = null;
    let messagesListener = null;
  
    // Authentication state observer
    auth.onAuthStateChanged((user) => {
      if (user) {
        // User is signed in
        currentUser = user;
        authContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
        document.getElementById('user-email').textContent = user.email;
        loadContacts();
      } else {
        // User is signed out
        currentUser = null;
        authContainer.classList.remove('hidden');
        chatContainer.classList.add('hidden');
        if (messagesListener) {
          messagesListener();
          messagesListener = null;
        }
      }
    });
  
    // Register form handler
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = registerForm['register-email'].value;
        const password = registerForm['register-password'].value;
        
        auth.createUserWithEmailAndPassword(email, password)
          .then(() => {
            registerForm.reset();
            document.getElementById('register-error').textContent = '';
            // Switch to chat view handled by onAuthStateChanged
          })
          .catch((error) => {
            document.getElementById('register-error').textContent = error.message;
          });
      });
    }
  
    // Login form handler
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginForm['login-email'].value;
        const password = loginForm['login-password'].value;
        
        auth.signInWithEmailAndPassword(email, password)
          .then(() => {
            loginForm.reset();
            document.getElementById('login-error').textContent = '';
            // Switch to chat view handled by onAuthStateChanged
          })
          .catch((error) => {
            document.getElementById('login-error').textContent = error.message;
          });
      });
    }
  
    // Logout button handler
    if (logoutButton) {
      logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        auth.signOut();
      });
    }
  
    // Add new contact handler
    if (newContactForm) {
      newContactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const contactEmail = newContactForm['contact-email'].value.trim();
        
        if (contactEmail === currentUser.email) {
          document.getElementById('new-contact-error').textContent = "You cannot add yourself as a contact";
          return;
        }
  
        // Check if the user exists in Firebase Auth
        // Note: Firebase doesn't have a direct API to check if a user exists by email,
        // so we'll add the contact and handle chat functionality regardless
        addContact(contactEmail);
        newContactForm.reset();
      });
    }
  
    // Send message handler
    if (messageForm) {
      messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const messageText = messageInput.value.trim();
        
        if (messageText && currentContact) {
          sendMessage(messageText, currentContact);
          messageInput.value = '';
        }
      });
    }
  
    // Load user's contacts
    function loadContacts() {
      contactsList.innerHTML = '';
      
      db.collection('users').doc(currentUser.email).collection('contacts')
        .onSnapshot((snapshot) => {
          contactsList.innerHTML = '';
          
          if (snapshot.empty) {
            contactsList.innerHTML = '<p class="no-contacts">No contacts yet. Add someone to start chatting!</p>';
            return;
          }
          
          snapshot.forEach((doc) => {
            const contactEmail = doc.id;
            const contactElement = document.createElement('div');
            contactElement.classList.add('contact');
            contactElement.textContent = contactEmail;
            
            contactElement.addEventListener('click', () => {
              selectContact(contactEmail);
            });
            
            contactsList.appendChild(contactElement);
          });
          
          // Select first contact by default if none is selected
          if (!currentContact && snapshot.docs.length > 0) {
            selectContact(snapshot.docs[0].id);
          }
        });
    }
  
    // Add a new contact
    function addContact(contactEmail) {
      // Add contact to current user's contacts
      db.collection('users').doc(currentUser.email).collection('contacts')
        .doc(contactEmail).set({
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
          // Also add current user to the contact's contact list (for two-way communication)
          return db.collection('users').doc(contactEmail).collection('contacts')
            .doc(currentUser.email).set({
              timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
          document.getElementById('new-contact-error').textContent = '';
          selectContact(contactEmail);
        })
        .catch((error) => {
          document.getElementById('new-contact-error').textContent = error.message;
        });
    }
  
    // Select a contact to chat with
    function selectContact(contactEmail) {
      // Update UI to show selected contact
      const contactElements = document.querySelectorAll('.contact');
      contactElements.forEach(el => {
        if (el.textContent === contactEmail) {
          el.classList.add('selected');
        } else {
          el.classList.remove('selected');
        }
      });
      
      currentContact = contactEmail;
      currentContactDisplay.textContent = contactEmail;
      
      // Clear previous messages
      messagesContainer.innerHTML = '';
      
      // Unsubscribe from previous listener if exists
      if (messagesListener) {
        messagesListener();
      }
      
      // Load messages for this contact
      loadMessages(contactEmail);
    }
  
    // Load messages for a specific contact
    function loadMessages(contactEmail) {
      // Create a unique chat ID from the two email addresses (always ordered the same way)
      const chatId = [currentUser.email, contactEmail].sort().join('_');
      
      // Listen for messages in this chat
      messagesListener = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp')
        .onSnapshot((snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const message = change.doc.data();
              displayMessage(message);
            }
          });
          
          // Scroll to bottom of messages
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
    }
  
    // Send a message to a contact
    function sendMessage(messageText, toEmail) {
      // Create a unique chat ID from the two email addresses (always ordered the same way)
      const chatId = [currentUser.email, toEmail].sort().join('_');
      
      // Add message to Firestore
      db.collection('chats').doc(chatId).collection('messages').add({
        sender: currentUser.email,
        text: messageText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      })
      .catch((error) => {
        console.error("Error sending message: ", error);
      });
    }
  
    function displayMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        
        if (message.sender === currentUser.email) {
          messageElement.classList.add('sent');
        } else {
          messageElement.classList.add('received');
        }
        
        const textElement = document.createElement('div');
        textElement.classList.add('message-text');
        textElement.textContent = message.text;
        
        const infoElement = document.createElement('div');
        infoElement.classList.add('message-info');
        
        // Store the message element ID to update it later
        const messageId = message.id || Date.now().toString();
        messageElement.id = `message-${messageId}`;
        
        // Format timestamp if it exists
        let timeDisplay = 'Sending...';
        if (message.timestamp) {
          const date = message.timestamp.toDate();
          timeDisplay = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        infoElement.textContent = `${message.sender === currentUser.email ? 'You' : message.sender} • ${timeDisplay}`;
        infoElement.id = `info-${messageId}`;
        
        messageElement.appendChild(textElement);
        messageElement.appendChild(infoElement);
        
        messagesContainer.appendChild(messageElement);
        
        // If timestamp doesn't exist, set up a listener for this specific message
        if (!message.timestamp && message.id) {
          const chatId = [currentUser.email, currentContact].sort().join('_');
          db.collection('chats').doc(chatId).collection('messages').doc(message.id)
            .onSnapshot((doc) => {
              if (doc.exists && doc.data().timestamp) {
                const updatedMessage = doc.data();
                const date = updatedMessage.timestamp.toDate();
                const updatedTimeDisplay = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const infoElement = document.getElementById(`info-${message.id}`);
                if (infoElement) {
                  infoElement.textContent = `${updatedMessage.sender === currentUser.email ? 'You' : updatedMessage.sender} • ${updatedTimeDisplay}`;
                }
              }
            });
        }
      }
      
      // Update the sendMessage function to return the message ID
      function sendMessage(messageText, toEmail) {
        // Create a unique chat ID from the two email addresses (always ordered the same way)
        const chatId = [currentUser.email, toEmail].sort().join('_');
        
        // Create a new document reference to get the ID
        const messageRef = db.collection('chats').doc(chatId).collection('messages').doc();
        
        // Create the message object
        const messageData = {
          sender: currentUser.email,
          text: messageText,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          id: messageRef.id // Store the ID in the message itself
        };
        
        // Add message to Firestore
        messageRef.set(messageData)
          .catch((error) => {
            console.error("Error sending message: ", error);
          });
        
        // Also display the message immediately with Sending... status
        displayMessage({
          ...messageData,
          timestamp: null, // Set to null to show "Sending..."
        });
        
        return messageRef.id;
      }
      
      // Update the loadMessages function to include message ID
      function loadMessages(contactEmail) {
        // Create a unique chat ID from the two email addresses (always ordered the same way)
        const chatId = [currentUser.email, contactEmail].sort().join('_');
        
        // Clear previous messages
        messagesContainer.innerHTML = '';
        
        // Listen for messages in this chat
        messagesListener = db.collection('chats').doc(chatId).collection('messages')
          .orderBy('timestamp')
          .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const message = change.doc.data();
                // Only display if not already displayed
                if (!document.getElementById(`message-${message.id || change.doc.id}`)) {
                  message.id = message.id || change.doc.id; // Ensure the message has an ID
                  displayMessage(message);
                }
              }
            });
            
            // Scroll to bottom of messages
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          });
      }
  });
  